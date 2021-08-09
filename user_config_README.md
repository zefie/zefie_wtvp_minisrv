# user_config.json Quick Guide
`user_config.json` is an override file, you do not need to redefine everything that is in `config.json`, just override the values you wish to. You must use the same structure as `config.json`, but can override any value.

---

### `config` section
Some values are available that are not defined in `config.json` by default. I will attempt to cover them here.
```
		"service_name": "CoolTV",
		"service_owner": "CoolDude",
		"service_logo": "WebTVLogoJewel.gif",
		"service_splash_logo": "file://ROM/images/SplashLogo1.gif"
```
You can set the service name and service owner, which will be used across the service when referencing itself.
You can set the image to be loaded in the top left in place of the WebTV or HackTV logo, as well as the main Splash image shown on login.
If an absolute path (`wtv-url:/`, `file://` url, or `http(s)://` url) is not passed, the server will search for the specified filename in `wtv-star/images` of any Service Vault. You'll want to keep the filesizes low.
```
		"post_debug": true
```
If you would like to see debug information about realtime bytes received from a client POST request, set `post_debug` to `true`.
```
		"allow_guests":  false
```
If you would like to require registration, disabling guest mode, you can set `allow_guests` to `false`. Default is `true`;
```
		"pc_server_hidden_service": false
```
Set this option to false to disable the HTTP Server for Browsers. Set it to a string to use that directory under the service vaults.
```
		"post_percentages": [ 0, 25, 50, 100]
```
If you would like to see progress updates on client POST requests, you can define which percentages to show here. Other examples would be `[ 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 ]` for every 10%, or you could set it to `false`, or `null`, to disable progress updates. Note that percentages are not shown when `post_debug` is enabled.
```
		"ssid_block_list": [
			"8100000000000000",
			"8100000000000010"
		]
```
This would ban the SSIDs `8100000000000000` and `8100000000000010` from the service, but allow all other SSIDs to connect.
```
		"ssid_ip_allow_list": {
			"8100000000000000": [
				"192.168.1.0/24",
				"127.0.0.1"
			]
		}
```
This would allow `8100000000000000` to connect, despite being on the block list, if it was connecting from the 192.168.1.0/24 Subnet, or from 127.0.0.1.
```
		"ssid_allow_list": [
			"8100000000000020",
			"8100000000000030"
		]
```
This would allow only the SSIDs `8100000000000020` and `8100000000000030` to use the service, and block all other SSIDs. Note that if you add an SSID/IP combo to the `ssid_ip_allow_list`, it will allow the SSID even if it is not in the whitelist. This is useful to allow a leaked SSID but only from trusted hosts.

---
### `service` section

```
		"wtv-1800" {
			"send_tellyscripts": true,
			"send_tellyscript_ssid_whitelist": [
				"8100000000000000"
			]
		}
```
This override would enable sending of tellyscripts, but only to the box with SSID `8100000000000000`. The `send_tellyscript_ssid_whitelist` parameter is optional, and if not defined while `send_tellyscripts` is true, the server will simply send tellyscripts to all clients.
```
		"wtv-log": {
			"write_logs_to_disk": true
		}
```		
By default the wtv-log:/log service discards any submitted data from the WebTV units. You can override this by setting `write_logs_to_disk` to true, then it will save to the directory named `ServiceLogPost` in the same directory as `app.js`.

```
		"wtv-some-custom-service": {
			"port": 1609,
			"connections": 1
		}
```
You can easily define a custom service in your `user_config.json`

```
		"wtv-tricks": {
			"service_ip": "192.168.1.8",
			"port": 1702,
			"nobind": true
		}
```
The `wtv-tricks` example above shows how you could point a service to another minisrv.
```
		"wtv-1800": {
			"port": 1715
		}
```
The `wtv-1800` example above shows how you could override the default port for a service.

```
		"wtv-music": {
			"disabled": true
		}
```
The `wtv-music` example above shows how you could disable a default service without modifying `config.json`
