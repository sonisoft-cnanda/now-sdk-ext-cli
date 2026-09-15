# Open a UI session (`nex auth open`)

Mint a ServiceNow UI session from a stored SDK alias and open it in a dedicated
desktop browser. Same command on macOS, Windows, and WSL:

```bash
nex auth open -a <alias> --cred-store
```

`--cred-store` is required in WSL, SSH, and other headless sessions. On an
interactive macOS or Windows desktop with an unlocked OS keyring, you can omit
it.

## What you get

A **new Edge window** (not your daily profile) already logged in as the alias
user. Bookmarks and extensions from your everyday browser are not used. Close
the window when you are done. Your normal Edge can stay open.

The command refreshes OAuth, exchanges the access token for Glide cookies,
starts an isolated browser profile, injects those cookies, and navigates to the
instance. Cookie values are never printed. Run the command again to remint;
if the dedicated window or its process is still around, `nex` reuses it.

## macOS

Install Edge (default), Chrome, or Brave under `/Applications`.

```bash
nex auth open -a <alias>                 # unlocked Keychain
nex auth open -a <alias> --cred-store    # headless / CI / SSH
nex auth open -a <alias> --browser chrome
```

Isolated profile: `~/.local/state/nex/ui-profiles/<alias>/`
(or `$XDG_STATE_HOME/nex/ui-profiles/<alias>/`).

## Windows

Run `nex` from PowerShell or cmd. Edge is resolved from Program Files.

```powershell
nex auth open -a <alias> --cred-store
nex auth open -a <alias> --browser chrome
```

`--cred-store` if Credential Vault is locked or you are not on an interactive
desktop. Isolated profile: `%USERPROFILE%\.local\state\nex\ui-profiles\<alias>\`.

Daily Edge can stay open. Do not expect this command to log into that everyday
profile — it always uses the isolated one unless you pass `--cdp`.

## WSL

Use this path when `nex` runs in the Linux distro and the browser is Windows
Edge/Chrome/Brave.

```bash
nex auth open -a <alias> --cred-store
```

You need:

1. A stored alias (`nex auth list --cred-store`)
2. Edge (or Chrome/Brave) installed on **Windows**
3. Node.js installed on **Windows** — `nex` starts a short-lived localhost
   relay so WSL can reach Edge's DevTools port (Windows binds it on
   `127.0.0.1`, which WSL NAT cannot see)

Isolated profile: `%LOCALAPPDATA%\nex\ui-profiles\<alias>\`. Daily Edge can
stay open.

If a previous dedicated window closed, run the command again — `nex` reuses
the leftover Edge process when it can. If DevTools still fails, fully quit
that leftover Edge (not your daily profile) and retry.

Override the WSL→Windows address only if you have to: `NEX_WSL_HOST=172.28.224.1`.

## Other browsers

```bash
nex auth open -a <alias> --browser chrome
nex auth open -a <alias> --browser brave
```

Default is Edge. On WSL the CLI looks for the Windows install first
(`/mnt/c/Program Files/...`), then native Linux binaries.

## Attach to a browser you already started

Skip launch and inject into an existing DevTools endpoint. The target must
already have been started with `--remote-debugging-port` (and usually
`--remote-allow-origins=*`):

```bash
nex auth open -a <alias> --cdp http://127.0.0.1:9222
```

That is the only way to reuse a daily profile. Ordinary Edge is not attachable.

## Optional Playwright state file

`nex auth browser-session --output …` remains the file-based path for automated
tests. `auth open` can also write that file if you ask:

```bash
nex auth open -a <alias> --output ~/.local/state/nex/sessions/<alias>.json
```

The file is owner-only (`0600`). Never commit it, print it, or paste it into
chat. Replace an existing file with `--force`.

## JSON

```bash
nex auth open -a <alias> --cred-store --json
```

Stdout is metadata only: `alias`, `instanceUrl`, `browser`, `cdpUrl`, and
optional `path`. Cookie values are never printed.

## If something goes wrong

| Symptom | What to do |
|---|---|
| `credential store is inactive` | Unset `SN_CRED_STORE_DISABLE` and run `nex auth doctor` |
| `Could not find Edge` | Install Edge, or pass `--browser chrome` / `--browser brave`, or `--cdp` |
| `DevTools endpoint did not become ready` | On WSL, install Node.js on Windows. Quit a leftover dedicated Edge (the `nex\\ui-profiles` process), then retry |
| Landed in a new window, not your daily Edge | Expected. Close that window when finished |
| Need a different instance | Pass `-a <alias>` or set `SN_INSTANCE_ALIAS` for live tests |

## Tests

Live coverage is `test/commands/auth/open.integration.test.ts`. It mints a
session for `SN_INSTANCE_ALIAS` (default `dev206299` in
`test/test_utils/test_config.ts`) and injects it into a loopback DevTools
fixture. Override the alias in the environment — do not embed an instance name
in the test:

```bash
SN_INSTANCE_ALIAS=strongtiedev npm run test:integration:auth
```
