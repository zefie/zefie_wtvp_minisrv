const minisrv_service_file = true;

const dest_url = "wtv-news:/news?group=" + request_headers.request_url.split(":")[1];
headers = `300 Moved
Location: ${dest_url}`
