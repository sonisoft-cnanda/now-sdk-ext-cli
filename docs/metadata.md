# Verified metadata writes

Use `nex metadata` for application files that need form submission and verified update-set capture.
These commands use `MetadataFormWriter` from core 6.8.0.
Ordinary record commands keep their existing behavior.

```bash
nex metadata insert --table sys_script_include --scope x_example_app \
  --fields-file ./insert-fields.json --update-set 0123456789abcdef0123456789abcdef \
  --auth dev --cred-store --json

nex metadata update --table sys_script_include --sys-id abcdef0123456789abcdef0123456789 \
  --scope x_example_app --fields-file ./update-fields.json --auth dev --cred-store --json

nex metadata delete --table sys_script_include --sys-id abcdef0123456789abcdef0123456789 \
  --scope x_example_app --confirm-table sys_script_include \
  --confirm-sys-id abcdef0123456789abcdef0123456789 --auth dev --cred-store --json
```

An insert file can contain:

```json
{
  "name": "ExampleUtil",
  "active": false,
  "script": "var ExampleUtil = Class.create();"
}
```

Supply exactly one scope: `--scope <name|global>` or `--scope-id <32 hexadecimal characters>`.
There is no default scope. The credential alias does not select the application scope.
Delete confirmation must match the target table and ID exactly.

Insert and update accept either `--fields-file <path>` or `--fields <json>`.
Variables use either `--variables-file <path>` or `--variables <json>`.
Use `--variable-field <column>` only with variables.
Variable-only writes and `--initial-query <equality-query>` writes are supported.
A write must supply fields, variables, or an initial query.
Initial queries accept literal equality terms separated by single carets, for example `name=Example^active=false`.
Field identifiers must match `[a-z][a-z0-9_]*`. Uppercase identifiers, `sys_` fields, and prototype-sensitive keys are refused.
Empty terms, control characters, and `javascript:` values are refused.
Empty literal values and additional equals signs in values are permitted, for example `name=` and `name=a=b`.
The CLI does not decode or change the query. Core also checks allowed form fields and query restrictions.
`--view <name>` selects the form view.

Fields and variables must be JSON objects. Values can be strings, finite numbers, booleans, null, string arrays, or duration objects.
Duration objects use numeric `days`, `hours`, `minutes`, and `seconds` members.
Prototype-sensitive keys, other nested objects, root arrays, and invalid JSON are refused.
File errors do not print file contents. Prefer files for scripts and other private input.
Core checks form fields, variables, table inheritance, forbidden system fields, and initial-query restrictions.
Caller `sys_*` fields, Store applications, unsupported tables, and unsupported delete actions are refused.

An explicit `--update-set <sys_id>` must identify an In progress set in the requested scope.
Without this flag, core predicts the capture destination from the user's per-scope preference.
Neither path selects an application or update-set picker.
A verified cross-scope write can change the current update set.
Human and JSON output report the old set, new set, switch, and preference-row replacement evidence.
`preferencesUnchanged: false` alone does not mean the operation failed.
Coordinate all metadata writes and picker changes with other users of the same session.
The CLI does not restore preferences automatically.

Successful JSON output is one `MetadataWriteResult` object.
Failures have a nonzero exit status and one oclif `error` envelope.
The `error.metadata` object contains the stable failure code, action, known identity, available capture evidence, messages, and remediation.
Verification failures contain `verification: "failed"` and preserve `writeAttempted`, including `false` for a pre-submit session change.
Missing evidence is omitted. It is not replaced with default values.

Each metadata POST runs once. A 401, uncertain response, or failed verification does not trigger a replay.
The record can exist after failed verification.
Read its exact table/ID and capture evidence before deciding on retry or cleanup.
A successful result verifies record scope and capture; it does not prove that every submitted field value persisted.
Read exact content separately when the task needs that proof.

The CLI does not expose mixed-scope capture, force, automatic scope selection, preference repair, or alternate write transports.
These commands do not publish an application, complete an update set, or promote a change.
The governing platform evidence covers Australia patch 3 on dev206299.
It does not establish support for every platform family or metadata table.
See the [core contract](https://github.com/sonisoft-cnanda/now-sdk-ext-core/blob/v6.8.0/docs/MetadataFormWriter.md).

Run local evaluations after building:

```bash
npm run build
node --experimental-vm-modules node_modules/.bin/jest --runInBand --runTestsByPath \
  test/commands/metadata/metadata.unit.test.ts test/services/metadata-display.service.test.ts \
  test/common/metadata-eval.test.ts
npm run test:metadata:package
```

Package evaluations pack and install the candidate into a run-owned prefix.
They use fabricated credentials and a loopback HTTP fixture with confined child networking.
The package receipt records the source SHA, source cleanliness, package digest, and executable path.
A dirty-source receipt cannot supply final-head live evidence.
Live checks require the separate specialist review and bounded lifecycle specified on NEX-125.
Do not run unrestricted integration tests against an instance.

## Guarded live evaluation

The live runner needs Architect review of the exact runner and fixture contract before execution.
A review reference in a file does not grant approval.
Use only alias `dev206299`. Coordinate the test window with all session users.
The existing application, current update set, and per-scope preference must already match.
The runner refuses setup that needs picker changes or preference repair.

Create a fresh persistent directory outside the repository, `/tmp`, and run scratch.
Set its mode to `0700`. Store the approved fixture as `fixture.json` with mode `0600`:

```json
{
  "alias": "dev206299",
  "scopeId": "<reviewed 32-character lowercase sys_id>",
  "scopeName": "<reviewed developed application scope>",
  "updateSetId": "<reviewed In progress update set sys_id>",
  "reviewReference": "<Architect review link>",
  "coordinatedWindow": "<agreed UTC window and session users>"
}
```

Build and commit the source before the package evaluation.
Use the `cliBin` path from its clean `candidate.json` receipt as `PACKED_NEX`.
The receipt must match the current source SHA, installed package tree, tarball digest, and core 6.8.0.
Do not use a global CLI or a development binary for this check.

```bash
npm run test:metadata:package
NEX_METADATA_LIVE=1 npm run test:metadata:live -- \
  --access-helper "$SN_ACCESS" --private-dir "$PRIVATE_DIR" --cli-bin "$PACKED_NEX"
```

The access helper owns the alias lock for the whole lifecycle.
Do not wrap the launcher in another helper invocation.
The runner checks the authorized endpoint, server/client clock, fixture identity, excluded scopes, and preference baseline.
The server Date header must be within two seconds of client UTC before writes.
It creates one uniquely named inactive Script Include through the packed CLI.
It reads exact scope/content and fresh capture after insert and update.
Capture evidence must include a valid ID and numeric version counter.
A reused capture ID must have a higher counter. A timestamp change alone is insufficient.
It checks ownership before confirmed delete, then checks absence, DELETE capture, and deletion evidence.
It retains capture records and update sets.
A separate helper invocation performs a read-only audit after the lifecycle lock is released.
The lifecycle and audit use a native read child with the candidate's credential boot, authentication, policy, and public request APIs.
This child checks raw Stats counts and Table result arrays before conversion.
Missing, null, nonnumeric, incomplete, or changed evidence fails the read; it cannot prove absence.
Only an explicit zero count and empty result array, followed by the same count, prove an empty read.
The ordinary query and count commands keep their existing behavior.

Each private directory permits one attempt. A failed operation stops the mutation sequence.
The runner reads available exact identity evidence and records retained IDs.
It does not repeat a POST, run generic cleanup, or repair preferences.
A retained fixture needs a separate reviewed cleanup decision.
Raw preferences and synthetic script files remain in the private directory. Do not attach them to a ticket.
Share only the reviewed safe reports and candidate receipt.

Run the integration bridge in a second fresh private directory with the same approved controls:

```bash
NEX_METADATA_LIVE=1 SN_ACCESS="$SN_ACCESS" PRIVATE_DIR="$PRIVATE_DIR" PACKED_NEX="$PACKED_NEX" \
  node --experimental-vm-modules node_modules/.bin/jest --runInBand --runTestsByPath \
  test/commands/metadata/metadata.integration.test.ts
```

The bridge fails without explicit live opt-in. A missing report, signal, failed cleanup, or failed audit fails the check.
No skipped integration check counts as live evidence.
