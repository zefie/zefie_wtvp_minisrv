# Quick Setup

## user_config.json

`user_config.json` (in the same folder as `app.js`) is where you put your local configuration overrides. It merges on top of `includes/config.json` — **do not edit `includes/config.json` directly**.

You only need to include keys you want to override. Copy `user_config.example.json` as a starting point, or start with a minimal file:

```json
{
    "config": {
        "service_ip": "192.168.1.x"
    }
}
```

The file supports `// line comments` and `/* block comments */`.

---

## configurator.js

`tools/configurator.js` is a command-line tool that sets or deletes individual keys in `user_config.json` without manually editing JSON.

**Usage:**
```
node tools/configurator.js <dot.path.key> <value> [--overwrite]
node tools/configurator.js <dot.path.key> --delete [--overwrite]
```

- Use `--overwrite` to replace a key that already exists.
- Keys are expressed as dot-separated paths (e.g. `config.keys.user_data_key`).

---

## Setting service_ip

`service_ip` tells the box where to connect, this CANNOT be `0.0.0.0`, and must be an address reachable by your box when it connects via your setup. Can be `127.0.0.1` if you are running MAME/Viewer on the same machine as minisrv.

```
node tools/configurator.js config.service_ip 192.168.1.x --overwrite
```

---

## Setting user_data_key

`user_data_key` is used to encrypt user data. It should be a random secret string and **must be set before registering any users**. 
Changing it after users have registered will require updating the userdata with `tools/update_user_data_key.js`. Making a backup 
 of `SessionStore/accounts` is recommended before running `tools/update_user_data_key.js`, it is pretty resilent against corruption, but just in case.

```
node tools/configurator.js config.keys.user_data_key YOUR_RANDOM_SECRET --overwrite
```

To generate a random key:
```
openssl rand -base64 32
```

## Disabling a standard service

You can disable a configured service by setting the `disabled: true` flag for that service. For example, to disable `wtv-admin`:

```
node tools/configurator.js services.wtv-admin.disabled true
```


## Enabling a disabled service

You can disable a configured service by setting the `disabled: false` flag for that service. For example, to enable `pc_services`:

```
node tools/configurator.js services.pc_services.disabled false
```

## Custom service pages

You can place your custom pages in `UserServiceVault/servicename/page.js`. For example, to override `wtv-home:/home`, you would create 
`UserServiceVault/wtv-home/home.js`, and the server will automatically prioritize your page. You can mix and match service vaults, accessing 
resources in the standard service vault within your custom pages.

## Updating minisrv

You can `git pull`, or extract a new archive over the existing folder. If you followed the directions and kept your changes in `user_config.json` and `UserServiceVault`, 
then you can update minisrv without worrying about breakage or losing data. Do pay attention to the console, and if any deprecreations appear, fix them before updating to the version listed in the notice.