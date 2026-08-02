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
  extends, supplying `--auth`, `--cred-store`, `--log-level`), plus
  `scope-autocomplete.ts`.
- **`src/services/`** — display services. Roughly 19 of them, all hand-rolled
  padded text tables. This is where output formatting lives, not in commands.
- **`src/tui/`** (in progress) — the `nex tui` full-screen Ink workspace. Only
  `src/commands/tui.ts` may live under `src/commands/` (anything emitted into
  `dist/commands/**` becomes a command). Plan of record: `docs/TUI_PLAN.md`.

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
npm run test:unit         # services + common only
npm run test:integration  # commands/ — hits a real instance
```

The split is by **path pattern**, not by directory convention:
`test:unit` matches `(services|common)`, `test:integration` matches `commands`.
A test placed outside those paths runs in neither.

## Key Patterns

- Every non-`auth` command extends `AuthenticatedCommand`, which resolves the
  credential and constructs a `ServiceNowInstance`. `auth` commands talk to
  `@sonisoft/sn-credstore` directly instead.
- `static enableJsonFlag = true` — most commands support `--json`.
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
