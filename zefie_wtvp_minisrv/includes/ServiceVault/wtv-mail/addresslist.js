var minisrv_service_file = true;

headers = `200 OK
Content-Type: x-wtv-addresses
wtv-transition: light
minisrv-no-last-modified: true
minisrv-no-mail-count: true`;

const address_book = session_data.getSessionData("address_book")

if (session_data.getSessionData("address_book") != null) {
	data = ``
	for (let i = 0; i < address_book.length; i++) {
		data += address_book[i].name + '\0' + address_book[i].address + '\0'
	};
} else {
	session_data.setSessionData("address_book", [])
}
