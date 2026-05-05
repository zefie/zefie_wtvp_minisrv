const minisrv_service_file = true;

if (!session_data) {
    session_data = new WTVClientSessionData(minisrv_config, (socket.ssid || null))
}

// Sorry Zef :kek
// https://git.computernewb.com/yellows111/msnp-wiki/src/branch/master/docs/services/rst.md
// the RST_ cookie stuff was code that was temp until we had proper token authentication
const NS = {
    SOAP: "http://schemas.xmlsoap.org/soap/envelope/",
    WSSE: "http://schemas.xmlsoap.org/ws/2003/06/secext",
    WSP: "http://schemas.xmlsoap.org/ws/2002/12/policy",
    WSU: "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
    WSA: "http://schemas.xmlsoap.org/ws/2004/03/addressing",
    WST: "http://schemas.xmlsoap.org/ws/2004/04/trust",
    PSF: "http://schemas.microsoft.com/Passport/SoapServices/SOAPFault",
    ENC: "http://www.w3.org/2001/04/xmlenc#",
    DS: "http://www.w3.org/2000/09/xmldsig#"
};

function getCookie(cookieString, name) {
    if (!cookieString) return null;
    const match = cookieString.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, options = {}) {
    const cookie = `${name}=${encodeURIComponent(value)}`;
    const path = options.path || '/';
    const expires = options.expires || '';
    return `${cookie}; path=${path}${expires ? `; expires=${expires}` : ''}`;
}

function formatDateTime(dt) {
    return dt.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function getClientIP() {
    const forwarded = request_headers['x-forwarded-for'];
    if (forwarded) {
        const ips = forwarded.split(',');
        return ips[0].trim();
    }
    return request_headers['x-real-ip'] || '127.0.0.1';
}

function generateRandomToken(userId, appliesTo, isLegacy = false) {
    const timestamp = Date.now();
    const randomPart = crypto.randomBytes(32).toString('hex');

    if (isLegacy) {
        const tokenData = `${userId}|${appliesTo}|${timestamp}|${randomPart}`;
        return crypto.createHash('sha256').update(tokenData).digest('hex');
    } else {
        const tokenData = {
            uid: userId,
            app: appliesTo,
            ts: timestamp,
            rand: randomPart,
            ver: '1.0'
        };
        return Buffer.from(JSON.stringify(tokenData)).toString('base64');
    }
}

function extractXmlValue(xml, elementName) {
    if (!xml) return null;

    const patterns = [
        new RegExp(`<${elementName}>([\\s\\S]*?)</${elementName}>`, 'i'),
        new RegExp(`<wsse:${elementName}>([\\s\\S]*?)</wsse:${elementName}>`, 'i'),
        new RegExp(`<wst:${elementName}>([\\s\\S]*?)</wst:${elementName}>`, 'i'),
        new RegExp(`<ps:${elementName}>([\\s\\S]*?)</ps:${elementName}>`, 'i')
    ];

    for (const regex of patterns) {
        const match = xml.match(regex);
        if (match && match[1]) {
            let value = match[1].trim();
            value = value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            return value;
        }
    }
    return null;
}

function extractTokenFromCipherValue(xml) {
    if (!xml) return null;

    const cipherRegex = /<CipherValue>([\s\S]*?)<\/CipherValue>/gi;
    let match;
    let token = null;

    while ((match = cipherRegex.exec(xml)) !== null) {
        let cipherValue = match[1].trim();
        if (cipherValue && cipherValue.length > 0) {
            token = cipherValue;
            debug("Found CipherValue token:", token.substring(0, 50) + "...");
            break;
        }
    }

    return token;
}

function validateTokenAndGetUser(token) {
    try {
        let userId = null;
        let email = null;

        if (request_headers.cookie) {
            userId = getCookie(request_headers.cookie, 'RST_Auth');
            email = getCookie(request_headers.cookie, 'RST_Email');
            if (!email) email = getCookie(request_headers.cookie, 'rst_email');
            if (!email) email = getCookie(request_headers.cookie, 'rst_username');
        }

        if (!userId) {
            userId = crypto.createHash('md5').update(token).digest('hex');
            email = `user_${userId.substring(0, 8)}@example.com`;
        }

        debug(`Token validated - UserId: ${userId}, Email: ${email}`);
        return { success: true, userId, email };
    } catch (error) {
        console.error("Token validation error:", error);
        return { success: false, userId: null, email: null };
    }
}

function generateErrorResponse(errorCode, errorText) {
    const now = formatDateTime(new Date());
    headers = `Status: 200 OK
    Content-type: text/xml; charset=utf-8`;

    return `<?xml version="1.0" encoding="utf-8"?>
    <S:Envelope xmlns:S="${NS.SOAP}" xmlns:psf="${NS.PSF}">
    <S:Header>
    <psf:pp>
    <psf:serverVersion>1</psf:serverVersion>
    <psf:authstate>0x80048800</psf:authstate>
    <psf:reqstatus>${errorCode}</psf:reqstatus>
    <psf:serverInfo Path="Live1" RollingUpgradeState="ExclusiveNew" LocVersion="0" ServerTime="${now}">
    NOBELLIUM 16.0.30846.6
    </psf:serverInfo>
    <psf:cookies></psf:cookies>
    <psf:response></psf:response>
    </psf:pp>
    </S:Header>
    <S:Body>
    <S:Fault>
    <S:Code>
    <S:Value>S:Sender</S:Value>
    <S:Subcode>
    <S:Value>wst:FailedAuthentication</S:Value>
    </S:Subcode>
    </S:Code>
    <S:Reason>
    <S:Text xml:lang="en-US">Authentication Failure</S:Text>
    </S:Reason>
    <S:Detail>
    <psf:error>
    <psf:value>${errorCode}</psf:value>
    <psf:internalerror>
    <psf:code>0x80041012</psf:code>
    <psf:text>${errorText}</psf:text>
    </psf:internalerror>
    </psf:error>
    </S:Detail>
    </S:Fault>
    </S:Body>
    </S:Envelope>`;
}

function generateSuccessResponse(requestBody, userId, email, firstName, lastName) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const createdTime = formatDateTime(now);
    const expiresTime = formatDateTime(tomorrow);

    const puid = crypto.randomBytes(16).toString('hex').toUpperCase();
    const cid = crypto.randomBytes(8).toString('hex').toUpperCase();

    const safeFirstName = firstName || email.split('@')[0] || "User";
    const safeLastName = lastName || "User";
    const clientIp = getClientIP();

    const rstRegex = /<wst:RequestSecurityToken[\s\S]*?<\/wst:RequestSecurityToken>/gi;
    const responses = [];
    let match;
    let foundRst = false;
    let rstIndex = 0;

    while ((match = rstRegex.exec(requestBody)) !== null) {
        foundRst = true;
        const rstBlock = match[0];

        const addressMatch = rstBlock.match(/<wsa:Address>(.*?)<\/wsa:Address>/i);
        let appliesTo = addressMatch ? addressMatch[1] : "urn:passport:compact";

        const policyMatch = rstBlock.match(/<wsse:PolicyReference\s+URI="([^"]+)"/i);
        const policy = policyMatch ? policyMatch[1] : null;

        const isLegacy = appliesTo.includes("Passport.NET");
        const tokenType = isLegacy ? "urn:passport:legacy" : "urn:passport:compact";
        const needsProofToken = policy === "MBI_KEY_OLD";

        const token = generateRandomToken(userId, appliesTo, isLegacy);
        const tokenId = isLegacy ? `BinaryDAToken${rstIndex}` : `Compact${rstIndex}`;
        const binarySecret = crypto.randomBytes(32).toString('base64');

        let requestedSecurityToken;
        if (isLegacy) {
            requestedSecurityToken = `
            <wst:RequestedSecurityToken>
            <EncryptedData xmlns="${NS.ENC}" Id="${tokenId}" Type="http://www.w3.org/2001/04/xmlenc#Element">
            <EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#tripledes-cbc"/>
            <ds:KeyInfo xmlns:ds="${NS.DS}">
            <ds:KeyName>http://Passport.NET/STS</ds:KeyName>
            </ds:KeyInfo>
            <CipherData>
            <CipherValue>${token}</CipherValue>
            </CipherData>
            </EncryptedData>
            </wst:RequestedSecurityToken>`;
        } else {
            let tokenValue = `t=${token}`;
            if (needsProofToken) {
                tokenValue += `&p=profile`;
            }
            requestedSecurityToken = `
            <wst:RequestedSecurityToken>
            <wsse:BinarySecurityToken Id="${tokenId}">${tokenValue}</wsse:BinarySecurityToken>
            </wst:RequestedSecurityToken>`;
        }

        let responseXml = `
        <wst:RequestSecurityTokenResponse>
        <wst:TokenType>${tokenType}</wst:TokenType>
        <wsp:AppliesTo xmlns:wsa="${NS.WSA}">
        <wsa:EndpointReference>
        <wsa:Address>${appliesTo}</wsa:Address>
        </wsa:EndpointReference>
        </wsp:AppliesTo>
        <wst:LifeTime>
        <wsu:Created>${createdTime}</wsu:Created>
        <wsu:Expires>${expiresTime}</wsu:Expires>
        </wst:LifeTime>
        ${requestedSecurityToken}
        <wst:RequestedTokenReference>
        <wsse:KeyIdentifier ValueType="${tokenType}"/>
        <wsse:Reference URI="#${tokenId}"/>
        </wst:RequestedTokenReference>`;

        if (needsProofToken || isLegacy) {
            responseXml += `
            <wst:RequestedProofToken>
            <wst:BinarySecret>${binarySecret}</wst:BinarySecret>
            </wst:RequestedProofToken>`;
        }

        responseXml += `
        </wst:RequestSecurityTokenResponse>`;

        responses.push(responseXml);
        rstIndex++;
    }

    if (!foundRst) {
        const defaultToken = generateRandomToken(userId, "urn:passport:compact", false);
        responses.push(`
        <wst:RequestSecurityTokenResponse>
        <wst:TokenType>urn:passport:compact</wst:TokenType>
        <wst:RequestedSecurityToken>
        <wsse:BinarySecurityToken Id="Compact0">t=${defaultToken}</wsse:BinarySecurityToken>
        </wst:RequestedSecurityToken>
        <wst:LifeTime>
        <wsu:Created>${createdTime}</wsu:Created>
        <wsu:Expires>${expiresTime}</wsu:Expires>
        </wst:LifeTime>
        </wst:RequestSecurityTokenResponse>`);
    }

    headers = `Status: 200 OK
    Content-type: text/xml; charset=utf-8
    Set-Cookie: RST_Auth=${userId}; path=/; HttpOnly
    Set-Cookie: RST_Email=${email}; path=/`;

    return `<?xml version="1.0" encoding="utf-8"?>
    <S:Envelope xmlns:S="${NS.SOAP}">
    <S:Header>
    <psf:pp xmlns:psf="${NS.PSF}">
    <psf:serverVersion>1</psf:serverVersion>
    <psf:PUID>${puid}</psf:PUID>
    <psf:configVersion>16.000.26889.00</psf:configVersion>
    <psf:uiVersion>3.100.2179.0</psf:uiVersion>
    <psf:mobileConfigVersion>16.000.26208.0</psf:mobileConfigVersion>
    <psf:authstate>0x48803</psf:authstate>
    <psf:reqstatus>0x0</psf:reqstatus>
    <psf:serverInfo Path="Live1" RollingUpgradeState="ExclusiveNew" LocVersion="0" ServerTime="${now.toISOString()}">
    NOBELLIUM 16.0.30846.6
    </psf:serverInfo>
    <psf:cookies></psf:cookies>
    <psf:browserCookies>
    <psf:browserCookie Name="MH" URL="http://www.msn.com">MSFT; path=/; domain=.msn.com; expires=Wed, 30-Dec-2037 16:00:00 GMT</psf:browserCookie>
    <psf:browserCookie Name="MH" URL="http://www.live.com">MSFT; path=/; domain=.live.com; expires=Wed, 30-Dec-2037 16:00:00 GMT</psf:browserCookie>
    </psf:browserCookies>
    <psf:credProperties>
    <psf:credProperty Name="MainBrandID">MSFT</psf:credProperty>
    <psf:credProperty Name="IsWinLiveUser">true</psf:credProperty>
    <psf:credProperty Name="CID">${cid}</psf:credProperty>
    <psf:credProperty Name="AuthMembername">${email}</psf:credProperty>
    <psf:credProperty Name="Country">US</psf:credProperty>
    <psf:credProperty Name="Language">1033</psf:credProperty>
    <psf:credProperty Name="FirstName">${safeFirstName}</psf:credProperty>
    <psf:credProperty Name="LastName">${safeLastName}</psf:credProperty>
    <psf:credProperty Name="Flags">40100643</psf:credProperty>
    <psf:credProperty Name="IP">${clientIp}</psf:credProperty>
    </psf:credProperties>
    <psf:extProperties>
    <psf:extProperty Name="CID">${cid}</psf:extProperty>
    </psf:extProperties>
    <psf:response></psf:response>
    </psf:pp>
    </S:Header>
    <S:Body>
    <wst:RequestSecurityTokenResponseCollection
    xmlns:wst="${NS.WST}"
    xmlns:wsse="${NS.WSSE}"
    xmlns:wsu="${NS.WSU}"
    xmlns:wsp="${NS.WSP}"
    xmlns:psf="${NS.PSF}">
    ${responses.join('\n      ')}
    </wst:RequestSecurityTokenResponseCollection>
    </S:Body>
    </S:Envelope>`;
}


function rstHandler() {
    try {

        // Get POST data
        let requestBody = '';
        if (request_headers.post_data) {
            if (Buffer.isBuffer(request_headers.post_data)) {
                requestBody = request_headers.post_data.toString('utf8');
            } else if (typeof request_headers.post_data === 'string') {
                requestBody = request_headers.post_data;
            } else if (typeof request_headers.post_data === 'object') {
                requestBody = JSON.stringify(request_headers.post_data);
            }
        } else {
            debug("No post_data found. Available keys:", Object.keys(request_headers));
            return generateErrorResponse("0x80048820", "No POST data received");
        }

        if (!requestBody || requestBody.trim() === '') {
            debug("Empty request body");
            return generateErrorResponse("0x80048820", "Empty request body");
        }

        // Authentication
        let email = extractXmlValue(requestBody, 'Username');
        let password = extractXmlValue(requestBody, 'Password');

        let userId = null;
        let userEmail = null;
        let firstName = "User";
        let lastName = "User";

        if ((!email || !password) && requestBody.includes('CipherValue')) {
            debug("No username/password found, trying token authentication...");
            const token = extractTokenFromCipherValue(requestBody);

            if (token) {
                const tokenValidation = validateTokenAndGetUser(token);
                if (tokenValidation.success) {
                    userId = tokenValidation.userId;
                    userEmail = tokenValidation.email;
                    debug(`Token authentication successful for: ${userEmail} (${userId})`);

                    if (request_headers.cookie) {
                        const cookieEmail = getCookie(request_headers.cookie, 'RST_Email');
                        const cookieUsername = getCookie(request_headers.cookie, 'rst_username');
                        if (cookieEmail) userEmail = cookieEmail;
                        if (cookieUsername) firstName = cookieUsername;
                    }
                } else {
                    debug("Token validation failed");
                    return generateErrorResponse("0x80048821", "Invalid token");
                }
            } else {
                debug("No token found in CipherValue");
                return generateErrorResponse("0x80048820", "Missing credentials/token");
            }
        }
        else if (email && password) {
            debug(`Extracted - Email: ${email}, Password: ${password ? '***' : 'empty'}`);

            if (email && email.indexOf('@') < 0) {
                const domain = minisrv_config.config.domain_name || 'minisrv.local';
                email = `${email}@${domain}`;
            }

            userEmail = email;
            firstName = email.split('@')[0];
            userId = crypto.createHash('md5').update(email).digest('hex');
            const validAuth = validateCredentials(email, password);
            if (!validAuth) {
                debug("Invalid credentials");
                return generateErrorResponse("0x80048821", "Invalid credentials");
            } else {
                debug(`Authentication successful for: ${userEmail} (${userId})`);
            }
        }
        else {
            debug("Missing both credentials and token");
            return generateErrorResponse("0x80048820", "Missing credentials/token");
        }

        if (!userId || !userEmail) {
            debug("Failed to get user identity");
            return generateErrorResponse("0x80048821", "User identity not found");
        }

        const cookieHeaders = [
            setCookie('rst_email', userEmail, { path: '/' }),
            setCookie('rst_username', firstName, { path: '/' }),
            setCookie('rst_authenticated', 'true', { path: '/', expires: 'Wed, 30-Dec-2037 16:00:00 GMT' })
        ];

        const response = generateSuccessResponse(requestBody, userId, userEmail, firstName, lastName);

        for (const cookie of cookieHeaders) {
            headers += `\nSet-Cookie: ${cookie}`;
        }

        return response;

    } catch (error) {
        console.error("RST Handler Error:", error);
        console.error("Error stack:", error.stack);
        return generateErrorResponse("0x80048820", `Internal error: ${error.message}`);
    }
}

function validateCredentials(email, password) {
    username = email.split('@')[0];
    result_ary = session_data.findAccountByUsername(username);
    if (result_ary[0]) {
        if (!socket.ssid) {
            socket.ssid = result_ary[1];
            // second arg should handle secondary users
            session_data.setSSID(socket.ssid, result_ary[2]);
        }
        return session_data.validateUserPassword(password);
    }
    return false;
}
    

let result = rstHandler();
if (result) {
    data = result;
}
