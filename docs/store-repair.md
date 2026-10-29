# Repairing an installed application

`nex store repair` does what the **Repair Application** link on an application's `sys_store_app`
record does. The App Client reinstalls the version that is **installed** from the application
repository, without uninstalling the app, and reapplies its customization version if it has one.
Reach for it when an app you published and installed is broken, or when an install or update
skipped files it should have applied.

```bash
nex store repair x_acme_app --auth dev                 # by scope; waits and reports
nex store repair 0123456789abcdef0123456789abcdef --json --auth dev   # by sys_store_app sys_id
nex store repair x_acme_app --no-wait --auth dev       # start it, print the tracker id
```

A repair is a write. It rewrites the application's files, and `--read-only` and `--deny-write`
refuse it.

## What it reports

```
Repair started: Bubble trend (sn_bubble_trend) 1.0.0
Tracker 4675cde05318df10b6d61901a0490e38 (App Client app/repair)
  Pending (0%)
  Executing queued operation (73%)
  Executing queued operation (99%)
  Success! (100%)
Repaired: Bubble trend (sn_bubble_trend) 1.0.0
Tracker 4675cde05318df10b6d61901a0490e38: Successful (100%), Success!
Upgrade history e48541245318df10b6d61901a0490e82: complete, finished 2026-10-29 13:59:56
  added 0, updated 2, deleted 0, unchanged 1, skipped 0, errors 0, manual merge 0, apply once 0
```

- **Repaired** is reported only when the App Client succeeded **and** wrote a new, finished
  upgrade history row (`sys_upgrade_history`, `to_version` = the scope). The App Client also
  reports success when it decided nothing needed reinstalling, so success alone proves nothing.
  When the history does not confirm the repair, nex exits 1 with `not_confirmed`, or with
  `repair_failed` when the tracker failed.
- **Not applied** lists up to 50 files the repair did not apply, problem files first:
  - files *skipped* because they are customized on the instance;
  - errors, manual merges, table not found, fatal errors and files not loaded;
  - apply-once files, which a reinstall is expected to leave alone.

  A customized file stays skipped on every repair until the customization is reverted. Use the
  upgrade history (`sys_upgrade_history_log`) to review and revert it.
- With `--json`, the whole result: `app`, `trackerId`, `endpoint`, `history` (counts and
  `skippedFiles`), `repaired` and `warnings`.

## What it refuses

It refuses these before anything is sent, as the platform does:

| Code | Means |
| --- | --- |
| `invalid_app` | Not a scope or a sys_id |
| `app_not_found` | No installed store or company application matches |
| `not_a_store_app` | Developed on this instance (`sys_app`): there is no repository copy to repair from |
| `app_inactive` | The app is not active |
| `contains_plugins` | The app contains plugins; repair it from the UI, which sends the plugin list |
| `no_demo_data` | `--demo-data` for an app without demo data |
| `start_failed` | The App Client did not start it (the HTTP status and its message are shown) |

## Underneath

- When `sn_appclient.use_queued_installation` is `true`, nex calls the App Client's
  `GET /api/sn_appclient/appmanager/app/repair`.
- Otherwise it calls `app/install` with `isReinstall=true`. With queued installation off, the
  repair endpoint drops its reinstall flag and silently does nothing.
- See the [core ApplicationManager guide](https://github.com/sonisoft-cnanda/now-sdk-ext-core/blob/main/docs/ApplicationManager.md#repairstoreapplication).
