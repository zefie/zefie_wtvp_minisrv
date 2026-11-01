const minisrv_service_file = true;

// Example Client request: <LoginRequest><ClientInfo name="MSNTV" version="1.35"/><User><SignInName>example@example.com</SignInName><Password>example</Password><SavePassword>false</SavePassword></User><DAOption>1</DAOption><TargetOption>1</TargetOption></LoginRequest>

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

let requestBody = '';
if (request_headers.post_data) {
    if (Buffer.isBuffer(request_headers.post_data)) {
        requestBody = request_headers.post_data.toString('utf8');
    } else if (typeof request_headers.post_data === 'string') {
        requestBody = request_headers.post_data;
    } else if (typeof request_headers.post_data === 'object') {
        requestBody = JSON.stringify(request_headers.post_data);
    }
    email = extractXmlValue(requestBody, 'SignInName');
    password = extractXmlValue(requestBody, 'Password');
} else {
    debug("No post_data found. Available keys:", Object.keys(request_headers));
}

if (email && password) {
    if (validateCredentials(email, password)) {
        data = `<LoginResponse Success="true"><TnP>t=Disabled&amp;p=Disabled</TnP></LoginResponse>`; // T and P cant be nulled they have to have some content in it
    } else {
        // Telling the client specifically which credential is wrong (wrong password or wrong email) is insecure, so we return the same error code for both cases
        // Wrong email return: <LoginResponse Success="false"><Error Code="e5b"/></LoginResponse>
        // Wrong Password return: <LoginResponse Success="false"><Error Code="e5a"/></LoginResponse>
        data = `<LoginResponse Success="false"><Error Code="e5a"/></LoginResponse>`;
    }
} else {
    data = `<LoginResponse Success="false"><Error Code="e5a"/></LoginResponse>`;
}

headers = `200 OK
Content-Type: text/xml`;

console.log(request_headers.query);
