## Brief ServiceVault Explanation

In `user_config.json`, or `config.json`, under the `config` section:
```
		"ServiceVaults": [
			"UserServiceVault",
			"ServiceVault"
		],
```

The `ServiceVaults` entry is an array of Service Vaults to check, in order of priority (topmost = check first). If the path is not absolute, the the server will look in the current directory (of `app.js`). An absolute path can be specified in Linux (`/home/zefie/ServiceVault`) or Windows (`C:\\Users\\zefie\\ServiceVault` or `C:/Users/zefie/ServiceVault`) format.

The server will scan configured ServiceVaults in order of priority and look for files within them.

Within the Service Vaults, the server looks for a subdirectory named after the wtv-service URL requested.

The server will then look for files in sequential order when requesting a URL, stopping at the first match.

Let us use the URL `wtv-1800:/preregister` as an example. This is what the server would look for (in order):

- `./ServiceVault/wtv-1800/preregister` \[ [Example](zefie_wtvp_minisrv/ServiceVault/wtv-star/images/HackTVLogo.gif) \]
  - Exact file name match (*Direct File Mode*)
  - Server sends the raw file, with its content-type. No parsing is done on the file.
  - You do not need to do anything special with this format. 
- `./ServiceVault/wtv-1800/preregister.txt` \[ [Example](zefie_wtvp_minisrv/ServiceVault/wtv-home/splash.txt) \]
  - TXT file match (*Raw TXT Mode*)
  - Service parses and sends AS-IS.
  - You are expected to define headers
- `./ServiceVault/wtv-1800/preregister.js` \[ [Example](zefie_wtvp_minisrv/ServiceVault/wtv-home/home.js) \]
  - Synchronous JS match (*JS Interpreter mode*)
  - Executes the JavaScript in synchronous mode.
  - You are expected to define `headers` and `data` before the end of your script.
  - Access Asynchronous mode by setting `request_is_async = true;`
  - Client request headers are available as an Array in variable `request_headers`, query arguments are also an Array, in `request_headers.query`
  - In Asynchronous mode, you are expected to call `sendToClient(socket,headers,data)` yourself, `socket` is already defined by the time your script runs, so you can just pass it through.
- `./ServiceVault/wtv-1800/preregister.html` \[ [Example](zefie_wtvp_minisrv/ServiceVault/wtv-music/demo/index.html) \]
  - HTML match (*HTML mode*)
  - Like Direct File Mode, but you don't need to append `.html`.
  - You do not need to do anything special with this format.

The server will stop at the first result it finds using the order above.

So if you have `preregister.txt` and `preregister.js`, it will use `preregister.txt`, but not `preregister.js`.
