# `nex tui` — a full-screen ServiceNow workspace

> **Status: approved implementation plan — the authoritative reference for the TUI work.**
> Where this document and [`research/tui_research.md`](./research/tui_research.md) disagree,
> this document wins: the research is the technology-selection rationale (mid-2026 survey);
> this is the decisions of record. Verified against ink 7.1.1 / react 19.2.8 /
> @inkjs/ui 2.0.0 on npm, and against this repo's actual toolchain.
> Work is tracked in the Jira epic in project `NEX` (see §14).

## Context

`nex` is 71 oclif commands across 21 topics, each one a thin argument parser over a
`@sonisoft/now-sdk-ext-core` manager, printing hand-padded text tables from
`src/services/*.service.ts`. It is excellent for agents and for scripting, and nothing
about it changes here.

What it cannot do is hold context. Three specific gaps:

1. **Ambient state is invisible.** Current scope and current update set silently decide
   where every write lands. In a CLI you discover you were in the wrong one afterwards.
2. **Nothing is adjacent.** A log line and the record it names are two invocations and a
   copy-paste apart. A script run and its `gs.info` output are in different terminals.
3. **`--confirm` is a blind promise.** You assert intent before you know the blast radius.

`docs/research/tui_research.md` already did the technology selection: Ink (React for
terminals) + `@inkjs/ui`, ESM, oclif `Command` in `.ts` dynamically importing `.tsx`.
This plan is what to build with it.

**Decisions taken:** one workspace (`nex tui`), not per-command `--tui` modes. Five panes —
Records, Logs, Scripts, Ops (Flows/ATF/Update Sets), and a Project pane that appears only
when the TUI is launched inside a `@servicenow/sdk` (Fluent) project and exposes the
now-sdk commands generically. Full write parity with the CLI, gated by Claude-Code-style
per-action approvals. Data-shaping logic extracted into `src/services/shape/` and shared
with the existing CLI display services.

The Project pane is what makes this a workspace rather than a browser: `nex` operates on a
running instance, now-sdk operates on the source that produces it, and today those are two
terminals and a context switch.

---

## 1. Directory layout

```
src/commands/tui.ts                 # THE ONLY file under src/commands/. No JSX.

src/tui/
  index.ts                          # startTui(opts) — createElement, no JSX
  boot/
    terminal.ts                     # alt-screen, raw mode, bracketed paste, cleanup registry
    stdout-capture.ts               # divert winston/console away from the frame
    session.ts                      # build the frozen TuiSession
    foreground.ts                   # suspend/resume the TUI around a child process
  context/       session-context.tsx  ui-context.tsx
  state/         types.ts  reducer.ts  store.ts  selectors.ts
  data/
    gateway.ts                      # NexGateway — the ONLY importer of core
    records.gateway.ts  logs.gateway.ts  scripts.gateway.ts  automation.gateway.ts
    sdk.gateway.ts                  # spawn/stream the now-sdk binary
    project-detect.ts               # find now.config.json, read project identity
    sdk-manifest.ts                 # now-sdk command/flag catalogue + risk classification
    approvals.ts                    # approval policy + session memory + ApprovalToken
    cache.ts  request-token.ts  ring-buffer.ts  types.ts
  hooks/
    use-async-resource.ts  use-stream-buffer.ts  use-keymap.ts
    use-terminal-size.ts   use-approval.ts
  ui/
    theme.ts  glyphs.ts
    viewport.tsx / viewport-window.ts        # component + PURE window math
    data-table.tsx / column-solver.ts        # component + PURE width solver
    modal-host.tsx  approval-dialog.tsx
    command-palette.tsx / palette-score.ts
    picker.tsx                               # generic type-to-filter + arrow-select list
    instance-banner.tsx  status-bar.tsx  hint-bar.tsx  toast-host.tsx
    editor.tsx / text-buffer.ts              # component + PURE buffer
    field-input.tsx  empty-state.tsx  error-boundary.tsx
  commands/registry.ts              # TuiCommand[] — powers palette, help, hints, keymap
  keymap/  scope-stack.ts  bindings.ts
  panes/
    records/     record-pane.tsx  record-list.tsx  record-form.tsx
                 related-lists.tsx  query-bar.tsx  table-picker.tsx
    logs/        logs-pane.tsx  log-stream.tsx  log-filter-bar.tsx  reference-jump.tsx
    scripts/     scripts-pane.tsx  transcript.tsx  scope-picker.tsx  param-panel.tsx
    ops/         ops-pane.tsx  flows-tab.tsx  atf-tab.tsx  update-sets-tab.tsx
    project/     project-pane.tsx  command-list.tsx  flag-form.tsx  run-output.tsx
  app.tsx                           # root layout, ONE useInput, pane router

src/services/shape/                 # NEW — pure shaping, consumed by BOTH layers
  record-columns.ts  log-entry.ts  schema-field.ts
  update-set.ts  flow-report.ts  atf-result.ts  bulk-result.ts
```

**Trap — only `src/commands/tui.ts` may live under `src/commands/`.** `package.json`
`oclif.commands.globPatterns` is `**/*.+(js|cjs|mjs|ts|tsx|mts|cts)` over `./dist/commands`,
negating only `*.d.*`/`*.test.*`/`*.spec.*`/`*.helpers.*`. Anything else emitted into
`dist/commands/**` becomes a command and fails at load.

---

## 2. Boot and teardown

### `src/commands/tui.ts`

Extends `AuthenticatedCommand` (`src/common/authenticated-command.ts`) so it inherits
`--auth`, `--cred-store`, `--log-level`, the `getCredentials()` path and `failAuth()`'s
remediation for free. **The TUI never resolves a credential and never sees one** — it
receives only `this.instance`.

Added flags: `--pane` (`records|logs|scripts|ops|project`), `--table`, `--query`,
`--read-only`, `--approve-all`, `--scrollback` (default 5000), `--ascii`.

`run()` order:

1. `--json` → return a capability descriptor `{alias, host, user, panes, keymap, version}`
   and exit. `enableJsonFlag` is inherited whether we want it or not; make it useful.
   There is no JSON rendering of a UI.
2. **TTY guard**, in the command, not in React:
   ```ts
   const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)
     && process.env.TERM !== 'dumb' && !process.env.CI
   ```
   Both streams: Ink throws `Raw mode is not supported` when *stdin* isn't a TTY, so a
   bare `stdout.isTTY` check still crashes under `nex tui < /dev/null`. On failure,
   `this.error()` with suggestions pointing at `nex query`/`nex log`/`nex exec --json`.
   No plain-text fallback dashboard — 71 commands already cover that case.
3. Refuse below 60×20 with the actual measured size in the message.
4. `const {startTui} = await import('../tui/index.js')` — dynamic, so React/Ink never load
   for the other 71 commands.

### `src/tui/boot/terminal.ts`

Enter `[?1049h` (alt screen), `[?25l` (hide cursor), `[?2004h`
(bracketed paste). One idempotent `cleanup()` registered on `SIGINT`, `SIGTERM`, `SIGHUP`,
`exit`, `uncaughtException`, `unhandledRejection`:

```
unmount() → gateway.disposeAll() → exit alt screen → setRawMode(false)
          → stdin.pause() → restore stdout.write
```

`gateway.disposeAll()` is where `SyslogReader.stopTailing()` lives. A `useEffect` teardown
is not enough — an uncaught exception skips effect teardown and the poll interval keeps the
process alive. (Every jest script here already runs `--forceExit`; don't add to that.)

`render(<App/>, {exitOnCtrlC: false, patchConsole: true})`. Ctrl+C is scoped: cancel
in-flight → close overlay → twice within 2s quits, matching the existing `nex exec`
convention at `src/commands/exec/index.ts:299-322`.

### `src/tui/boot/stdout-capture.ts`

**Trap.** `LogFactory.createLogger()` (`src/util/log-factory.ts`) returns core's winston
`Logger`, which writes **straight to `process.stdout`**, bypassing Ink's `patchConsole`.
At `--log-level debug` every log line shreds the frame. Patch `process.stdout.write` /
`stderr.write` into an in-app diagnostics ring buffer (`^L` to view), restore in cleanup.
Per `AGENTS.md`: `credential`/`snSettings` must never reach that buffer, and it is never
persisted.

---

## 3. Toolchain changes

### `tsconfig.json`

```jsonc
"jsx": "react-jsx",              // ADD
"moduleResolution": "Bundler",   // CHANGE from "Node"
```

`Node` (node10) resolves types via `types`/`typings` only; ink 7, `@inkjs/ui` 2 and
`@types/react` 19 expose types solely through `exports` maps and resolve to errors today.

**`NodeNext` is not the fix.** `src/common/scope-autocomplete.ts:3` is an extensionless
bare deep import (`import type { Creds } from '@servicenow/sdk-cli-core/dist/command/auth'`)
which `NodeNext` rejects outright, and `NodeNext` would force `module: "NodeNext"` and CJS
interop strictness across all 71 commands. `Bundler` gives exports-map resolution with none
of that, is legal alongside `module: "ES2022"`, and still does `.js → .ts/.tsx` substitution
so **no existing import changes** (every relative import already carries `.js`).

Risk to gate in Phase 0: `Bundler` also checks `@servicenow/sdk-cli/dist/auth/index.js`
against that package's exports map. Runtime already passes, so it should resolve. Fallback
is an ambient `declare module` in `src/types/` — **not** `compilerOptions.paths`, because
`tsc-alias --resolve-full-paths` runs on every build and would rewrite a `paths` alias into
a literal `../../node_modules/...` specifier in `dist/`.

**Trap — `composite: true` implies `.d.ts` emit for every `.tsx`.** Components whose props
come from a non-exported interface produce `TS4023`. Convention, enforced in review: every
component exports its Props interface and annotates its return type.

### `package.json`

```
dependencies:     ink@^7.1.1  react@^19.2.8  @inkjs/ui@^2.0.0
devDependencies:  @types/react@^19.2  ink-testing-library@^4.0.0  eslint-plugin-react-hooks@^6
```

Verified against the registry: ink 7.1.1 needs node ≥22 (`engines` here is `>=26`) and
react ≥19.2. None of these are in the lockfile today. Skip `react-devtools-core` (optional
peer). `files` already ships `/dist`.

Scripts: add `"dev:tui": "npm run buildts && ./bin/run.js tui"`, and change
`test:unit` from `--testPathPattern='(services|common)'` to `'(services|common|tui)'`.

Separately (own commit, pre-existing): `@types/node` is `^18` while `engines` says `>=26`.

### `eslint.config.mjs`

**Trap — flat config lints only files matched by some config object's `files`.**
`eslint-config-oclif` targets `.ts`/`.js`, so without an explicit block `npm run lint`
reports success having never opened a TUI file. Add after `...oclif`:

```js
{
  files: ['src/tui/**/*.{ts,tsx}'],
  languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
  plugins: {'react-hooks': reactHooks},
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'perfectionist/sort-objects': 'off',
    'no-restricted-imports': ['error', {paths: [
      {name: '@sonisoft/now-sdk-ext-core', message: 'Only src/tui/data/** may import core.'},
      {name: '@servicenow/sdk-cli/dist/auth/index.js', message: 'The TUI never resolves credentials.'},
    ]}],
  },
},
{files: ['src/tui/data/**'], rules: {'no-restricted-imports': 'off'}},
```

That last pair turns the gateway boundary and the never-touch-credentials rule from
documentation into enforcement. Verify by planting a deliberate error in a `.tsx`.

### `jest.config.ts`

```ts
extensionsToTreatAsEsm: ['.ts', '.tsx'],
transform: {'^.+\\.tsx?$': ['ts-jest', {useESM: true}]},
testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js'],
collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/index.ts'],
```

Two silent traps in the current config: the transform key `'^.+\\.ts?$'` has the `?` bound
to the `s`, so it matches `.ts` and `.t` but **not** `.tsx`; and
`collectCoverageFrom: ['src/**/*.ts']` excludes `.tsx`, so coverage would look healthy while
measuring none of the UI.

---

## 4. Data layer

### One frozen session

```ts
interface TuiSession {
  readonly instance: ServiceNowInstance   // getHost()/getUserName() called ONCE at boot
  readonly host: string; readonly user: string; readonly alias: string
  readonly env: 'dev' | 'test' | 'prod' | 'unknown'
  readonly readOnly: boolean
  readonly gateway: NexGateway
  readonly diagnostics: RingBuffer<string>
}
```

`Object.freeze`d, built outside React in `boot/session.ts`. **Rule: `SessionContext` holds
only stable references; every mutable value lives in the store.** A context whose identity
changes re-renders every consumer, and at Ink's ~30fps with a full Yoga reflow that is how
you get an unusable app.

### `NexGateway` — the only importer of core

Panes never touch `TableAPIRequest`, `SchemaDiscovery`, `FlowManager`. The gateway:

- Memoizes one manager per session (per-scope for `BackgroundScriptExecutor` and
  `FlowManager`, which take a scope in the constructor).
- Owns the `response?.data?.result ?? response?.bodyObject?.result ?? []` unwrap that is
  currently duplicated across command files (`src/commands/query/index.ts:91` and friends).
- Returns normalized DTOs (`RecordPage`, `LogEntry`, `FieldSpec`, …), never core envelopes.
- **Builds pagination core does not have**: `sysparm_offset` + `sysparm_limit` through
  `TableAPIRequest.get`'s passthrough params bag, `hasMore = rows.length === limit`, plus
  `AggregateQuery.count()` on the same query so the status bar can say `1–25 of 412`.
- Owns disposal.

### Cancellation — be honest about what this is

Core has **no `AbortSignal`, no async iterators, no EventEmitter**. The only cancellation
primitives in the entire API are `SyslogReader.stopTailing()` and `FlowManager.cancelFlow()`.

So this is **stale-response dropping, not cancellation**: `data/request-token.ts` +
`use-async-resource.ts` keep a `useRef` sequence, capture `const token = ++ref.current` per
run, and drop anything that settles against a stale token. The request still completes and
still costs the instance a transaction. The real mitigation is **debouncing at the input
edge** — 250ms on the query bar, 150ms on list-cursor→detail. Adding `AbortSignal` to
`now-sdk-ext-core` is the correct upstream fix and should be filed there; per `CLAUDE.md`
("Add capability there, expose it here") that is where it belongs.

### Cache (`data/cache.ts`)

TTL + LRU, modelled on the existing `scopeCache` in `src/common/scope-autocomplete.ts:114-136`.

| Key | Source | Policy |
|---|---|---|
| `schema:<table>` | `discoverTableSchema` | session, LRU 32 |
| `choices:<table>.<field>` | `explainField().choices` | session — makes form dropdowns instant |
| `tables:` | `sys_db_object` via TableAPI | 10 min |
| `apps:` | `ScopeManager.listApplications()` | 5 min, invalidated by `setCurrentApplication` |
| `updatesets:` | `listUpdateSets` | 60s, invalidated on any write |
| records | — | **never cached**; store-held per `(table, query, offset)`, dropped wholesale on any write to that table |

Explicit invalidation beats TTL for anything writable. The cache lives on the session, not
in React state, so pane remounts are free.

### The syslog stream — the highest-risk piece

`SyslogReader.startTailingWithChannelAjax({onLog, interval})` fires a callback per record
and returns a promise that only settles at `stopTailing()`. On a busy instance that is
hundreds/sec. A `setState` per log is a render per log; the app locks.

1. **Ingest is not React.** `LogsGateway` writes into a fixed-capacity
   `RingBuffer<LogEntry>` (`--scrollback`, default 5000). Fixed capacity is what bounds
   memory — there is no virtual scroll to save you.
2. **Filter on ingest** with `LogFilterService.matchesFilters` from
   `src/services/log-filter.service.ts`, reused verbatim. Raw entries stay in the ring; the
   view is a separate index array, so changing a rule re-derives without refetching.
3. **React subscribes to a version counter, never to data.** `use-stream-buffer.ts` runs a
   100ms (10Hz) interval and bumps `version` only if the ring moved. Render rate is capped
   at 10fps regardless of ingest rate.
4. `LogStream` renders only the visible window via `Viewport`, reading the ring by index.
   Cost is O(visible rows).
5. **Follow mode**: pinned to tail scrolls; any upward scroll auto-pauses and version bumps
   only update a `+312 new ↓` badge. `G`/`End` resumes.
6. Drop boundaries render as a visible `─── 1,204 lines dropped ───` marker, never silently.
7. **Do not use Ink's `<Static>`.** Append-only above the app; incompatible with alt-screen
   plus live filters. It looks like the right answer and is not.

Same hook drives `onProgress` from `cloneUpdateSet`, `queryUpdate`/`queryDelete`, and ATF
polling. One mechanism, four consumers.

---

## 5. Widget layer

**From `@inkjs/ui` as-is:** `Spinner`, `ProgressBar`, `Badge`, `StatusMessage`, `Alert`,
`TextInput`, `ConfirmInput`, `Select`/`MultiSelect`, `ThemeProvider`/`extendTheme`.

**Hand-built, because Ink has none of it:**

- **`viewport-window.ts` (pure) + `viewport.tsx`** — windowing, not scrolling.
  `computeWindow({length, height, cursor, scrolloff})` is a separate pure module
  specifically so it is unit-testable without ink. Renders exactly `height` children plus a
  1-column scrollbar gutter. Every list in the app goes through it.
- **`column-solver.ts` (pure) + `data-table.tsx`** — `solveColumns(cols, availableWidth)`:
  fixed widths first, distribute the remainder by `flex`, clamp at `minWidth`, drop lowest
  `priority` columns when narrow. This is exactly what `src/services/*.ts` structurally
  cannot do (`padEnd(30)`, `'─'.repeat(90)`, no `process.stdout.columns` anywhere).
- **`modal-host.tsx`** — Ink has no z-index and no overflow, so overlays **replace the body
  region** while the banner (row 1) and status/hint rows persist. Centre overlay for
  palette/approval/help; bottom sheet for quick prompts (the body viewport shrinks, which is
  free because everything is windowed).
- **`picker.tsx`** — one generic type-to-filter + arrow-select list, reused by the table
  picker, the scope picker, the flow picker and the ATF test picker. **No surface in the TUI
  requires typing an identifier from memory.**
- **`command-palette.tsx` + `palette-score.ts` + `commands/registry.ts`** — `^K`. A ~40-line
  pure subsequence scorer, no dependency.
- **`use-keymap.ts` + `keymap/scope-stack.ts`** — a scope stack
  (`modal > palette > editor > pane > global`) and **exactly one `useInput` in the whole
  app**, in `app.tsx`, dispatching to the top-most enabled scope; handlers return `'pass'`
  to bubble. Multiple `useInput` handlers all fire in Ink — that is a guaranteed source of
  "Esc did three things".
- **`text-buffer.ts` (pure) + `editor.tsx`** — see §7.
- **`instance-banner.tsx`, `status-bar.tsx`, `hint-bar.tsx`, `toast-host.tsx`.**

**One registry, one source of truth.** Every binding is
`{id, keys, context, pane, label, group, risk, when(state), run(ctx)}`. The hint bar, the
`?` help sheet, the palette and `nex tui --json` all derive from it, so the hints cannot
disagree with reality and user rebinding is a config file over the same schema.

**Not in v1:** mouse (`@zenobius/ink-mouse` — capture breaks tmux scrollback and text
selection for zero new capability, since everything is keyboard-reachable anyway), inline
images, charts.

---

## 6. Screen model and keymap

### Chrome

```
row 1     BANNER   env badge · alias · resolved host · user · scope · update set · net
row 2     TABS     pane switcher + breadcrumb
rows 3-28 BODY     active pane; overlays replace this region
row 29    STATUS   counts, in-flight spinner, last result (auto-clears 6s)
row 30    HINTS    bindings for the currently focused widget
```

```
 DEV │ dev-acme  acme-dev.service-now.com │ admin │ scope x_acme_core │ set Sprint 24.3 ● │ net ●
 ▎Records▕  Logs   Scripts   Ops                        incident · 1–25 of 412 · display values
──────────────────────────────────────────────────────────────────────────────────────────────────
 table  incident                                                                     [t] change
 query  active=true^priority<=2^ORDERBYDESCsys_updated_on                    [/] edit   ✔ 412 rows
──────────────────────────────────────────────────────────────────────────────────────────────────
     number      updated ▾   pri  state         assigned_to    short_description
 ▸   INC0010023  2m           ▲1  In Progress   A. Rivera      Email gateway rejecting outbound
     INC0010019  14m          ▲1  New           —              VPN drops for EMEA users
 ✔   INC0010004  1h            2  On Hold       J. Chen        SAP interface latency > 4s
 ✔   INC0009987  3h            2  In Progress   A. Rivera      Printer queue stuck on FL3
──────────────────────────────────────────────────────────────────────────────────────────────────
 2 selected · page 1/17 · limit 25 · fetched 10:41:58        [n] next   [p] prev   [g] top
 ↑↓ move  ⏎ open  x select  / query  t table  c cols  b bulk  ^K palette  ? help
```

The banner is the answer to the classic ServiceNow mistake. **Host is always shown, never
just the alias** — aliases are the thing that gets mixed up. `set Default ⚠` carries a
permanent warning glyph, because writing config into Default is the second-classic mistake.
Env class is per-alias config; `unknown` is treated as `prod` for every safety decision, so
a brand-new alias is maximally protected.

Breakpoints via `useTerminalSize()`: ≥120 allows split list/form; 100–119 is the reference
layout; 80–99 drops the user field, abbreviates tabs, sheds columns by priority; 60–79 is a
two-line card list; below 60×20 refuses to start. **No component may contain a hardcoded
width** — that is the concrete lesson from `src/services/`.

### Modality: focus-derived, no global modes

No vim normal/insert, no leader key. Mode is a property of the focused widget: a text
widget has a visible caret and swallows printable keys; a non-text widget has no caret and
single keys are commands; Ctrl-chords are global in both.

The failure mode of vim modality is being in the wrong mode and not knowing it — survivable
in an editor, unacceptable where `b` starts a bulk operation. When a *list* is focused there
is no caret, so a global insert mode would be invisible. Focus-derived modality always has
an unambiguous signal: the caret is in the box, or it isn't. `vim_keys: true` in config adds
`hjkl`/`gg`/`G`/`^D`/`^U` as command-context **aliases** only; `j`/`k` are on by default.

An unbound printable key flashes `‹z› isn't bound here — ^K for commands, ? for the keymap`
rather than no-opping. Every dead keystroke teaches.

**Globals (fire everywhere, including inputs):** `^K` palette · `^G` goto record
number/sys_id/`table:sys_id` · `^O` back · `^R` refresh · `^S` save · `^E` execute ·
`^L` contextual "logs for this" · `^N`/`^P` history ring · `^C` cancel, twice quits ·
`Esc` step out (close overlay → blur input → clear selection → pop nav stack; never quits) ·
`?` help.

**Command context:** `1-5` pane — `5 Project` present only inside a Fluent project; pressing
the active pane's digit cycles its sub-tab, so Ops needs no extra keys · `↑↓jk` · `g`/`G` ·
`^F`/`^B` viewport page · `n`/`p` **API** page
(the one that costs a round trip) · `⏎` open · `Space` pane-defined · `x`/`X`/`-` select ·
`/` search · `t` table/test picker · `c` columns · `f` filter rules · `e` edit · `o` open
reference · `a` aggregate · `b` bulk · `r` related · `h` history · `y` copy submenu
(`y s` sys_id, `y n` number, `y u` URL, `y j` JSON, `y q` encoded query) · `q` close/quit.

**Deliberately not bound to any key: switch instance.** One keystroke that repoints the
session at a different instance is precisely the mistake this design exists to prevent.
Palette-only, and it clears all session approvals and staged edits.

---

## 7. Panes

### 7.1 Records

**List** (default) → **Form** (`⏎`, full-screen — a ServiceNow form at 60 columns is
unreadable) → **Split** (`^\`, ≥120 cols only, auto-collapses when narrowed).

| When | Load |
|---|---|
| Table picker opened | `sys_db_object` (name, label, super_class), cached 24h per alias |
| Table selected | `SchemaDiscovery.discoverTableSchema` — types, mandatory, read-only, max_length |
| Field first edited | `SchemaDiscovery.explainField` → choices, lazy per field |
| Query run | one GET: `sysparm_query`, `sysparm_limit`, `sysparm_offset`, `sysparm_fields`, **`sysparm_display_value=all`** |
| In parallel | `AggregateQuery.count` on the same query → fills `of 412`, renders `of ?` until it lands, never blocks |
| Row opened | second GET by sys_id, no `sysparm_fields`, `display_value=all` |

`sysparm_display_value=all` is load-bearing: it returns `{value, display_value}` per field,
so the TUI can show the label while colouring by the internal value (`state=2` → cyan
"In Progress"). Neither `true` nor `false` alone permits that — which is why the CLI's
`--display-value` boolean is not enough for a UI.

**Auto-refresh is off.** A list that reorders under a selection is how you bulk-update the
wrong 25 records. After 60s the footer marks the fetch `stale`; `^R` is explicit.

Editing: `e` stages a field change locally (dirty marker), `^S` saves via
`TableAPIRequest.patch` through the approval path. Field controls come from
`shape/schema-field.ts`'s `fieldControlKind(type)`. Related lists in v1 are derived from
reference fields — not `sys_relationship` definitions — so the pane never lies about what
it is showing.

Task verbs (`assign`/`comment`/`resolve`/`close`/`approve`) map onto `TaskOperations` and
appear in the palette and as form actions.

### 7.2 Logs

```
  Records  ▎Logs▕  Scripts   Ops                  ⏺ FOLLOW · 4,120 / 8,192 · 12/s · since 09:12:04
──────────────────────────────────────────────────────────────────────────────────────────────────
 rules   message CONTAINS_CI x_acme  ·  level NOT_EQUALS 3                    [f] edit   2 active
──────────────────────────────────────────────────────────────────────────────────────────────────
 10:41:58.221  ERR  x_acme_core.MailProbe     Outbound relay refused: 550 5.7.1 sender denied  ⇱
 10:41:57.102  ERR  Evaluator                 NullPointerException at line 42 of
                                              script include AcmeMailUtil                    ⇱
 10:41:55.410  INF  x_acme_core.SyncJob       synced 240 records for incident 9c5fa0e1b841…  ⇱
 ─── 1,204 lines dropped (buffer full, oldest first) ────────────────────────────────────────────
──────────────────────────────────────────────────────────────────────────────────────────────────
 ⏺ FOLLOW · poll 1.0s · buffer 4,120/8,192 · 2 rules hiding ~61%              [w] write to file
 ↑↓ scroll  Space pause  / find  f rules  ⏎ expand  o open ref ⇱  ^G goto  ? help
```

**Rules (`f`) exclude lines; find (`/`) highlights and jumps.** Rules apply to incoming and
buffered and persist per alias; find is buffered-only and per session. The rules editor is
the CLI's `--filter` syntax with operator completion, so `y r` yanks a working
`nex log -f "…"` line. `2 rules hiding ~61%` is in the footer because an over-aggressive
rule that hides the line you're hunting is otherwise invisible.

`⇱` marks lines with a navigable reference; `o` opens a picker (or jumps directly if there
is exactly one). Detection is a small ranked ruleset: 32-char hex → sys_id; `[A-Z]{2,5}\d{7,}`
→ record number via `TaskOperations.findByNumber`; `table:sys_id`; a `source` matching a
script artefact → open `sys_script_include`/`sys_script` by name, or `CodeSearch`;
transaction lines → open that table's list.

Keyword highlighting (the existing `highlightKeywords`) is **kept but demoted** to underline
on `INF` lines only — when the level column already carries colour, a second colour system
fighting it is noise. Deliberate change from the CLI formatter.

### 7.3 Scripts

**Re-evaluated per your note.** A pure REPL loses the ability to edit earlier lines, which
is fatal for real background scripts; a pure buffer loses the iterative rhythm that makes
the current `nex exec` REPL pleasant. The answer is a **notebook**: a persistent editable
buffer on top, an append-only run transcript below, and a one-key escape to a real editor.
That is the REPL loop *plus* full editing, and it is what makes this the most robust local
surface in the tool.

```
  Records   Logs  ▎Scripts▕  Ops                    x_acme_core · cleanup.js · 34 lines · run #4
──────────────────────────────────────────────────────────────────────────────────────────────────
 scope  x_acme_core ▾   params  {"days":"30"}       ^E run   E editor   ^O open   ^S save   h hist
──────────────────────────────────────────────────────────────────────────────────────────────────
   1  var gr = new GlideRecord('incident');
   2  gr.addEncodedQuery('active=true^priority=1');
   3  gr.setLimit(10);
   4  gr.query();
   5  while (gr.next()) {
   6    gs.info(gr.getValue('number'));▏
   7  }
──────────────────────────────────────────────────────────────────────────────────────────────────
 run #3  10:41:02  x_acme_core  ✔ 1.9s                                            ⏎ recall  y copy
   INC0010023
   INC0010019
 run #4  10:43:51  x_acme_core  ▶ running…
──────────────────────────────────────────────────────────────────────────────────────────────────
 ↑↓ move  ^E run  ^Z undo  Tab indent  s scope  p params  ^L logs for this run  ? help
```

- **Buffer** (`text-buffer.ts`, pure, non-React): cursor motion, `Home`/`End`, `^A`/`^E`,
  word motion, `Tab` → 2 spaces, undo/redo (snapshot stack, 100 deep), bracket auto-close,
  and a per-visible-line regex tokenizer for keywords/strings/comments and the
  `GlideRecord`/`GlideAggregate`/`gs.*` family. Only visible lines are tokenized, so cost is
  bounded by viewport height. **Bracketed paste is non-negotiable** — without parsing
  `[200~ … [201~`, pasting a 200-line script arrives as 200 keystrokes and the
  editor is unusable. Autosave a draft every 2s so a crash never loses work.
  Out of scope: multi-cursor, block select, find/replace, folding, LSP.
- **Pop out (`E`)** — flush to `$XDG_RUNTIME_DIR/nex-tui/scratch-<n>.js`, leave alt screen,
  disable raw mode, unmount, `spawnSync(editor, [path], {stdio: 'inherit'})`, re-enter,
  reload, restore cursor by line. Resolution order `$VISUAL` → `$EDITOR` → detected
  `cursor --wait` / `code --wait` / `vi` / `nano`, and the picker offers whichever are on
  `PATH`. `^O` opens an existing file into the buffer.
- **Transcript** — each run records `{script, scope, params, startedAt, duration, status,
  lines}`. `⏎` on a transcript entry recalls that script into the buffer (this is the REPL
  affordance, without losing editability); `y` copies it; `^L` opens the Logs pane bounded
  to that run's window. `BackgroundScriptExecutor.executeScript` returns
  `result.scriptResults` **once at the end**, not as a stream — so the pane does not pretend
  to stream; it shows a spinner and, in parallel, subscribes to syslog bounded by run start
  and `created_by = me`, interleaving those lines into the entry. That interleave is the
  feature the CLI cannot offer.
- **Scope toggle (`s`)** — per your note, **no typing a scope name from memory**. A
  `picker.tsx` over `ScopeManager.listApplications()` (with the `sys_app`/`sys_scope` query
  behind it), 5-min cached exactly like `getCachedScopes()` in
  `src/common/scope-autocomplete.ts`: type to filter, arrow keys to move, `⏎` to select,
  `global` pinned first. Recently-used scopes float to the top per alias.

  **Subtlety to get right:** the scope passed to `BackgroundScriptExecutor(instance, scope)`
  is a per-run client-side choice. It is *not* `ScopeManager.setCurrentApplication()`, which
  mutates server-side session state and affects everything else you do. The Scripts pane
  toggle changes only the former; the banner's `scope` field reflects the latter, and
  changing it is a separate, approved `write:context` action. Conflating them would be a
  genuinely confusing bug.
- **Params** reuse `ScriptParameterService.applyParameters` from
  `src/services/script-parameter.service.ts` unchanged.

### 7.4 Ops — Flows / ATF / Update Sets

Three sub-tabs, cycled by pressing `4` again.

- **Flows** — `sys_flow_context` list (state, flow, started, duration, source record) →
  `⏎` opens the action-by-action tree from `FlowManager.getFlowContextDetails`, sorted by
  `operationsCore.order`, with inputs/outputs expandable per step and errors inline.
  `l` = `getFlowLogs`, `^L` = syslog bounded by the context window, `o` on a step opens the
  record it touched (step outputs carry `{value, displayValue}`), `c` = `cancelFlow`,
  `m` = `sendFlowMessage`, `r` = run a flow/subflow/action via a picker + inputs form.
- **ATF** — pick a test or suite via `picker.tsx` (no typing sys_ids), run, and poll. Use the
  **non-`AndWait`** variants so the `{links:{progress:{id,url}}, percent_complete, status}`
  payload drives a live `ProgressBar` and a per-test pass/fail list, rather than blocking on
  `executeTestSuiteAndWait`. `l` on a failure opens syslog bounded to that test's window;
  `o` opens the `sys_atf_test_result` record, whose related lists reach the step results.
- **Update Sets** — current set (prominent, with the `Default ⚠` warning), list, contents
  from `inspectUpdateSet` grouped by component type, `⏎` on a content row opens the changed
  record (`sys_update_xml` carries target table + sys_id), `create`, `clone` (streaming
  `onProgress` through `use-stream-buffer` into a progress bar), `move` records, and switch
  current set. Switching is a `write:context` action — the approval body must say *"all
  subsequent changes this session will be captured in X"*.

### 7.5 Project — the now-sdk surface

`nex` covers instance and runtime operations. `@servicenow/sdk` ("now-sdk", the Fluent SDK)
covers the other half: the local project → instance pipeline. Running `nex tui` inside a
Fluent project directory should show both.

This is cheap to reach because **`@servicenow/sdk@4.9.2` is already a direct dependency of
this CLI** and ships bins `now-sdk` / `sdk` → `bin/index.js`. Resolve it deterministically
rather than trusting `PATH`:

```ts
const req = createRequire(import.meta.url)
const pkg = req.resolve('@servicenow/sdk/package.json')
const bin = path.join(path.dirname(pkg), JSON.parse(fs.readFileSync(pkg)).bin['now-sdk'])
```

Prefer a project-local `node_modules/.bin/now-sdk` when one exists and its version differs —
the project's pinned SDK is the authority for that project — and show which one is in use.

#### Spawn, don't import

`@servicenow/sdk-cli` is a **yargs + `@inquirer/prompts`** CLI. `dist/auth/index.js` is
already deep-imported at `src/common/authenticated-command.ts:4`, but that is one function;
there is no supported programmatic API for the subcommands, and `@inquirer/prompts` inside
an Ink process means two things fighting over stdin and raw mode. So the SDK is always a
**child process**, in one of two modes:

- **Streamed** — non-interactive runs (`build`, or any command whose flags are fully
  supplied). `spawn` with piped stdio, lines fed through the same `use-stream-buffer` the
  log pane uses, rendered in `run-output.tsx`. Exit code drives the status glyph.
- **Foreground handoff** — anything that prompts. `boot/foreground.ts` unmounts Ink, leaves
  the alt screen, restores raw mode, `spawnSync(..., {stdio: 'inherit'})`, then re-enters
  and re-mounts. **This is the same primitive as the `$EDITOR` pop-out in §7.3** — build it
  once in Phase 4 and both callers use it.

#### Generic command enumeration

Per your decision, the pane exposes everything the SDK offers rather than a curated four.
A **checked-in manifest** (`data/sdk-manifest.ts`) describes each command: name, summary,
flags (name, type, required, choices, default), `interactive` (needs handoff), and a
`risk` classification. At runtime the pane reads the installed SDK version; if it matches the
manifest, render from it, otherwise **fall back to parsing `now-sdk <cmd> --help` live** and
render best-effort.

The manifest is not laziness — it carries what help text cannot:

> **You cannot derive "this mutates a production instance" from a yargs help string.**
> `install` pushes to the instance; `build` does not. Risk classification has to be declared,
> and **any command not in the manifest defaults to always-ask**, non-rememberable.

`flag-form.tsx` renders a form over the flag list (text, boolean, choice via `Picker`), with
the assembled command line shown verbatim above the run button so there is never a question
about what is about to execute — and `y` copies it as a runnable shell command.

Approval mapping: local-only commands (`build`, `version`, `dependencies` read paths) need
none; commands that write local files (`transform`, `convert`, `init`) confirm overwrites;
anything that reaches the instance (`install`, `dependencies` install paths, `upgrade`) is
**always-ask**, in the same tier as `xml import` and app install.

#### Project detection

Walk up from `process.cwd()` for `now.config.json`; corroborate with a `package.json`
depending on `@servicenow/sdk`. Read scope, name, version and source dirs from the config.
`@servicenow/sdk-project` exists in the tree and parses this properly, but only as a
**transitive dep at 3.0.3 while the direct SDK line is 4.9.2** — take the version skew as a
reason to read the two files directly rather than binding to an unversioned internal.

Outside a project the pane is hidden entirely (not shown-and-broken) and `nex tui` behaves
exactly as it does today. Inside one, the header gains the project identity and the tab
strip gains `5 Project`.

#### The `--cred-store` trap

`bin/credstore-boot.js` installs the sn-credstore keyring shim **in this process only**, via
a dynamic `import('@sonisoft/sn-credstore/register')`. A spawned `now-sdk` inherits none of
that: it would fall back to the OS keyring, which in a headless session reports "no
credentials" rather than failing loudly — the exact silent failure
`AuthenticatedCommand.failAuth()` exists to explain.

So `sdk.gateway.ts` must build the child environment deliberately: propagate
`SN_CRED_STORE_*`, and when `NOW_SDK_KEYCHAIN_PATCHED === '1'` add the register module to
the child's `NODE_OPTIONS` so the shim installs there too. Pass `--auth <alias>` through so
the SDK targets the instance in the banner — the SDK's credential store *is* the store
`getCredentials()` reads, so the alias is already shared. Verify this against a file-backed
store (`SN_CRED_STORE=file`, `SN_CRED_STORE_PATH` to a temp dir) per `AGENTS.md` rule 2, and
confirm the redirect took effect rather than assuming it did.

#### Cross-pane payoff

Build errors carry `file:line` → open in `$EDITOR`. After `install`, jump to the update set
it produced, or tail syslog for the install window. `transform` output lists the records it
pulled → open them in Records. This adjacency is the whole argument for the pane.

> **Unverified here:** `node_modules` is not installed in this checkout, so the actual
> subcommand and flag surface of now-sdk 4.9.2 could not be enumerated. Generating the
> manifest from `now-sdk --help` and each subcommand's `--help` is the first task of the
> phase, and its output may change the shape of `flag-form.tsx`.

---

## 8. Write model — per-action approvals

Per your note, this follows the Claude Code / Cursor permission model rather than a
session-arming model: **every write asks, and you can teach it to stop asking for the safe,
repetitive things.**

### The prompt

Every write goes through `useApproval()` → `approval-dialog.tsx`. Focus starts on **No**.

```
      ┌── APPROVE WRITE ────────────────────────────────────────────────────────┐
      │ ▌ PROD ▐   prod-acme     https://acme.service-now.com                   │
      │            as c.nanda    scope global    update set  Default  ⚠         │
      ├─────────────────────────────────────────────────────────────────────────┤
      │  bulk update  ·  table incident                                         │
      │                                                                         │
      │  match   sys_idIN 9c5fa0e1…, 7b12c440…, +23 more                        │
      │          ⓘ explicit id list captured from your selection at 10:43:51    │
      │  set     priority = "3"                                                 │
      │                                                                         │
      │  dry run at 10:44:02   →   25 records would change,  0 errors           │
      │     INC0010023   priority  1 → 3                                        │
      │     INC0010019   priority  1 → 3                                        │
      │     … 22 more                                     [v] view all 25       │
      ├─────────────────────────────────────────────────────────────────────────┤
      │  Type the instance alias to approve:    prod-acme                       │
      │  ❯ prod-ac▏                                                             │
      │                                                                         │
      │   [n] No        [y] Yes, once        ( typed approval required )        │
      └─────────────────────────────────────────────────────────────────────────┘
```

The body order matches the order of the mistakes people actually make: **which instance**,
**as whom**, **into which scope and update set**, then the operation, then how the target set
was chosen, then the dry run, then a before → after sample.

### Approval choices

| Key | Meaning |
|---|---|
| `n` / `Esc` | No |
| `y` | Yes, this once |
| `a` | Yes, and don't ask again for **this action kind on this alias** for the rest of the session |
| typed | For the always-ask tier: type the instance alias exactly; Yes stays disabled until it matches |

`a` is scoped to `(actionKind, alias)` and held **in memory only** — never written to disk,
and cleared on instance switch. `nex tui --approve-all` pre-approves everything for a dev
loop (mirrors Claude Code's bypass mode) and **refuses to engage on `prod`/`unknown`**.
`nex tui --read-only` refuses all writes outright.

### Tiers

| Tier | Operations | Behaviour |
|---|---|---|
| **none** | all reads; staging a local field edit; columns, filters, follow | no prompt |
| **remember-able** | single-record `patch`/`put`, `addComment`, `assignTask`, `resolveIncident`, `closeIncident`, `approveChange`, `executeScript`, `executeFlow`/`Subflow`/`Action`, `testFlow`, ATF runs, `setCurrentUpdateSet`, `setCurrentApplication`, `createUpdateSet`, `attachment upload` | `y` / `a` / `n` |
| **always-ask** | `queryUpdate`, `queryDelete`, `batchCreate`/`batchUpdate`, `moveRecordsToUpdateSet`, `xml import`, app/store install/uninstall, anything affecting > 25 records, **anything at all on `prod`/`unknown`** | no `a` option; typed alias challenge |

### Enforcement is structural, not remembered

```ts
declare const brand: unique symbol
export type ApprovalToken = {readonly [brand]: 'approval'; specHash: string}
```

Every gateway write **requires** a token: `gateway.records.update(sysId, patch, token)`.
Tokens are branded, single-use, carry a hash of the approved spec, and are minted **only**
by `ModalHost` on approval (or by the session-approval memory for a matching
`(actionKind, alias)`). A component cannot call a write without having gone through the
approval path — the type system says no. Read-only mode throws in the gateway, not by
hiding UI. ~30 lines, and it is the difference between "we remembered to ask" and "we cannot
forget".

### Dry run *is* the dialog

Core's `queryUpdate`/`queryDelete` take `confirm: boolean`; `false` returns
`{dryRun: true, matchCount, …}`. There is **no path to execution that does not pass through
the dry run**, because the dry run is the dialog's body. On approval the dry run **re-runs**;
if `matchCount` moved, abort and re-show — closes the TOCTOU window for free. Execution
streams `onProgress` into a progress bar; `^C` aborts after the current record and reports
partial completion as partial, never as failure.

### Bulk targets ids, not queries

A bulk operation started from the Records pane always rewrites to `sys_idIN<explicit list>`,
captured at selection time. The affected set is exactly the rows you looked at; the dry-run
and execution counts cannot diverge; the dialog can show a real before → after per record.
Over ~100 ids it chunks into batches under one approval. Running against a live query is
still possible via the palette builder, labelled `⚠ live query — the affected set may change`.

### Mis-targeting defences

Env class per alias (default `unknown`, treated as `prod`) · persistent inverse-red banner
for the whole session on prod · always-ask + typed alias on prod · instance switching is
palette-only and clears approvals and staged edits · the dialog prints the resolved host from
`instance.getHost()` — the same object that performs the write, so preview and execution
cannot target different instances · no "repeat that on another instance" affordance anywhere.

---

## 9. Sharing with the CLI — `src/services/shape/`

Three buckets. Named files, no hand-waving.

**A — reuse verbatim, zero changes.** Already pure logic, not formatting:
`src/services/log-filter.service.ts` (`parseFilter`, `matchesFilters` — the TUI filter bar
produces the same `FilterRule[]` and ingest calls the same predicate);
`src/services/script-parameter.service.ts` (`applyParameters`);
`app-display.service.ts:filterApps()`; `atf-result-formatter.service.ts:buildExecutionOptions()`.

**B — extract into `src/services/shape/`, both layers consume it.** The existing service
methods are rewritten to call the new modules, so there is exactly one definition of "what
matters":

- `shape/record-columns.ts` → `chooseRecordColumns(rows, table): ColumnSpec[]`. Today that
  decision is inline in `query-display.service.ts:formatTableResults`
  (`Object.keys(records[0]).filter(k => k !== 'sys_id').slice(0, 6)` plus min-10/max-30
  math). Extract the **column choice** — which fields, order, headers, priority — and leave
  the **padding** in the service. The TUI takes `ColumnSpec[]` and runs its own responsive
  solve. Extend with a per-table preferred-column map (`incident → number,
  short_description, state, priority, assigned_to`); the CLI benefits too.
- `shape/log-entry.ts` → `toLogEntry(raw)` and `classifySeverity(message)`. Today that
  classification is an if/else chain inside `log-formatter.service.ts:formatLog`
  **entangled with chalk calls**. Extract the *decision*, leave the *painting*: `formatLog`
  maps severity → chalk, the TUI maps severity → theme token. This is the model for the
  whole bucket.
- `shape/schema-field.ts` → `toFieldSpec(field)` and `fieldControlKind(type)`.
- `shape/update-set.ts`, `shape/flow-report.ts`, `shape/atf-result.ts`, `shape/bulk-result.ts`
  — normalize the loose `any` shapes core returns into typed records.

**Hard constraint:** do not change any `format*(…, jsonOutput): string[]` signature or its
output bytes. The 21 files in `test/services/` assert on substrings of exactly that output —
keep it byte-compatible while swapping internals and those tests become the regression net
for the extraction. That is the whole reason to do it this way.

`shape/` lives under `src/services/` (not `src/tui/`) so `test/services/shape/*.test.ts`
matches the existing `test:unit` path pattern with zero config change, and so the CLI is
forced to actually consume the shared code rather than letting the two layers drift.

**C — do not reuse.** All 21 `format*(): string[]` methods. They emit fixed
`'─'.repeat(90)` rules and `padEnd(30)` columns that wrap at any other width; they carry a
`if (jsonOutput) return [JSON.stringify(...)]` branch meaningless in a UI; and the output is
opaque strings, so the TUI could not highlight a row, colour a cell, or truncate per column.
**Never render a service's `string[]` inside `<Text>`.** `log-formatter.service.ts:formatHeader`
is obsoleted entirely by the banner.

---

## 10. Visual language

Semantic tokens only in `ui/theme.ts` — no component references a raw colour:
`fg.default`/`fg.muted`/`fg.accent`, `state.ok|warn|error|info|running|pending`,
`edit.dirty|mandatory|readonly`, `env.dev|test|prod|unknown`, `sel.row`, `cursor.row`.

`ui/glyphs.ts` standardises the vocabulary. The codebase currently mixes `✔`/`✘`
(flow, bulk, health, xml), `✓`/`✗` (script-sync) and literal `✓`/`✗` (atf,
code-search, app, exec). **Settle on U+2714 `✔` / U+2718 `✘`** — the existing plurality, and
visually heavier at terminal font sizes. Also `⚠ ● ○ ◐ ▶ ⏸ ⏺ ⏳ ▲ ▸ ▾ ⇱ · — … ▮ ▯`, each with
an ASCII fallback (`[OK]`, `[XX]`, `[!]`, …) selected by `--ascii`, `TERM=dumb`, or a
non-UTF-8 locale — independently of `NO_COLOR`.

ServiceNow value mapping: priority 1/2 → error + `▲`, 3 → warn, 4/5 → default/muted;
incident state New → info, In Progress → running, On Hold → warn, Resolved/Closed → ok/ok-dim,
Canceled → muted; `active=false` → whole row muted; flow states reuse the existing
`_stateIcon` mapping in `flow-display.service.ts`; syslog levels reuse `_mapLogLevel`.

**Colour is never the sole carrier.** Every state also has a glyph, a label, or both — the
cursor row is `▸` *and* bold, selected rows get a `✔` gutter — so `NO_COLOR` is a degradation
rather than a loss, and red/green deficiency doesn't cost information. Under `NO_COLOR` the
prod banner keeps `▌ PROD ▐` at both ends of the row in inverse, so the most safety-critical
signal never depends on colour.

---

## 11. Testing

**The trap:** `test:unit` is `--testPathPattern='(services|common)'`, `test:integration` is
`'commands'`, and CI runs only `build` + `test:unit`. A file at `test/tui/**` runs in **no
job**. Fix: change the pattern to `'(services|common|tui)'`. Do not hide TUI tests under
`test/services/` — it works by substring accident and lies about what they are.

**Tier 1 — pure, no ink, no React (~70% of the value).** Ordinary jest ESM tests, the same
shape as the existing service tests:
`text-buffer` (insert/delete/undo/word motion/paste/tabs) · `viewport-window` (every
boundary, scrolloff, follow) · `column-solver` (60/80/120/200 cols, flex, minWidth, priority
dropping) · `ring-buffer` (wraparound, drop counting) · `request-token` (out-of-order settle
drops the stale response) · `cache` (TTL, LRU, invalidate-on-write) · `scope-stack`
(top-scope dispatch, `'pass'` bubbling) · `palette-score` · `approvals` (tier classification,
session memory scoping, `--approve-all` refusing on prod) ·
`gateway` against the **existing** `test/__mocks__/@sonisoft/now-sdk-ext-core.ts`, asserting
the `sysparm_*` built, the dual-shape unwrap, pagination offsets, and critically that
**writes throw without an `ApprovalToken` and throw in read-only mode** ·
`test/services/shape/*` (runs today with zero config change).

**Tier 2 — `ink-testing-library`, ~15 files max.** `render()` → `lastFrame()` substring
assertions, `stdin.write('[B')` for keys. Scope: viewport scrolling, modal focus
stealing, **the typed-alias challenge gating Yes**, banner content, hint-bar derivation from
the registry. Assert on **substrings, not layout** — the convention `test/services/*.test.ts`
already follows, and the only thing that survives a theme change.

> **Phase-0 gate, flagged loudly:** ink 7 + jest ESM (`--experimental-vm-modules`) +
> `yoga-layout` (wasm) is the single most likely thing not to work on day one. Get **one
> trivial `ink-testing-library` test green in this exact jest config before writing any UI**.
> If it can't go green in a day, fall back to Tier 1 only and move component checks to
> manual — but discover that in week 1, not week 6.

**Tier 3 — smoke.** `test/commands/tui/*.integration.test.ts` for the `--json` descriptor.
But put the **non-TTY guard test under `test/common/`** so it runs in CI — it needs no
instance, and "does `nex tui` refuse cleanly when piped" is exactly the regression that
breaks people's scripts.

`npm run build` in CI now typechecks the whole TUI; that is the real `.tsx` regression gate
and it is already wired. Not tested, admitted openly and written up in
`docs/tui-manual-checks.md`: terminal restoration on SIGKILL, alt-screen under tmux and
Windows Terminal, real render throughput.

---

## 12. Phasing

**Phase 0 — de-risk the toolchain, zero product code (~2 days).** Everything here is
required and everything here can fail.
1. `npx tsc --noEmit` baseline.
2. Flip `moduleResolution: "Bundler"` + add `jsx: "react-jsx"`, re-run **before installing
   ink**. Resolve fallout on `src/common/authenticated-command.ts:2` and
   `src/common/scope-autocomplete.ts:3,5`. Fallback is ambient `declare module` in
   `src/types/`, never `paths`.
3. Install ink/react/@inkjs/ui/@types/react/ink-testing-library; `tsc --noEmit` again.
4. Throwaway `tui.ts` + `index.ts` + `app.tsx` rendering "hello" in the alt screen. Verify:
   `npm run build` passes; `dist/tui/**` is **not** discovered as a command; `./bin/run.js tui`
   works; `./bin/dev.js tui` works or is documented unsupported (ts-node ESM must map
   `./app.js` → `app.tsx` **and** transpile JSX — unverified here); terminal intact after
   `q`, after `^C`, and after `kill -TERM`.
5. eslint `.tsx` block — prove it lints by planting a deliberate error.
6. jest `.tsx` transform + one green `ink-testing-library` test.
7. Separately: bump `@types/node` `^18` → `^24`+ (pre-existing mismatch; it will get blamed
   on the TUI otherwise).

**Exit criteria: build + lint + `test:unit` green on a PR containing no product code.**
Merge on its own.

**Phase 1 — shell + Records, read-only (~1.5 weeks).** Terminal boot/cleanup, stdout
capture, session/context, gateway skeleton + `records.gateway`, cache, request tokens,
`Viewport`+`computeWindow`, `DataTable`+`solveColumns`, `picker.tsx`, keymap scope stack +
registry, banner, status/hint bars, toasts, modal host (help only), and Records:
table picker → query bar → list → read-only form → related lists. Extract
`shape/record-columns.ts` and `shape/schema-field.ts` and refactor
`query-display.service.ts` / `schema-display.service.ts` onto them.

**Phase 2 — Logs (~1 week).** RingBuffer, `use-stream-buffer`, `logs.gateway` over
`SyslogReader`, follow/pause + `+N new` badge, filter rules reusing `LogFilterService`
unchanged, find, `shape/log-entry.ts` extraction, reference detection + `o` jump,
`querySyslog` as the load-older path, `stopTailing()` in the cleanup registry. Highest
re-render risk after Phase 0, and cleanly isolated — hence second.

**Phase 3 — approvals + the write path (~1 week).** `ApprovalSpec`/`ApprovalToken`, the
dialog with `y`/`a`/`n` and the typed challenge, tier classification, session approval
memory, `--read-only` and `--approve-all` enforced in the gateway, record form editing via
`TableAPIRequest.patch`, field controls from cached `explainField` choices, task verbs,
cache invalidation on write, success toasts. **Nothing writes before this merges.**

**Phase 4 — Scripts (~1–1.5 weeks).** `boot/foreground.ts` (the suspend/resume primitive,
built here because both `$EDITOR` and the SDK pane need it), `TextBuffer` + `Editor` +
bracketed paste, `$EDITOR` / `cursor --wait` pop-out, scope picker over
`ScopeManager.listApplications()`, transcript with recall, params panel, syslog interleave
bounded to the run window, run history.

**Phase 5 — Ops (~1.5 weeks).** Flows (list/run/status/details tree/logs/outputs/cancel/
message), ATF (picker + non-`AndWait` polling + live pass/fail), Update Sets (current/list/
inspect/create/clone with `onProgress`/switch/move), scope switcher as a `write:context`
action. All polling reuses `use-stream-buffer`.

**Phase 6 — Project / now-sdk (~1–1.5 weeks).** Generate the manifest from `now-sdk --help`;
project detection and conditional pane; binary resolution with project-local preference;
`sdk.gateway` with streamed and foreground spawn modes and correct `--cred-store` env
propagation; generic flag form + run output; approval mapping; build-error and
post-install cross-pane jumps.

**Phase 7 — bulk, palette, polish (~1 week).** Command palette over the registry, the
two-step bulk wizard, `AggregateQuery.count` in the status bar, aggregate/group-by overlay,
`?` help sheet, `docs/tui.md`, `oclif readme` regeneration, `docs/tui-manual-checks.md`.

Risk ordering: the toolchain (0) can kill the project outright; log-stream render
performance (2) can make it unusable; the approval contract (3) must exist before any write
ships; the editor (4) is the largest hand-built widget; Ops (5) is broad but shallow; the SDK
pane (6) depends on both the approval contract and the foreground primitive, and on a
manifest that cannot be written until the SDK is installed.

---

## 13. Explicitly out of v1

Mouse support · a real code editor (multi-cursor, find/replace, folding, LSP) — `E` gets you
your real editor in one keystroke · a visual condition builder (encoded-query text with
completion covers 95% at 10% of the cost; v1 renders a read-only breadcrumb for legibility) ·
real form layouts from `sys_ui_section`/UI policies/ACL-derived read-only (evaluating those
client-side is a correctness trap — v1 shows dictionary truth and lets the server be the
authority) · configured related lists · filesystem-coupled commands (`attachment`, `xml`,
`app`/`store`, `workflow`, `script-sync`, `batch`) — reachable through palette builders ·
charts/sparklines/images (the aggregate overlay uses text bars `▮▮▮▮▯▯`) · multi-instance
side-by-side (valuable, large, and it multiplies the safety surface — needs its own design
pass) · free-form `nex` execution in the palette (it bypasses the approval path) · rich
journal/HTML rendering · offline record caching (a stale record in a write-capable tool is a
hazard) · forward navigation.

`nex tui` is **not** the accessible path. Ink's `INK_SCREEN_READER` is honoured, but
line-oriented CLI output with `--json` is fundamentally more screen-reader-friendly than any
TUI, and the help text should say so rather than pretend otherwise.

---

## 14. Work breakdown (Jira)

Tracked in project `NEX` ("Now-SDK Extension"). `NEX` has no Story issue type, so stories
are **Task** issues under an **Epic**. Each carries context, scope, acceptance criteria and
the relevant file paths from this plan, plus a `tui` label and a phase label
(`phase-0` … `phase-7`).

**Epic — `nex tui`: a full-screen ServiceNow workspace**

| # | Phase | Task |
|---|---|---|
| 1 | 0 | TypeScript resolution + JSX: `moduleResolution` → `Bundler`, `jsx: react-jsx`, fix the `@servicenow/sdk-cli*` deep imports |
| 2 | 0 | Ink/React dependencies; eslint `.tsx` block with the import-boundary rules; jest `.tsx` transform, coverage glob, `test:unit` pattern |
| 3 | 0 | `nex tui` command skeleton: `AuthenticatedCommand`, TTY guard, `--json` descriptor, alt-screen boot/teardown, stdout capture |
| 4 | 1 | `TuiSession` + `NexGateway` boundary + TTL/LRU cache + request-token stale-response guard |
| 5 | 1 | Responsive widget core: `viewport-window` + `Viewport`, `column-solver` + `DataTable`, generic `Picker` |
| 6 | 1 | Chrome + input: keymap scope stack, single `useInput` router, command registry, instance banner, status/hint bars, toasts, modal host |
| 7 | 1 | Records pane: table picker, encoded-query bar, paged list with `display_value=all` and parallel count |
| 8 | 1 | Records pane: record form + reference-derived related lists (read-only) |
| 9 | 1 | Extract `shape/record-columns.ts` + `shape/schema-field.ts`; refactor `query-display` / `schema-display` onto them, byte-compatible |
| 10 | 2 | Log ring buffer + 10Hz `use-stream-buffer` bridge; `stopTailing()` in the cleanup registry |
| 11 | 2 | Logs pane: follow/pause, filter rules reusing `LogFilterService`, find, drop markers, write-to-file |
| 12 | 2 | Log reference detection (`⇱`) and cross-pane jumps |
| 13 | 2 | Extract `shape/log-entry.ts`; refactor `log-formatter.service.ts` onto it |
| 14 | 3 | Approval model: tiers, branded `ApprovalToken`, session memory, `--read-only` / `--approve-all` enforced in the gateway |
| 15 | 3 | Approval dialog: instance/user/scope/update-set header, dry-run body, before→after diff, `y`/`a`/`n`, typed-alias challenge |
| 16 | 3 | Records write path: staged field edits → `TableAPIRequest.patch`, task verbs, cache invalidation |
| 17 | 4 | `boot/foreground.ts`: suspend/resume the TUI around a child process (shared by `$EDITOR` and now-sdk) |
| 18 | 4 | `TextBuffer` (pure) + `Editor` with bracketed paste, undo/redo, gutter, visible-line tokenizer |
| 19 | 4 | `$EDITOR` / `cursor --wait` pop-out on top of the foreground primitive |
| 20 | 4 | Scripts pane: scope picker over `ScopeManager.listApplications()`, run transcript with recall, params, syslog interleave |
| 21 | 5 | Ops → Flows: context list, action-by-action detail tree, logs, run/cancel/message |
| 22 | 5 | Ops → ATF: test/suite picker, non-`AndWait` polling with live pass/fail, failure → logs/result jumps |
| 23 | 5 | Ops → Update Sets: current/list/inspect/create/clone with progress/switch/move |
| 24 | 6 | Generate `sdk-manifest.ts` from `now-sdk --help` (+ per-subcommand help); declare interactivity and risk per command |
| 25 | 6 | Project detection (`now.config.json` walk-up) + deterministic binary resolution, project-local preferred; conditional pane |
| 26 | 6 | `sdk.gateway.ts`: streamed and foreground spawn modes, `--auth` pass-through, `--cred-store` / `NODE_OPTIONS` env propagation |
| 27 | 6 | Project pane: generic flag form, assembled command-line preview, run output, approval mapping, live `--help` fallback |
| 28 | 6 | Project cross-pane jumps: build error → `$EDITOR`, post-install → update set / syslog window, transform output → Records |
| 29 | 7 | Command palette over the registry + `?` help sheet |
| 30 | 7 | Bulk operations: two-step dry-run wizard, `sys_idIN` targeting, chunking, progress + abort |
| 31 | 7 | Docs: `docs/tui.md`, `docs/tui-manual-checks.md`, `oclif readme`, `CLAUDE.md`/`AGENTS.md` rules for `src/tui/` |

**Jira:** epic [NEX-63](https://jengo.atlassian.net/browse/NEX-63), tasks NEX-64 … NEX-91.
Rows map in order, with three tightly-coupled pairs merged into single issues:
rows 12+13 → NEX-75, rows 19+20 → NEX-81, rows 27+28 → NEX-88.

---

## 15. Verification

```bash
npm run build          # typechecks all of src/tui — the real .tsx gate
npm run lint           # must actually open .tsx files (plant an error to prove it)
npm run test:unit      # now includes test/tui/** via the widened path pattern
npx tsc --noEmit       # bin/ and test/ are outside the build program
```

Manual, per phase, against a **dev** alias only (`AGENTS.md` rule 1 — never run mutating
commands against a real instance to "check something works"):

```bash
./bin/run.js tui --auth dev --read-only          # start read-only
./bin/run.js tui --auth dev --pane records --table incident --query "active=true"
./bin/run.js tui --json                          # capability descriptor, no TTY needed
./bin/run.js tui < /dev/null                     # must refuse cleanly, exit non-zero
echo x | ./bin/run.js tui                        # same
COLUMNS=80 ./bin/run.js tui --auth dev           # narrow layout
cd /path/to/fluent-app && nex tui --auth dev     # Project pane appears
cd /tmp && nex tui --auth dev                    # Project pane absent, everything else works
NO_COLOR=1 ./bin/run.js tui --auth dev --ascii   # degraded rendering
./bin/run.js tui --auth dev --log-level debug    # winston must NOT shred the frame
```

Terminal-integrity checks after each: quit with `q`, quit with `^C^C`, and
`kill -TERM <pid>` from another shell — cursor visible, alt screen exited, raw mode off,
`SyslogReader` stopped (process exits rather than hanging). Repeat inside tmux.

Write-path checks (dev alias, `test:integration` is not run in CI and needs a real instance):
a single field edit prompts and shows the before → after diff; `a` suppresses the next
identical prompt; switching instance clears that memory; a bulk update shows a real dry-run
count and refuses `y` until the alias is typed when the alias is classified `prod`; a gateway
write called without an `ApprovalToken` fails to compile.

Project pane checks (dev alias, inside a Fluent project): `now-sdk` resolves to the
project-local binary when one exists and the pane says which; `build` streams into the pane
and a non-zero exit shows as a failure with the error lines; an interactive subcommand hands
off cleanly and the TUI redraws intact on return; `install` cannot run without an approval;
and — the one most likely to break silently — with `SN_CRED_STORE=file` and
`SN_CRED_STORE_PATH` set to a temp dir, a spawned SDK command resolves credentials from that
file rather than the OS keyring. Confirm the redirect actually took effect
(`nex auth doctor --json` reports the resolved path) rather than assuming it did.
