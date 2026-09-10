# AGENTS.md

Operating rules for automated agents working in this repository.

For architecture, layout and build commands, read [`CLAUDE.md`](./CLAUDE.md).
This file is only about the things that will bite you *here* and not elsewhere.

---

## What this repository is

A CLI that developers point at real ServiceNow instances, authenticated with real
credentials. Commands here delete records, install applications, execute
arbitrary server-side script, and switch update sets.

The blast radius of a wrong instance is production, not a test fixture.

---

## Hard rules

### 1. Never run a mutating command against a real instance

`nex` resolves a credential and runs. There is no dry-run at the CLI level except
where a command explicitly offers `--confirm` (`bulk update`, `bulk delete`).

Anything under `app`, `store`, `update-set`, `scope`, `task`, `xml import`,
`batch`, `bulk`, `exec`, `flow` and `script-sync push` **writes**. Do not invoke
them to "check something works". Read the command source instead, or use
`--help`.

`nex exec` is the sharpest: it runs arbitrary server-side JavaScript with the
caller's rights.

### 2. Never mutate the real credential store

`nex auth use|delete` and `--cred-store` operate on live credentials shared with
the ServiceNow SDK. Redirect first:

```bash
export SN_CRED_STORE=file
export SN_CRED_STORE_PATH="$(mktemp -d)/credentials.json"
```

Then **verify the redirect took effect** rather than assuming it did — ask the
code where it actually resolved (`nex auth doctor --json` reports the path). The
sibling `sn-credstore` repo records an incident where a mock silently failed to
apply under jest ESM and a real store was wiped.

### 3. `bin/` runs before oclif and before `dist/` exists

Everything in `bin/` is plain JavaScript for that reason. It cannot be
TypeScript, cannot import from `dist/`, and cannot rely on anything oclif has
parsed — the credential shim has to install before `AuthenticatedCommand.init()`
resolves a credential, which is before flags exist.

That is why `credstore-boot.js` and `argv-guard.js` read `process.argv`
directly. Preserve the import order in `run.js` / `dev.js`: argv guard first,
credential shim second, oclif last.

### 4. Never widen the argv secret check to match values

`bin/argv-secrets.js` matches on **flag name only**. That is deliberate and
load-bearing: `nex exec` takes arbitrary scripts, and `--query`, `--filter`,
`--data`, `--payload` and `--spec` all take arbitrary text that can contain
anything a secret-shaped regex would match.

A missed detection costs a warning nobody saw. A false positive blocks legitimate
work outright. Bias hard toward the former.

Note the guard cannot *prevent* the leak — by the time the process starts, the
value is in shell history and `ps`. Its job is to say so and tell the user to
rotate.

### 5. `eslint` only sees `src/`

`npm run lint` is `eslint src/`. `bin/` and `test/` are **not linted at all**, so
a clean lint run says nothing about them. Type-check separately with
`npx tsc --noEmit` if you touched anything typed.

### 6. Test placement decides whether a test runs

The unit/integration split is by path pattern, not directory intent:

- `test:unit` → `(services|common|\.unit\.test)`
- `test:integration` → `commands`, minus `\.unit\.test`

A test in `test/helpers/` or `test/util/` matches **neither** and runs in no CI
job. Put unit tests for `bin/` code under `test/common/`.

Only `test:unit` runs in CI. A **deterministic** test for a command must
therefore be named `*.unit.test.ts` (e.g.
`test/commands/flow/definition.unit.test.ts`) — the suffix, not the directory,
is what puts it behind the PR gate. Name it `*.integration.test.ts` and it
lands in the job nobody runs.

---

## Conventions that are easy to get wrong

- 2-space indent, single quotes, **no semicolons**. The sibling `sn-credstore`
  repo uses 4-space and semicolons — do not copy style across repos.
- Output belongs in a display service under `src/services/`, not inline in a
  command.
- Never log `credential` or `snSettings`. `--log-level debug` would write the
  password to the terminal and to CI logs; there is a comment at
  `src/common/authenticated-command.ts` saying exactly this.
- **Do not write files unless asked.** `nex` used to drop `./logs/*.log` into
  whatever directory it ran from, because core's logger had hard-coded relative
  paths (NEX-3). File logging is now opt-in via `--log-file` / `--log-dir`, and
  `test/common/logging-e2e.test.ts` spawns the real binary to prove it — a flag
  test alone would pass even if `configureLogging()` were never called.
- Errors from `sn-credstore` carry a `remediation` field. Surface it — that is
  the whole point of the taxonomy. Duck-type it (`(e as {remediation?: string})`)
  rather than `instanceof`, which is unreliable across its dual ESM/CJS build.

## Before you open a PR

```bash
npm run build
npm run lint          # src/ only
npm run test:unit
```

Integration tests need a real instance and are not run in CI. Do not run them
casually — see rule 1.
