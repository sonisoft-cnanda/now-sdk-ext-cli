# Open a UI session (`nex auth open`)

Mint a ServiceNow UI session from a stored SDK alias and open it in a dedicated
desktop browser. One command:

```bash
nex auth open -a bcbsscdev --cred-store
```

`--cred-store` is required in WSL, SSH, and other headless sessions. On an
interactive desktop with an unlocked OS keyring, omit it.

## What you get

A **new Edge window** (not your daily profile) already logged in as the alias
user. Bookmarks and extensions from your everyday browser are not used. Close
the window when you are done.

The command:

1. Refreshes OAuth through the SDK
2. Exchanges the access token for Glide cookies and proves cookie-only UI auth
3. Starts Edge with an isolated `--user-data-dir` under `~/.local/state/nex/ui-profiles/<alias>/`
4. Injects the cookies over Chrome DevTools Protocol and navigates to the instance

Your normal Edge can stay open. Session cookies die when you fully quit that
dedicated window; run the command again to remint.

## Other browsers

```bash
nex auth open -a bcbsscdev --browser chrome
nex auth open -a bcbsscdev --browser brave
```

Default is Edge. On WSL the CLI looks for the Windows install first
(`/mnt/c/Program Files/...`), then native Linux binaries.

## Attach to a browser you already started

Skip launch and inject into an existing DevTools endpoint:

```bash
nex auth open -a bcbsscdev --cdp http://127.0.0.1:9222
```

The target browser must have been started with `--remote-debugging-port` (and
usually `--remote-allow-origins=*`). This is how you reach a daily profile if
you have already enabled remote debugging on it.

## Optional Playwright state file

`nex auth browser-session --output …` remains the file-based path for automated
tests. `auth open` can also write that file if you ask:

```bash
nex auth open -a bcbsscdev --output ~/.local/state/nex/sessions/bcbsscdev.json
```

The file is owner-only (`0600`). Never commit it, print it, or paste it into
chat. Replace an existing file with `--force`.

## JSON

```bash
nex auth open -a bcbsscdev --cred-store --json
```

Stdout is metadata only: `alias`, `instanceUrl`, `browser`, `cdpUrl`, and
optional `path`. Cookie values are never printed.

## Tests

Live coverage is `test/commands/auth/open.integration.test.ts`. It mints a
session for `SN_INSTANCE_ALIAS` (default `dev206299` in
`test/test_utils/test_config.ts`) and injects it into a loopback DevTools
fixture. Override the alias in the environment — do not embed an instance name
in the test:

```bash
SN_INSTANCE_ALIAS=strongtiedev npm run test:integration:auth
```
