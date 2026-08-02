# `nex tui` — manual checks

Everything CI cannot prove, listed openly rather than left implied by a green
build.

CI runs `npm run build` (which typechecks all of `src/tui`) and
`npm run test:unit`. That covers the pure logic thoroughly and the component
rendering shallowly. It cannot cover a **real terminal**: alt-screen
handling, raw-mode restoration, signal paths, and render throughput under
genuine load all depend on a pty that jest does not have.

Run this list against a **dev** alias before releasing a change to
`src/tui/**`. Date and initial the run at the bottom.

---

## 0. It builds from what is actually committed

CI does this on every PR now, so it should never surprise you again — but it
is first on the list because it went wrong once and cost everyone else a
broken build:

```bash
git clone <repo> /tmp/fresh && cd /tmp/fresh && npm ci && npm run build
```

A bare `logs` in `.gitignore` matches a **directory of that name anywhere in
the tree**, which silently untracked all of `src/tui/panes/logs/`. It built
perfectly for the author and for nobody else. The directory patterns are
root-anchored now, and CI builds from a clean checkout on every pull request
rather than only on those targeting `main`.

If you add a source directory whose name collides with a common ignore word
(`logs`, `tmp`, `results`, `pids`, `dist`, `coverage`), check
`git check-ignore -v <path>` before assuming it is tracked.

## 1. Terminal integrity

The one failure nobody forgives is a terminal left unusable. Check all four
exit paths, and after each: cursor visible, alt screen exited, shell echoes
normally, and the process is actually gone.

- [ ] quit with `q`
- [ ] quit with `^C`
- [ ] `kill -TERM <pid>` from another shell
- [ ] `kill -KILL <pid>` from another shell — the shell may need `reset`
      afterwards; that is expected, since SIGKILL runs no cleanup. Confirm
      `reset` fully recovers it.

Then repeat the first three **inside tmux**, and confirm tmux's own
scrollback is intact afterwards.

- [ ] the process exits rather than hanging — a live syslog tail must not
      keep the event loop alive

## 2. Non-TTY refusal

- [ ] `nex tui < /dev/null` exits non-zero with a useful message
- [ ] `echo x | nex tui` likewise
- [ ] `nex tui --json` still works with no TTY at all

## 3. Layout

- [ ] `COLUMNS=80 nex tui --auth dev` — columns shed by priority, nothing wraps
- [ ] resize the window while running; the frame reflows and does not corrupt
- [ ] a 60×20 terminal is accepted; 59 columns or 19 rows is refused with the
      measured size in the message

## 4. Rendering degradation

- [ ] `NO_COLOR=1 nex tui --auth dev --ascii`
- [ ] against a `prod`-classified alias, confirm `▌ PROD ▐` survives `NO_COLOR`
- [ ] a non-UTF-8 locale (`LC_ALL=C`) falls back to ASCII glyphs

## 5. Log throughput

Needs an instance actually producing traffic — run a script that logs in a
loop, or tail a busy dev instance.

- [ ] the UI stays responsive at high log rates (ingest is decoupled; render
      is capped at 10fps)
- [ ] the drop marker appears once the ring buffer wraps, rather than lines
      vanishing silently
- [ ] follow mode auto-pauses on any upward scroll, and `G` resumes

## 6. Foreground handoff

Both callers share one primitive, and the failure mode is subtle: the parent
can eat the child's first keystrokes.

- [ ] Scripts pane `E` → the editor opens, **the first keystroke registers**,
      edits come back into the buffer
- [ ] with `$VISUAL` and `$EDITOR` unset, the editor picker offers what is on
      PATH
- [ ] Project pane, an interactive SDK command (`auth --add`) → prompts render
      on the real terminal, the first character typed is not swallowed, and
      the TUI redraws intact on return

## 7. Credential store

Per `AGENTS.md` rule 2, redirect and **verify the redirect took effect**
rather than assuming:

```bash
export SN_CRED_STORE=file SN_CRED_STORE_PATH=/tmp/nex-check/creds.json
nex auth doctor --cred-store --json    # confirm store/path/shimActive
```

- [ ] a spawned SDK command from the Project pane resolves credentials from
      that file rather than the OS keyring

Note that `nex`'s own alias may live in the **SDK's** credential store rather
than sn-credstore; `nex auth list` showing nothing does not mean the alias is
absent.

## 8. Writes

Against a dev alias only.

- [ ] a single field edit prompts, and shows before → after
- [ ] `a` suppresses the next identical prompt; a different action still asks
- [ ] `--read-only` refuses a write **and says so** rather than silently
      doing nothing
- [ ] `--approve-all` refuses to engage against a `prod` or unclassified alias
- [ ] bulk: select rows, `b`, and confirm the dry run runs *before* any
      approval appears
- [ ] bulk on an always-ask tier demands the **typed alias** — `y` alone does
      not approve
- [ ] `^C` mid-bulk reports partial progress, not failure

## 9. Logging must not shred the frame

- [ ] `nex tui --auth dev --log-level debug` — winston output is captured
      into the diagnostics buffer, not painted over the UI

## 10. Project pane

- [ ] inside a Fluent project: pane present, correct scope/version, and the
      SDK origin (bundled vs project-local) shown
- [ ] in `/tmp`: pane absent, `5` unbound, everything else unchanged
- [ ] a project whose `scopeId` is not on the connected instance warns that
      installing will create it

---

## Known-not-covered

Stated so nobody assumes otherwise:

- Windows Terminal and PowerShell hosts — the alt-screen and raw-mode paths
  are POSIX-tested only
- mouse input — deliberately unsupported
- screen readers — see the accessibility note in `docs/tui.md`; the CLI with
  `--json` is the supported path
- concurrent TUI sessions against the same instance

---

| Date | Version | Terminal | By | Result |
|---|---|---|---|---|
| | | | | |
