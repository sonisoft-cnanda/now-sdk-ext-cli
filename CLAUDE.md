# now-sdk-ext-cli

`nex` — a CLI extending the ServiceNow SDK, built on `@sonisoft/now-sdk-ext-core`.

## Project Overview

An oclif v4 CLI exposing core's manager classes as commands: querying, schema
discovery, background script execution, flows, ATF, update sets, app install,
code search, log tailing and more. Core does the ServiceNow work; this repo is
argument parsing, output formatting, and the interactive surfaces.

## Architecture

- **`bin/`** — plain JS, ESM. Runs **before** oclif and before any build output
  exists, so nothing here may be TypeScript or import from `dist/`.
  - `argv-guard.js` / `argv-secrets.js` — refuse to run if a secret was passed in argv
  - `credstore-boot.js` — opt into headless-safe credential storage
- **`src/commands/`** — one directory per oclif topic (20 topics). Command
  discovery is by file path, so the directory layout *is* the command tree.
- **`src/common/`** — `AuthenticatedCommand` (the base every non-`auth` command
  extends, supplying `--auth`, `--cred-store`, `--log-level`, `--log-file`,
  `--log-dir`), plus
  `scope-autocomplete.ts`.
- **`src/services/`** — display services. Roughly 19 of them, all hand-rolled
  padded text tables. This is where output formatting lives, not in commands.

## Sibling Projects

- **Core**: `../now-sdk-ext-core` (`@sonisoft/now-sdk-ext-core`) — all ServiceNow
  behaviour. Add capability there, expose it here.
- **MCP server**: `../now-sdk-ext-mcp` — the same core surfaced to AI agents.
- **Credential store**: `../sn-credstore` — headless-safe credential storage.

## Build & Run

```bash
npm run build        # clean + tsc + tsc-alias
npm run lint         # eslint src/  (NOTE: src only — see AGENTS.md)
./bin/dev.js <cmd>   # run from source via ts-node
./bin/run.js <cmd>   # run from dist/
```

## Testing

```bash
npm run test:unit         # services + common + any *.unit.test.ts
npm run test:integration  # commands/ — hits a real instance
```

The split is by **path pattern**, not by directory convention:
`test:unit` matches `(services|common|\.unit\.test)`, `test:integration` matches
`commands` minus `\.unit\.test`. A test placed outside those paths runs in neither.

CI runs only `test:unit`. A deterministic test for a command therefore has to be
named `*.unit.test.ts` — it can still live beside its siblings in
`test/commands/<topic>/`, but the suffix is what puts it behind the PR gate and
keeps the instance-hitting `*.integration.test.ts` runs out of it.

## Key Patterns

- Every non-`auth` command extends `AuthenticatedCommand`, which resolves the
  credential and constructs a `ServiceNowInstance`. `auth` commands talk to
  `@sonisoft/sn-credstore` directly instead.
- `static enableJsonFlag = true` — most commands support `--json`.
- **Logging is configured once, in `AuthenticatedCommand.init()`, before any logger
  is created.** Core builds one logger for the whole process, so `configureLogging()`
  is the only thing that reaches the ~43 loggers inside core; passing a level to an
  individual `Logger` has never worked. File logging is OFF unless `--log-file` or
  `--log-dir` is given — `nex` must not write into the directory it was run from.
- `flushLogs()` is awaited in both `catch()` and `finally()`. Winston buffers, and
  `super.catch()` can terminate the process before `finally()` runs, which loses the
  failure line — the one worth keeping.
- **Instance changes are permitted by default**; `--read-only` / `--deny-write` /
  `--deny-execute` and `NEX_POLICY_DENY` take that away. Enforcement is in core at the
  HTTP layer and decides per REQUEST, so commands need no per-command classification —
  a command that reads or writes depending on its flags works with no special handling.
  Do not add per-command gating.
- The flags are deliberately deny-direction. `--allow-*` would grant nothing at a
  permissive default and cannot override `NEX_POLICY_DENY`; a test asserts none exist.
- Output goes through a display service; commands should not build tables inline.
- `nex exec` is the only interactive surface (a REPL). `nex log` is a long-running
  tail with a SIGINT handler.

## Conventions

- ES Modules, TypeScript, target ES2022
- 2-space indent, single quotes, no semicolons (differs from `sn-credstore`,
  which uses 4-space)
- Conventional commits (angular preset); semantic-release publishes on merge

## Releasing & Publishing

**Publishing to npm uses a Trusted Publisher (OIDC), not an auth token.** npmjs is
phasing token-based publishing out, so nothing here should reintroduce one.

- The workflow needs `permissions: id-token: write`. Without it npm cannot mint
  the OIDC credential, and the failure reads like a missing token — which is the
  wrong thing to go looking for.
- The package must be registered as a trusted publisher on npmjs, bound to this
  repository and workflow file. Renaming `publish.yml` breaks that binding.
- `--provenance` works off the same OIDC identity.
- Do NOT add an `NPM_TOKEN` back. If publishing fails, the fix is in the trusted
  publisher configuration on npmjs, not a new secret.

The release chain:

1. Merge to `main` → `release.yml` runs `semantic-release` (conventional commits,
   angular preset). It bumps, tags, and cuts a GitHub release. `npmPublish` is
   `false` — semantic-release never publishes.
2. That GitHub release fires `publish.yml`, which builds and publishes.

Step 2 fires **only** because `release.yml` runs semantic-release with
`RELEASE_TOKEN` rather than the default `GITHUB_TOKEN`. GitHub suppresses events
raised by `GITHUB_TOKEN` so a workflow cannot trigger further workflows. Since
`release.yml` falls back (`secrets.RELEASE_TOKEN || secrets.GITHUB_TOKEN`),
removing that secret leaves releases working while publishing silently stops.

`publish.yml` also accepts `workflow_dispatch` for backfill, dry runs, or
republishing a ref. It skips when the version already exists on npm, so re-running
is a no-op rather than an error.
