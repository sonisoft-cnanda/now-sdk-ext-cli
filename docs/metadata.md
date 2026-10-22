# Verified metadata writes

Use `nex metadata` for application files that need form submission and verified update-set capture.
These commands use `MetadataFormWriter`, `FormLayoutWriter` and `WorkingSetManager` from core 6.9 (NSE-15),
`ListLayoutWriter` from core 6.11 (SK-5), and `ColumnWriter` from core 6.12 (SK-6).
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
Caller `sys_*` fields, unsupported tables, and unsupported delete actions are refused.
Store applications are refused unless the write is acknowledged (see below).

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
These commands do not publish an application or promote a change.

## Applications you do not own: Store applications and Global

Changing a file of an installed Store application (`sys_store_app`) marks it as customized:
upgrades of that application then skip the file until someone reviews it. That is sometimes the
right call, so it is allowed, but never by accident:

- `--acknowledge-upgrade-skip` is required on every write to a Store application's file.
  Without it the write is refused with `store_scope` before anything is sent.
- `--update-set` is required for a Store application (`update_set_required`). For a form or list
  layout or a new column the set must also be your working set (`update_set_not_current`): make
  it current with `nex update-set use`. A choice change follows the set given, current or not.
- Files the vendor locked (`sys_policy` read or protected) are refused with `protected_record`.
- The result's `capture.customization` reports the consequence: `replaceOnUpgrade: false`
  means upgrades skip the file, and `baselineVersion: true` means a vendor version exists.
  Record it in the update set description. Reverting the content later does not undo it.
- `capture.updateName` is the captured file's name. For labels and choices it is the platform's
  coalescing name (`sys_documentation_<table>_<element>_<language>`, `sys_choice_<table>_<element>`).

Global files need no acknowledgement, but the same explicit scope and update set.

### Form layouts

A form section's layout is captured as one Form Layout file, `sys_ui_section_<section sys_id>`.
Change it through the Form Layout page with `metadata layout set`, which takes the whole
section in order and verifies both the order and the capture:

```bash
nex metadata layout get --section <sys_ui_section sys_id> --auth dev --read-only --json
nex metadata layout set --section <id> --elements 'name,.begin_split,type,.split,url,.end_split' \
  --scope-id <application sys_id> --update-set <set> --acknowledge-upgrade-skip --auth dev --json
```

Elements are field names, `.begin_split`, `.split`, `.end_split` and
`.formatter.<sys_ui_formatter sys_id>`, or a JSON array in `--elements-file`. The result's
`previousElements` puts the layout back.

### List layouts

A table's list for one view is captured as one List Layout file, `sys_ui_list_<table>_<view>`
(`null` for the Default view). Change it through the List Layout page with
`metadata list-layout set`, which takes every column in order and verifies the columns, the
list's application and the capture:

```bash
nex metadata list-layout get --table cmn_cost_center [--view <name>] --auth dev --read-only --json
nex metadata list-layout set --table cmn_cost_center --columns 'name,code,manager,valid_from' \
  --scope global --update-set <set> --auth dev --json
```

Columns are field names, dot-walked as `field.field`, or a JSON array in `--columns-file`. Only
the table's own list is changed, never a related list or a user's personalized list. Each save
replaces the `sys_ui_list` record (a new sys_id, the same update name). A table with no list of
its own (`"exists": false`) gets one: `created` is true, and undoing that means deleting the new
row (`sysId`) and moving its DELETE capture to the application's Default, because shipped it
would delete that list on the target. Otherwise `previousColumns` puts the list back. Only the
global domain is handled: a list or user in another domain is refused before saving
(`domain_not_supported`).

### Columns

`metadata column add` adds a column through the dictionary form, as the UI's New column does, and
verifies the column, its label, the platform's form placement and every capture:

```bash
nex metadata column add --table x_acme_ticket --column triage_note --label 'Triage note' \
  [--type string] [--max-length 100] [--reference <table>] \
  --scope x_acme --update-set <set> --auth dev --json
```

The platform names the column, and the command adds the prefix for you: `u_<name>` in Global and
in an installed Store application (even on its own table), `<scope>_<name>` when an application
adds it to another application's table, and `<name>` unchanged on a scoped application's own
table. `column` in the result is the name as saved. On Global tables and an application's own
tables the platform also appends the field to the end of the Default view's main section
(`formSections`); move it with `metadata layout set`. Nothing is placed for a column on another
application's table, or when a field of that name is already on the form (re-adding a deleted
column, whose form element was left behind): `formSections` is then empty. Every capture in
`captures` (Dictionary, Field Label, and Form Layout when placed) is checked to be in
`--update-set`, which must be the working set. A name the table or a parent already has is refused
before saving (`column_exists`). A column in an installed Store application needs
`--acknowledge-upgrade-skip`: its Dictionary and Field Label files are customizations of that
application (`capture.customization` reports the Dictionary file), and so is the form section when
the field is placed on it. Upgrades skip customized files.

The command does not remove columns. Deleting a column deletes its data wherever its capture is
committed, turns its Dictionary and Field Label captures into DELETEs, and leaves its form element
behind.

### Choice lists

`metadata choice get|set|remove` read and change a column's choices through the choice form, as
the UI's New and Edit on a choice do, and verify the choice, the list's application file and its
one capture:

```bash
nex metadata choice get --table x_acme_ticket --column severity [--language en] --auth dev --read-only
nex metadata choice set --table x_acme_ticket --column severity --value 4 --label 'Severity 4' \
  [--sequence 4] [--inactive | --no-inactive] [--hint text] \
  --scope x_acme --update-set <set> --auth dev --json
nex metadata choice remove --table x_acme_ticket --column severity --value 4 [--confirm-in-use] \
  --scope x_acme --update-set <set> --auth dev --json
```

A choice row has no application; the list does, through its choice set (`sys_choice_set`, one
per table and column), which the first choice creates. `get` shows its application's sys_id
(`choiceSet.scope`): pass it as `--scope-id` (or `--scope global` when it is `global`). A table with no list yet takes the column's application. A table that
only shows the list of a table it extends is refused (`choice_list_inherited`): change that
table's list. `set` adds the value with `--label`, or changes only the given options that differ on
an existing one (`choice_unchanged` when nothing does); `--inactive` hides a choice from new
selections and keeps it for the records that hold it. `remove` counts those records first and is
refused while any exist (`choice_in_use`, `detail.records`) unless `--confirm-in-use`; the records
keep the value. Removing the last choice keeps the choice set.

Every change rewrites one capture, `sys_choice_<table>_<column>` (type Choice list), holding the
choice set and the whole list. It is checked to be in `--update-set` and to hold the choice as
saved (or no longer hold a removed one). The capture follows the set given, which need not be the
working set. A list of an installed Store application needs `--acknowledge-upgrade-skip`.

Choices show on the form only when the column's dictionary Choice setting is a dropdown or
suggestion. A column added with `metadata column add --type choice` is a dropdown; `get` and every
result say when a column is not.

### The working set lifecycle

```bash
nex update-set create -n 'STORY-1 Policy form' -d '<story; customizes <app>; upgrades skip it>' \
  --application <app sys_id, scope name or global> --auth dev --json
nex update-set use <set> --auth dev --json            # keep "previous"
# ... nex metadata writes ...
nex update-set complete <set> --expected-captures <n> --auth dev --json
nex update-set restore --application <previous.application> --update-set <previous.updateSet> --auth dev
```

`use` saves `apps.current_app`, `sys_update_set` and `updateSetForScope<app>`, and reads them
back, so the next session captures into the set. `move-capture` moves one capture between two
In progress sets of its own application. `complete` refuses a count other than
`--expected-captures`, another application's captures, duplicate captures and a set another user
is working in. Each command reads its result back, and a refusal carries a code, identifiers in
`error.updateSet.detail`, and a remedy. Seen on dev206299 (Australia patch 3) on 2026-10-20 against GRC
(`sn_compliance`) and Global. The procedure, governance and upgrade review are in the
`update-sets` skill (`reference/other-applications.md`).

### Live integration test

`npm run test:live` builds the CLI, then runs `test/commands/update-set/working-set.live.test.ts`
against `SN_INSTANCE_ALIAS` (default `dev206299`) through the built `nex` binary:

1. Create a GRC (`sn_compliance`) set and check that the layout change is refused until the set
   is current.
2. Run `update-set use` and confirm it with `update-set current`.
3. Check that `store_scope` is refused without `--acknowledge-upgrade-skip`.
4. Add a field to the Policy form and put it back, then check that the set holds one Form Layout
   capture.
5. Check the `scope_mismatch` and `capture_count_mismatch` refusals, then complete the set.
6. Run the Global Script Include lifecycle, then `update-set restore`.

`npm run test:integration` skips it unless `NEX_LIVE=1`, and `test:unit` does not select it. It
also skips when the instance has no active `sn_compliance` application.

Each run leaves two Complete sets named `nex-it NSE-15 CLI … (test only, do not promote)`, and the
Policy section stays customized. A set left In progress by a failure is set to Ignore, and
nothing is deleted. Core's `WorkingSetLifecycle_IT` covers the same use case through the API.
The governing platform evidence covers Australia patch 3 on dev206299.
It does not establish support for every platform family or metadata table.
See the [core contract](https://github.com/sonisoft-cnanda/now-sdk-ext-core/blob/main/docs/MetadataFormWriter.md).

Run local evaluations after building:

```bash
npm run build
node --experimental-vm-modules node_modules/.bin/jest --runInBand --runTestsByPath \
  test/commands/metadata/metadata.unit.test.ts test/services/metadata-display.service.test.ts
NEX_METADATA_CLI_BIN="$PWD/bin/run.js" node --experimental-vm-modules node_modules/.bin/jest \
  --runInBand --runTestsByPath test/common/metadata-eval.test.ts   # about 5 minutes
npm run test:metadata:package                                      # runs the evaluations on the packed CLI
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
Use only the alias named in the reviewed fixture. Its endpoint is `https://<alias>.service-now.com` unless the fixture
sets `origin`. Coordinate the test window with all session users.
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
The receipt must match the current source SHA, installed package tree and tarball digest, and its core must satisfy the declared range.
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

Without the live opt-in the bridge is skipped, so `npm run test:integration` still runs. A skip is not live evidence.
With the opt-in, a missing report, signal, failed cleanup, or failed audit fails the check.
