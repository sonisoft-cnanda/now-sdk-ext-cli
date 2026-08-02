# Building a Rich, Graphical TUI for an oclif TypeScript CLI (2026)

> **Superseded as a decisions record by [`../TUI_PLAN.md`](../TUI_PLAN.md).** This document
> is the technology-selection research that informed it; where the two disagree, the plan
> wins.

## TL;DR
- **Use Ink (React for terminals) as the primary TUI layer**, wired into individual oclif commands. It is the mature, actively maintained (v6.0.0 released May 29, 2026; a v7.x line now at 7.1.1 published ~mid-July 2026; ~38,900 GitHub stars and ~4.2M weekly npm downloads per npm trends) React-based standard, with the deepest component ecosystem (@inkjs/ui, ink-table, ink-spinner, ink-gradient, ink-big-text) and battle-tested adoption (Claude Code, Gemini CLI, GitHub Copilot CLI, Shopify CLI, Prisma, Gatsby).
- **For true graphical richness** (inline images, charts, gauges, sparklines), Ink alone is not enough: layer in `terminal-image`/`term-img`/chafa bindings for Sixel/Kitty/iTerm2 images, and either build custom Ink chart components or keep a **blessed-contrib** dashboard behind a separate command. **OpenTUI** (Zig-core, GPU/WebGPU-capable, React/Solid/Vue bindings) is the most graphically ambitious newer entrant but is pre-1.0 and effectively requires the Bun runtime, which clashes with a standard Node/oclif CLI — treat it as a runner-up or sidecar, not the default.
- **The key oclif gotchas are ESM and JSX/.tsx discovery**: Ink has been ESM-only since v4 and needs React 19 + Node 20+ as of v6; oclif fully supports ESM since @oclif/core v3, so put the CLI in ESM, keep each `Command` in a `.ts` file that dynamically imports a separate `.tsx` Ink component, and always guard the TUI behind a `process.stdout.isTTY` check with a plain-text/JSON fallback so commands stay scriptable and pipeable.

## Key Findings

### The landscape has consolidated around Ink — but graphics remain a bolt-on
As of mid-2026, the JavaScript/TypeScript TUI ecosystem has a clear center of gravity: **Ink**, the React renderer for terminals, which uses Facebook's Yoga engine for Flexbox layout. It powers the current generation of AI coding agents (Claude Code, Gemini CLI, OpenAI Codex, GitHub Copilot CLI) and major platform CLIs. The trade-off is that Ink targets a conservative "core" terminal baseline — text, 24-bit color, box drawing, Flexbox — and does **not** natively do inline images, charts, mouse, or scrollable viewports. Those require add-on packages or custom components.

The **blessed** family (widget/canvas model) still holds the crown for out-of-the-box dashboards (charts, gauges, maps via **blessed-contrib**) and native mouse/scroll support, but the original `blessed` is unmaintained and even the maintained forks are stale. **OpenTUI** is the exciting newcomer with a native Zig rendering core and genuine graphical ambitions (WebGPU/Three.js renderer, framebuffer rendering — someone literally ported DOOM to it), but it is early-stage and Bun-centric.

### Library-by-library maintenance status

**Ink** — *Actively maintained; recommended.*
- v6.0.0 released May 29, 2026 (its breaking changes: "Require Node.js 20" and "Require React 19"); a v6.8.x line followed, and a **v7 line is now published — 7.1.1, ~mid-July 2026**, which raises the floor to Node.js 22+ and React ≥19.2. Per npm trends, ink 7.0.6 shows ~4.17M weekly downloads and ~38,909 GitHub stars; the npm registry lists 7.1.1 with ~6,768 dependents.
- **ESM-only since v4.0.0** (2023: "This package is now pure ESM").
- Known limitation: Ink has a rendering FPS cap (~30 FPS) and no built-in scrollable-container/overflow support (long-standing issues #222 and #432); teams building chat-style scrollback (Gemini CLI, Qwen Code) have had to build custom virtual-viewport solutions or use forks (e.g. gemini-cli's `@jrichman/ink` fork).

**Ink component ecosystem** — *Healthy but uneven.*
- **@inkjs/ui** (official, by Ink's author): Spinner, ProgressBar, Badge, StatusMessage, Alert, TextInput, PasswordInput, EmailInput, ConfirmInput, Select, MultiSelect, ordered/unordered lists, with a theming system (`ThemeProvider`/`extendTheme`). This is the recommended first stop for standard inputs — latest 2.0.0, stable and widely used (~676 dependents).
- **ink-spinner, ink-text-input, ink-select-input, ink-big-text, ink-gradient, ink-table, ink-testing-library**: the classic à-la-carte components, mostly by the same author/community. ink-table is comparatively less maintained; several are stable-but-quiet.
- **ink-testing-library**: the standard way to assert on Ink output.
- **@zenobius/ink-mouse**: third-party mouse support (click/hover/drag/scroll) — needed because Ink has no native mouse.
- Newer shadcn-style copy-in component collections exist (InkUI, Ink Web) reflecting continued ecosystem energy.

**OpenTUI** (`@opentui/core`, `@opentui/react`, `@opentui/solid`, `@opentui/three`, `@opentui/ssh`, `@opentui/keymap`, `@opentui/qrcode`) — *Very active but pre-1.0; not production-ready by its own statement.*
- Native terminal UI core written in **Zig** with TypeScript bindings over a C ABI; latest ~0.4.5 (Nov 2025), ~12.8K GitHub stars. Built by Anomaly (the OpenCode team). Its README states: "OpenTUI is a native terminal UI core written in Zig with TypeScript bindings … OpenTUI powers OpenCode in production today and will also power terminal.shop."
- Features: Yoga Flexbox layout, tree-sitter syntax highlighting, Text/Box/Input/Select/ScrollBox/Code/Diff components, focus/keyboard handling, first-class React and Solid reconcilers, and a Three.js WebGPU renderer.
- **Critical constraint**: creating a native renderer (`createCliRenderer()`) requires FFI. In practice it targets **Bun**; the OpenTUI docs say on Node.js it needs **Node.js 26.4.0 with `--experimental-ffi`** (plus `--allow-ffi` if using Node permissions). One real project (`luongnv89/asm`) documented replacing OpenTUI with Ink specifically to "drop bun dependency entirely" and run on Node alone. This is the central reason it is not the default recommendation for a Node/oclif CLI.
- Ecosystem (awesome-opentui): tuiparts/opentui-ui component library, cftop, opendocker, ghui, gloomberb (financial terminal), and games. Real but young.

**blessed / neo-blessed / reblessed / blessed-contrib** — *Legacy; use only for dashboard-heavy widgets.*
- Original **blessed**: unmaintained (last real activity ~2016). Rich widget model, terminfo parser, image support, mouse, scrolling, CSR double-buffering.
- **neo-blessed** (embarklabs): the "maintained" fork, but npm shows last publish ~5 years ago (1.0.0) with open issues into 2025 — effectively minimal maintenance.
- **reblessed** and **neo-neo-blessed**: further forks with occasional fixes; small and niche.
- **blessed-contrib**: still the fastest way to get line/bar/stacked-bar charts, sparklines, gauges, donuts, maps, LCD displays, tables, tree views, and rolling logs. Maintained only lightly (community forks like hp4k1h5). Works on top of blessed or neo-blessed.
- **react-blessed** / **react-blessed-contrib** let you drive blessed(-contrib) with React, but these ride on the unmaintained core.

**terminal-kit** — *Semi-maintained; capable but not declarative.*
- Full-featured imperative lib: 256/truecolor, keys & mouse, input fields, progress bars, screen buffer with **32-bit composition and image loading**, text buffer, menus. Per Socket.dev, terminal-kit "receives a total of 104,712 weekly downloads … [and its] last version was released a year ago"; npm lists 3.1.2 (~696 dependents) and it has ~3,279 GitHub stars. TypeScript types via DefinitelyTyped. Good for a from-scratch imperative TUI; poor fit next to React/oclif conventions.

**Prompt-oriented libraries** (not full TUIs, but relevant):
- **@clack/prompts** — modern default for beautiful interactive prompts; ~4KB gzipped, ESM, TypeScript-native, opinionated styling out of the box. Being adopted as the successor to inquirer/enquirer in tools like ESLint's create-config.
- **enquirer** — feature-rich (15+ prompt types, autocomplete, multiselect, scale); per npm trends, enquirer 2.4.1 has ~27.16M weekly downloads and 7,934 GitHub stars, but is widely reported as unmaintained for ~2 years.
- **inquirer** (`@inquirer/prompts`) — the decade-long default; v9+ rewrite is ESM-only and modular. Per npm trends, inquirer 13.4.2 has ~43.18M weekly downloads and 21,508 GitHub stars (the modular @inquirer/prompts shows ~20,921 stars). Note the raw-mode/stdin caveat when piping input.
- **prompts** — lightweight and simple; per npm trends, prompts 2.4.2 has ~47.81M weekly downloads and 9,285 GitHub stars; low maintenance activity.
- **oclif's own `ux`/CliUx** — built into `@oclif/core`: prompts, tables (with `--csv`/column flags), spinners/action, progress; degrades gracefully to non-TTY. This is what Salesforce's own CLIs use, and is the zero-dependency baseline.

### Non-JS options, for context and sidecar decisions
- **Ratatui (Rust)** — immediate-mode library, maximum performance and control. Per Ratatui's own v0.30.0 highlights, that release "modularized the crates, added full no_std support for embedded targets, introduced the new ratatui::run() API"; the line has since advanced to v0.30.2, and Ratzilla brings it to WASM. Best when you write the event loop yourself and need lowest CPU/RAM.
- **Bubble Tea (Go)** — Elm-architecture framework in the Charmbracelet ecosystem (Lip Gloss styling, Bubbles components, gum); v2 is a major architecture overhaul. Fastest path to a polished, opinionated Go TUI.
- **Textual (Python)** — full framework (CSS-like styling, widgets, mouse, `textual-image` for Kitty/Sixel images, web deployment). Textualize the company wound down May 2025 but Will McGugan continues it as open source.
- **When a sidecar makes sense**: if you need genuinely GPU-accelerated graphics, 60+ FPS streaming, or heavy real-time dashboards, compiling a small Rust (Ratatui) or Go (Bubble Tea) binary and shelling out to it from an oclif command (feeding it data over stdin/args, reading a selection back over stdout, à la `fzf`) gives you native performance without abandoning your TypeScript CLI. This is the cleanest "graphically rich" escape hatch. For a TypeScript-native GPU path, OpenTUI's Three.js/WebGPU renderer is the only in-ecosystem option today, at the cost of Bun.

### Graphical richness: what supports what
- **Inline images**: No pure-Node TUI framework renders images natively across protocols. Use:
  - **terminal-image** (high-level, PNG/JPEG/GIF incl. animation) — the package you usually want.
  - **term-img** (iTerm2 inline image protocol; supported on iTerm ≥3, WezTerm, Konsole, Rio, VS Code integrated terminal) with a `fallback` callback.
  - **chafa** (CLI + libchafa; Sixel, Kitty, iTerm2, plus Unicode/braille/ASCII fallback, auto-detects terminal caps) — has community Node/JS bindings by Héctor Molinero Fernández; the most robust cross-protocol option, shell out to it.
  - **node-sixel** / **sixel** (encode/decode Sixel in JS/WASM) for lower-level Sixel work.
  - blessed and terminal-kit have their own built-in image loading (blessed via ANSI/braille + Sixel; terminal-kit via 32-bit composition and the upper-half-block technique).
  - You can print image escape sequences into an Ink `<Text>`/static region, but positioning is manual.
- **Charts / sparklines / gauges / progress / tables / trees**: **blessed-contrib** is the richest turnkey source (line, bar, stacked bar, map, gauge, stacked gauge, donut, LCD, rolling log, sparkline, table, tree). In Ink, use @inkjs/ui ProgressBar/Spinner, ink-table for tables, and custom components (or braille via `drawille`) for charts.
- **Truecolor / gradients / box drawing / Nerd Font icons**: all supported in Ink (via chalk under the hood), terminal-kit, and blessed. ink-gradient + ink-big-text for banner text. Nerd Font icons are just Unicode glyphs — they render if the user's font has them.
- **Mouse, scrollable viewports, focus, split panes, modals/overlays**: 
  - blessed/neo-blessed and terminal-kit have **native mouse, scrolling, and focus**.
  - Ink has **focus management** (`useFocus`/`useFocusManager`) and Flexbox split panes, but **no built-in scrolling/overflow** and **no native mouse** — mouse needs the third-party `@zenobius/ink-mouse`, and scrollback/overlays need custom work (Ink's author has noted the lack of nested overlays/modals). OpenTUI ships a `ScrollBox` and built-in keyboard/focus handling, closing this gap.
- **Flexbox layout**: Ink (Yoga), OpenTUI (Yoga), and blessed's percentage/grid model. Ink's Yoga support is the most complete and CSS-like.

### oclif integration: patterns and gotchas

**oclif is created and maintained by Salesforce**, is written in TypeScript, and — importantly — **does not depend on Ink**. Salesforce's own CLIs (`sf`/`sfdx`, Heroku CLI) use oclif's built-in `ux`/CliUx for interactive UI, not Ink. Ink appears in the oclif *ecosystem* where third parties add it — most notably **Shopify CLI**, which is built on oclif v4 and renders its interactive prompts/output through an Ink/React design system shipped as `@shopify/cli-kit` (per Shopify Engineering: "we decided to build the Node CLI on [oclif's] APIs … [and] designed and built a design system on Ink"). Notably, Shopify uses **explicit command discovery** (a hardcoded command map) rather than filesystem globbing — which itself sidesteps the `.tsx` discovery gotcha below.

The integration pattern is straightforward in principle: use oclif for command structure/flags/plugins, then call Ink's `render()` inside a command's `run()`:

```ts
import { Command } from '@oclif/core'
import { render } from 'ink'
import Dashboard from './components/Dashboard.js'

export default class Monitor extends Command {
  async run() {
    const { waitUntilExit } = render(<Dashboard />)
    await waitUntilExit()
  }
}
```

The **gotchas** are real:

1. **ESM.** Ink is ESM-only since v4. oclif fully supports ESM (and CJS interop) since @oclif/core v3.0 — the `oclif generate` wizard lets you pick ESM, and there are ESM starter kits (e.g. `hello-world-esm`, `oclif-esm-starter`). But mixing an ESM-only dependency into a CJS oclif project triggers `ERR_REQUIRE_ESM`. **Fix: make the CLI ESM** (`"type": "module"`, ESM bin scripts, `tsconfig` module `nodenext`/`node16`), or dynamically `import()` the Ink component from a CJS command.

2. **JSX / `.tsx` command discovery.** This is the single most-cited oclif+Ink stumbling block. oclif's dev-mode command discovery historically only globbed `.js`/`.ts`, and its bundled ts-node config didn't transpile JSX, so a command written directly as `.tsx` produced "there is no command called X." The original report (Ink issue #239) put it plainly: "Oclif has some magic … it looks at pre-build files to determine what commands are. And when using with ts, where you need to use the `tsx` extension to enable jsx, oclif won't pick up `tsx` files." The parallel oclif issue #309 saw a maintainer acknowledge "We'll need to add tsx support." **Recommended workaround: keep the oclif `Command` in a plain `.ts` file and put all JSX in a separate `.tsx` component** that the command imports/renders. Set `tsconfig` `"jsx": "react-jsx"` (React 19 automatic runtime). One reporter also found renaming/isolating the project `tsconfig.json` unblocked oclif's internal ts-node merge. Building to `dist/*.js` before running (and using explicit command discovery) sidesteps the dev-mode transpile issue entirely.

3. **Alternate screen buffer / raw mode / cleanup.** For full-screen apps, enter the alternate screen buffer and enable raw mode; on exit (and on SIGINT/SIGTERM) call Ink's `unmount()` (or `screen.destroy()` for blessed), disable raw mode, and clear/leave the alt buffer, or you'll corrupt the user's terminal.

4. **Scriptability / non-TTY fallback.** Guard the TUI: if `!process.stdout.isTTY` (piped, CI, dumb terminal), skip `render()` and emit plain text or JSON. oclif has first-class support via `enableJsonFlag` (per oclif docs, the `--json` flag "suppress[es] all logs and instead log[s] the return value … in JSON") — pair a rich TUI for humans with `--json` for machines. This honors CLI-guidelines best practice ("Only use prompts or interactive elements if stdin is an interactive terminal (a TTY)").

### Practical trade-offs
- **Bundle size / startup latency**: A Node/oclif CLI already pays ~200–500ms startup before user code runs (mitigated by oclif's lazy command loading). Ink + React add meaningful weight (React reconciler; Ink apps commonly sit above ~50MB RAM per OpenTUI-aligned benchmarks). @clack/prompts (~4KB) or oclif `ux` are far lighter if you don't need a full TUI. OpenTUI's native core is faster per-frame but requires shipping platform-specific binaries.
- **Node version**: Ink v6 needs Node 20+; Ink v7 needs Node 22+; oclif supports active Node LTS (18+ historically, moving to 20+/22+). OpenTUI native rendering effectively wants Bun or Node 26.4+ with `--experimental-ffi`.
- **Windows / PowerShell / ConEmu**: Ink works broadly (conservative baseline) but truecolor/mouse vary; old `cmd.exe` supports only rudimentary ANSI. Windows Terminal is fine. blessed's terminfo approach is portable but quirky on Windows. Note that Bun's incomplete `tty.WriteStream` has historically broken oclif's screen sizing — a consideration if you go the OpenTUI/Bun route. Test explicitly.
- **SSH / CI**: check `isTTY` and `TERM`; provide a simplified/non-interactive mode. Mouse and alt-screen behave differently under tmux (Claude Code has documented tmux mouse-capture breaking scrollback).
- **Testing**: ink-testing-library for Ink; for prompt libs, mock stdin/stdout; for end-to-end, use pseudo-terminals (node-pty). Keep business logic separate from render so it's unit-testable.
- **Accessibility**: Ink has basic screen-reader support (`isScreenReaderEnabled` render option / `INK_SCREEN_READER` env var, implementing a small ARIA subset). Line-oriented CLI output is inherently more screen-reader-friendly than a TUI, which is another reason to keep a non-TUI fallback.
- **Degradation in dumb terminals**: Ink and oclif `ux` degrade reasonably; always branch on `isTTY`. chafa/terminal-image should be given ASCII fallbacks.

## Recommendation

**Primary: oclif + Ink (v6/v7) + @inkjs/ui, ESM, with a strict TTY fallback.** This is the right default because it maximizes maintenance safety, community/AI familiarity (React), component availability, and alignment with how oclif's biggest ecosystem CLIs (Shopify) already do it. Architecture:

1. **Make the CLI ESM** (`"type": "module"`, `@oclif/core` v3+/v4, ESM bin scripts, `tsconfig`: `module: "nodenext"`, `jsx: "react-jsx"`).
2. **Keep each oclif `Command` in `.ts`**; put the Ink UI in sibling `.tsx` files it imports. Consider explicit command discovery to avoid glob issues.
3. **Guard every TUI command** so it stays scriptable:

```ts
export default class Dashboard extends Command {
  static enableJsonFlag = true
  async run() {
    const { flags } = await this.parse(Dashboard)
    const data = await loadData()
    if (flags.json) return data                 // machine-readable
    if (!process.stdout.isTTY) {                 // piped / CI
      this.log(renderPlainText(data)); return
    }
    const { render } = await import('ink')       // dynamic ESM import
    const { default: App } = await import('./ui/Dashboard.js')
    const { waitUntilExit } = render(<App data={data} />)
    await waitUntilExit()
  }
}
```

4. **For graphics**: use @inkjs/ui for spinners/progress/inputs; ink-table for tables; ink-gradient/ink-big-text for banners; shell out to **chafa** (with ASCII fallback) or use **terminal-image** for inline images; build custom braille/Unicode chart components (or drawille) for sparklines/charts.
5. **For a heavy real-time dashboard** (many gauges/charts), put it behind its own command using **blessed-contrib** — but never mix blessed and Ink in the same command/process.

**Runner-up: OpenTUI (React bindings) — choose it when graphical richness and frame rate are the top priority and you can adopt Bun.** OpenTUI is the only TypeScript-native path to GPU/WebGPU rendering, a built-in ScrollBox, and 60+ FPS streaming, and it's proven in production by OpenCode. Pick it if: you're greenfield or willing to run the TUI under Bun (or bleeding-edge Node with `--experimental-ffi`), you want the smoothest streaming/agent-style UI, and you can tolerate pre-1.0 churn and shipping native binaries. Given the user already has a Node-based oclif CLI, the cleanest way to use OpenTUI is as a **Bun sidecar** invoked from an oclif command, not as an in-process dependency.

**When to reach for a non-JS sidecar instead**: if you need a genuinely high-performance dashboard/editor and are comfortable shipping a compiled binary, a **Ratatui (Rust)** or **Bubble Tea (Go)** sidecar invoked `fzf`-style from oclif gives the best performance and richest native mouse/scroll — at the cost of a polyglot build.

## Caveats
- **Ink version flux**: v6.0.0 (May 29, 2026; React 19 + Node 20) is firmly sourced, but there is now a v6.8.x line and a **v7.x line (7.1.1, ~mid-July 2026, Node 22+ / React ≥19.2)**. npm data across trackers is inconsistent (one npm README rendered "6.2.0"; npm trends shows 7.0.6 at ~38,909 stars / ~4.17M weekly downloads). Confirm the current npm `latest` dist-tag before pinning. React 19 is mandatory from v6 onward; earlier React 19 + Ink v5 combos were broken.
- **OpenTUI is explicitly not production-ready** per its own docs, and its Node story depends on very new/experimental FFI; the Bun requirement is the practical blocker for most oclif CLIs today. Version (0.4.x) and star count confirm it is young.
- **blessed/neo-blessed are effectively legacy**; neo-blessed's last npm publish is ~5 years old despite being the "maintained" fork. Use blessed-contrib only where its widgets are irreplaceable, and expect to own compatibility fixes.
- **enquirer and several classic ink-* single-purpose packages are quiet/unmaintained**; prefer @inkjs/ui and @clack/prompts for new work.
- Ink's **lack of native scrolling/overflow, overlays, and mouse** is a genuine limitation for complex apps; large adopters (Gemini CLI, Qwen Code) have built custom viewport/fork solutions. Budget for this if your TUI needs long scrollback or modal overlays.
- Performance/RAM figures for Ink (~50MB, ~30 FPS cap) come from OpenTUI-aligned sources promoting an alternative; treat as directional, not benchmarked-neutral.