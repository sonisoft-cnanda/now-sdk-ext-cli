# `nex tui` — a full-screen ServiceNow workspace

One command, five panes, and the ambient state that decides where your
writes land kept visible at all times.

`nex tui` does not replace any of the 71 CLI commands. They remain the right
tool for scripting, for agents, and for `--json`. The TUI exists for the
three things a CLI structurally cannot do:

1. **Hold ambient state where you can see it.** Current scope and current
   update set silently decide where every write goes. In a CLI you discover
   you were in the wrong one afterwards.
2. **Put related things next to each other.** A log line and the record it
   names are two invocations and a copy-paste apart. A script run and its
   `gs.info` output are in different terminals.
3. **Show the blast radius before you agree to it.** `--confirm` asks you to
   promise before you know what will change.

---

## Launching

```bash
nex tui --auth dev                                  # start on Records
nex tui --auth dev --pane logs                      # start somewhere else
nex tui --auth dev --table incident --query "active=true^priority<=2"
nex tui --auth dev --read-only                      # refuse every write
nex tui --json                                      # capability descriptor, no TTY needed
```

| Flag | Effect |
|---|---|
| `--pane` | `records`, `logs`, `scripts`, `ops`, `project` |
| `--table`, `--query` | preload the Records pane |
| `--read-only` | writes are refused **in the gateway**, not merely hidden in the UI |
| `--approve-all` | pre-approve everything for a dev loop; **refuses to engage on `prod` or an unclassified alias** |
| `--scrollback` | log ring-buffer capacity (default 5000) |
| `--ascii` | ASCII glyphs instead of Unicode |
| `--auth`, `--cred-store`, `--log-level` | inherited from every other command |

It requires an interactive terminal of at least 60×20 and refuses cleanly
otherwise — `nex tui < /dev/null` exits non-zero with a message pointing at
`nex query`, `nex log` and `nex exec --json`, so it never hangs a script.

---

## The panes

**1 Records** — table picker, encoded-query bar, paged list, record form with
staged edits. Reads use `sysparm_display_value=all`, so a cell can show the
label while colouring by the internal value. Auto-refresh is deliberately
**off**: a list that reorders under a selection is how you update the wrong
25 records. After 60s the footer marks the fetch stale; `r` is explicit.

**2 Logs** — live syslog tail. Ingest is not React: entries land in a
fixed-capacity ring buffer and the view re-renders at 10fps regardless of
how fast the instance is talking. Filter rules use the same syntax and the
same predicate as `nex log -f`, so `y r` yanks a working CLI command. Any
upward scroll auto-pauses and a `+N new` badge appears; `G` resumes.

**3 Scripts** — a notebook, not a REPL: a persistent editable buffer on top,
an append-only run transcript below. `E` pops the buffer out to `$EDITOR`
(or `cursor --wait` / `code --wait`) and reloads on return. Scope is chosen
from a searchable `sys_app` list — you never type a scope name from memory.
`d` opens the Fluent API reference (see below).

**4 Ops** — Flows, ATF and Update Sets; press `4` again to cycle. ATF polls
with the non-`AndWait` variants so progress is live rather than a blocked
request.

**5 Project** — appears **only** inside a `@servicenow/sdk` (Fluent) project,
and is hidden entirely otherwise rather than shown broken. See
[Project pane](#the-project-pane-now-sdk).

---

## Approvals

Every write asks. The model follows Claude Code / Cursor rather than a
session-arming flag.

| Tier | Operations | Behaviour |
|---|---|---|
| none | all reads, staging a local field edit, columns, filters, follow | no prompt |
| remember-able | single-record update, task verbs, script execution, flow/ATF runs, update-set switch | `y` once · `a` don't ask again for this action on this alias · `n` |
| always-ask | bulk update/delete, batch writes, XML import, app install, **anything at all on `prod` or an unclassified alias** | no `a`; you must **type the instance alias exactly** |

`a` is scoped to `(action kind, alias)`, held **in memory only**, never
written to disk, and cleared when the process ends.

**The enforcement is structural.** Every gateway write requires an
`ApprovalToken` — a branded type only the approval dialog can mint, which is
single-use and carries a hash of the approved spec. A component cannot call
a write it did not get approved: forgetting is a compile error, not a review
miss. `--read-only` throws in the gateway, not by hiding buttons.

### Bulk operations

The dry run **is** the dialog body, so there is no path to execution that
skips it. Select rows with `x`, press `b`:

1. pick the field, type the value;
2. the dry run runs — nothing is written — and reports the match count;
3. the always-ask approval appears with the count and the provenance;
4. on approval the dry run **re-runs**; if the count moved, it aborts and
   re-asks rather than writing a set you never saw;
5. execution streams progress. `^C` aborts at the next batch boundary, never
   mid-request, and partial completion is reported as partial.

Targeting is always `sys_idIN<explicit list>` captured at selection time —
the affected set is exactly the rows you looked at, so the preview count and
the execution count cannot diverge.

---

## Environment classification

The banner colours and the approval tier both key off how an alias is
classified. Set it explicitly:

```bash
export NEX_TUI_ENV_DEV206299=dev      # NEX_TUI_ENV_<ALIAS>, uppercased, - and . become _
```

Without an override the host is matched heuristically. **An alias that
cannot be classified is treated as `prod`**, so a brand-new alias is
maximally protected rather than maximally convenient.

---

## The Project pane (now-sdk)

Inside a Fluent project the TUI also drives `@servicenow/sdk`. Running the
commands is the easy part; the pane exists for the two things the SDK CLI
cannot do.

**Argument resolution — nothing asks for a sys_id from memory.**
`init --from` offers a searchable `sys_app` list, `--template` the real enum,
`--scopeName` is validated against now.config.json's own schema *before*
spawning, `transform --table` uses the table picker, directory flags get a
directory picker, and `--auth` is read from `now-sdk auth --list`.

**Safety nets the CLI cannot provide,** because it only ever sees one
invocation:

- *stale install* — a failed build leaves the previous artifacts in place, so
  installing after one pushes stale output. The pane tracks the last build's
  outcome against your newest source file.
- *keys.ts drift* — uncommitted `keys.ts` means updates become inserts and
  duplicate records on every other machine. `--frozenKeys` guards CI;
  nothing guarded local.
- *transform shadowing* — a **successful** transform can leave XML under
  `metadata/` that silently wins over the `.now.ts` it just generated.
- *wrong instance* — `now.config.json` carries `scopeId`, so the pane says
  whether this app is installed here, at what version, or whether that id
  belongs to a different scope entirely.

npm scripts are preferred over the raw commands, as the SDK guide instructs.
Commands that prompt (`auth --add`) get the terminal handed to them and the
TUI redraws on return.

### Fluent docs, offline

`d` in the Scripts pane opens ~236 documentation topics that ship inside the
SDK. **No instance and no credential required**, so it works in any
directory. The topics are tagged with synonyms and the search matches them,
which is the point: searching `dropdown` finds `choiceset-api` even though
the word does not appear in the name.

---

## Colour, glyphs and degradation

Colour is never the sole carrier of meaning — every state also has a glyph, a
label, or both. `NO_COLOR` is honoured, `--ascii` swaps the Unicode glyph set
for ASCII, and under `NO_COLOR` the prod banner keeps `▌ PROD ▐` at both ends
of the row so the most safety-critical signal never depends on colour.

## Accessibility

**`nex tui` is not the accessible path, and does not pretend to be.** Ink's
`INK_SCREEN_READER` is honoured, but line-oriented CLI output with `--json`
is fundamentally more screen-reader-friendly than any full-screen TUI. Every
capability here exists as a CLI command; use those.

---

## Keymap

Generated from `nex tui --json`, which reads the same registry the in-app `?`
sheet and hint bar render — so this table cannot drift from the real
bindings.

### Global

| Key | Does |
|---|---|
| `1-5` | switch pane (5 Project only inside a Fluent project) |
| `^K` | command palette — works even inside a picker or editor |
| `?` | this help |
| `q` | quit |
| `Ctrl+C` | quit |

### Records

| Key | Does |
|---|---|
| `t` | pick table |
| `/` | edit encoded query |
| `↑↓ / j k` | move cursor |
| `g / G` | first / last row |
| `n / p` | next / previous page (API round trip) |
| `x / X / -` | select / select all / clear |
| `⏎` | open record |
| `r` | refresh |
| `b` | bulk update the selected rows (dry run, then approval) |

### Record form

| Key | Does |
|---|---|
| `↑↓ / j k` | move field cursor |
| `e` | edit field (stages locally) |
| `^S` | save staged changes (asks for approval) |
| `u` | discard staged changes |
| `o` | open referenced record |
| `Esc` | back |

### Scripts

| Key | Does |
|---|---|
| `typing` | edits the buffer (paste is one operation) |
| `^E` | execute the buffer (asks for approval) |
| `^Z / ^Y` | undo / redo |
| `Tab` | move between buffer and transcript |
| `⏎` | recall a past run into the buffer (transcript) |
| `s` | pick scope (transcript) |
| `p` | set {placeholder} params (transcript) |
| `E` | open the buffer in $EDITOR (transcript) |
| `d` | Fluent API docs, offline (transcript) |
| `^L` | logs for the selected run (transcript) |

### Ops

| Key | Does |
|---|---|
| `4` | cycle Flows / ATF / Update Sets |

### Ops · Flows

| Key | Does |
|---|---|
| `⏎` | action-by-action detail |
| `c` | cancel execution (asks for approval) |
| `o` | open the context record |

### Ops · ATF

| Key | Does |
|---|---|
| `t` | pick a test suite |
| `r` | run the suite (live progress) |
| `o` | open the suite result record |

### Ops · Update Sets

| Key | Does |
|---|---|
| `⏎` | inspect contents |
| `S` | switch current set (asks for approval) |

### Project

| Key | Does |
|---|---|
| `⏎` | configure a command / resolve a flag value |
| `^E` | run the configured command |
| `Esc` | back |

### Approval

| Key | Does |
|---|---|
| `y` | approve once |
| `a` | approve and don't ask again (this action, this alias) |
| `n / Esc` | refuse |

### Logs

| Key | Does |
|---|---|
| `Space` | follow / pause |
| `↑↓ / j k` | scroll (up auto-pauses) |
| `G` | jump to tail + resume follow |
| `/` | find in buffer |
| `n / N` | next / previous find match |
| `f` | edit filter rules (nex log -f syntax) |
| `o` | open reference in this line |
| `w` | write buffer to file |

---

## When something goes wrong

**The frame is shredded by log lines.** `--log-level debug` sends winston
straight to stdout. The TUI diverts it into an in-app diagnostics buffer, but
if you see it leak, that is a bug worth reporting.

**Keys do nothing after using `$EDITOR` or an interactive SDK command.** The
handoff restores raw mode on return; if it did not, quit with `q` and report
it — your terminal is recoverable with `reset`.

**A write reported success but nothing changed.** Check whether the field is
derived. `incident.priority` is recalculated from impact × urgency by a
platform business rule, so setting it directly appears to do nothing — via
the TUI and via `nex bulk update` alike. That is ServiceNow, not the tool.

**The Project pane is missing.** It appears only where a `now.config.json`
exists at or above the working directory.
