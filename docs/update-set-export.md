# Exporting an update set to XML

`nex update-set export` writes the same XML unload as the platform's **Export to XML** buttons, after
checking that it holds exactly the sets and records the instance counts.

```bash
nex update-set export 0123456789abcdef0123456789abcdef --auth dev
nex update-set export 0123456789abcdef0123456789abcdef --output ./exports/ --json --auth dev
nex update-set export 0123456789abcdef0123456789abcdef --output STORY-123.xml --force --auth dev
```

- **Output:** `update-set-<sys_id>.xml` in the current directory, or in the directory `--output` names, or the
  file `--output` names. An existing file is refused before the instance is asked for anything, unless
  `--force` is passed. The file is written beside the target and moved into place, owner-only (0600).
- **`--json`** returns `file`, `bytes`, `sha256`, `source`, `kind`, `updateSet`, `sets` (each with its record
  count), `excluded`, `recordCount`, `cleanup` and `messages`. The XML is never printed: it holds every
  record's full payload. Take a file from a customer instance only with the owner's say-so.

## What gets exported

| sys_id of | Result |
| --- | --- |
| A Complete update set | That set (the platform's Export to XML). |
| A Complete batch base | The base and its Complete children (Export Update Set Batch to XML). |
| A batch member | Refused (`batch_member`); the remediation names the base to export. |
| A set that is not Complete | Refused (`update_set_incomplete`) unless `--include-incomplete`; the file is then a snapshot of unfinished work, and a batch includes every child. |
| A Loaded Retrieved Update Set | That set, or a retrieved batch base with its members. A plain read. |
| A Retrieved Update Set in another state | Refused (`retrieved_state`), as the platform does. |

## What it changes on the instance

A local export works as the UI does. A background script runs the platform's `UpdateSetExport`, which copies
the set into a temporary Retrieved Update Set (state Loaded). The download then deletes that copy.

The platform finishes that delete a few seconds after the download returns. nex waits for it, deletes
whatever remains, and reads back until neither the copy nor its rows are left. `cleanup` reports who removed
it. If it cannot prove that, the command fails with `cleanup_unverified` and the copy's sys_ids. Delete them
from Retrieved Update Sets and never preview or commit them.

Because of that script and delete, `--read-only`, `--deny-execute` and `NEX_POLICY_DENY` refuse a local
export before anything is copied. A Retrieved Update Set export is a read and works under all of them.
The processors need `admin`, `delegated_developer` or `update_set_admin`.

## Refusals

| Code | What to do |
| --- | --- |
| `invalid_input` | Pass a 32-character sys_id. |
| `update_set_not_found` | No local or retrieved set has that sys_id. |
| `update_set_incomplete` | Complete the set (`nex update-set complete`), or pass `--include-incomplete`. |
| `batch_member` | Export the batch base (`detail.base`). |
| `retrieved_state` | Only a Loaded Retrieved Update Set can be exported. |
| `evidence_unavailable` | A read was incomplete; nothing was copied. Retry. |
| `script_result_unavailable` | The script's result was unreadable; check `detail.temporary` for copies to delete. |
| `export_failed` | The download failed (`detail.status`); the copy was removed. |
| `export_mismatch` | The file did not match the instance's counts; nothing was written. |
| `cleanup_unverified` | Delete `detail.temporary` from Retrieved Update Sets. |
| `output_exists` / `output_invalid` | Choose another `--output`, or pass `--force`. |
