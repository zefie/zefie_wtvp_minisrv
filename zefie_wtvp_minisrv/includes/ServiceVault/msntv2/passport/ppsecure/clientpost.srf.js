const minisrv_service_file = true;

// Wrong email return: <LoginResponse Success="false"><Error Code="e5b"/></LoginResponse>
// Wrong Password return: <LoginResponse Success="false"><Error Code="e5a"/></LoginResponse>

// Example Client request: <LoginRequest><ClientInfo name="MSNTV" version="1.35"/><User><SignInName>example@example.com</SignInName><Password>example</Password><SavePassword>false</SavePassword></User><DAOption>1</DAOption><TargetOption>1</TargetOption></LoginRequest>

data = `<LoginResponse Success="true"><TnP>t=Disabled&amp;p=Disabled</TnP></LoginResponse>`; // T and P cant be nulled they have to have some content in it

headers = `200 OK
Content-Type: text/xml`;

console.log(request_headers.query);
