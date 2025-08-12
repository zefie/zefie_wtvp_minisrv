const minisrv_service_file = true;
session_data.data_store.wtvsec_login.PrepareTicket();

headers = `300 Moved
Connection: Close
wtv-noback-all: wtv-register:
wtv-expire-all: wtv-
wtv-ticket: ${session_data.data_store.wtvsec_login.ticket_b64}
wtv-service: reset
${getServiceString('wtv-1800')}
${getServiceString('wtv-head-waiter')}
${getServiceString('wtv-star')}
wtv-relogin-url: wtv-1800:/preregister?relogin=true
wtv-reconnect-url: wtv-1800:/preregister?reconnect=true
wtv-boot-url: wtv-1800:/preregister?relogin=true
Location: client:relogin`;
