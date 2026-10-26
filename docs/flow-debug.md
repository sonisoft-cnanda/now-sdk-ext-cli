# Debugging a flow step by step

`nex flow debug` drives Workflow Studio's flow debugger (**Test ▸ Debug**) from the command line: breakpoints
by step number, step over, into (including into a subflow) and out, and each step's runtime inputs and outputs
while the run is paused. It works with the ordinary nex credential; no browser session is needed.

**A debug run executes the flow for real.** Records it creates or changes are kept, notifications go out,
integrations are called. Debug a copy (`nex flow copy`) in a scratch application, never on an instance you may
not change.

## One call, for agents and scripts

```bash
nex flow debug run --flow x_myapp.create_task_copy \
  --inputs '{"table":"incident","field_values":"short_description=Debug run"}' \
  --break 3 --json --auth dev
```

`run` starts the run, resumes it to the first `--break` step, prints the run there (with `--json`, the whole
snapshot: every step's state, error, inputs and outputs), and cancels it. Nothing is left open.
`--after resume` lets it run on to the end, ignoring the other breakpoints, and reports where it got to within
`--timeout`; a run still going then is left running, and the output says so. `--after stay` leaves it paused
for the commands below. Ctrl+C cancels the run once the current call returns.

## Step by step

```bash
nex flow debug start --flow x_myapp.create_task_copy -i @inputs.json --break 3 --auth dev   # prints the root context id
nex flow debug resume  --context <ctx> --auth dev        # to the next breakpoint
nex flow debug inspect --context <ctx> --step 1 --auth dev
nex flow debug step    --context <ctx> [--into|--out] --auth dev
nex flow debug break   --context <ctx> --add 4 --auth dev
nex flow debug cancel  --context <ctx> --auth dev        # always end it
```

| Command | Does |
| --- | --- |
| `start` | Starts a run of the flow's current draft, paused before its first step. Prints the root context id, the steps it can stop at, and where it is. |
| `break` | `--steps` replaces the breakpoints, `--add` / `--remove` change them, `--clear` removes them all; with none of these, lists them. |
| `step` | Step over by default; `--into` enters a subflow call, `--out` runs the rest of the current subflow. |
| `resume` / `skip-all` | Run to the next breakpoint, or to the end ignoring breakpoints. |
| `inspect` | Where the run is, and each step's inputs and outputs. `--step N` for one step; `--full` for whole values. |
| `cancel` | Ends the run, and any subflow it stepped into, then reads it back. Safe to repeat. |
| `run` | The one-call form above. |
| `list` | Debug runs still open on the instance, newest first: find one a crashed terminal left paused. |

Every command takes the **root** context id `start` printed, even after stepping into a subflow: nex follows
the run into the child context and sends commands there. `--json` returns the core objects (`FlowDebugSession`,
`FlowDebugSnapshot`, …).

Waiting: `start`, `step`, `resume`, `skip-all`, `run` and the prompt's commands wait up to `--timeout` seconds
(60 by default) for the run to pause again or end. If it has not visibly moved on when the wait ends, the
snapshot says so (`timedOut`); check it again with `inspect`, or `cancel`. `break --add` and `--remove` keep the
other breakpoints, including ones without a step number.

## Interactively

```bash
nex flow debug --flow x_myapp.create_task_copy -i @inputs.json --break 3 --auth dev
nex flow debug --context <ctx> --break 4 --auth dev      # continue an open run, adding a breakpoint
```

At the `debug [paused @ step 1]>` prompt: `n` step over, `s` step into, `o` step out, `c` resume, `skip`,
`b 2,3` add breakpoints, `b -2` remove one, `b` list, `p [N]` step data (`pp` in full), `w` where, `l` the steps
it can stop at, `q` cancel and quit, `detach` exit and leave the run open, `help`. Ctrl+C, Ctrl+D and SIGTERM
cancel the run before exiting, also while it is still starting; a command in flight is allowed to return first. The interactive form needs a terminal; scripts use the subcommands.

## Inputs

- **A subflow** takes its declared inputs by name. Unknown names and missing mandatory inputs are refused before
  anything runs. A JSON array for an `array.*` input is sent the way Workflow Studio sends it.
- **A flow** takes its trigger's outputs, as `nex flow test` does: for a record trigger, `current` (the record's
  sys_id) and `table_name`.
- `--inputs` takes JSON or `@file`; `--input name=value` (repeatable) sets string values over it.

## Steps, and what nex refuses

Steps are the numbers Workflow Studio shows. The debugger itself uses its own line numbers and accepts any
element on a valid line, so nex never sends a breakpoint as typed: it looks the step up in the debugger's own
list, and an unknown step is refused with the valid numbers. nex sends only the five debugger commands;
the debugger would run the flow to the end for any other name.

Refusals carry a code, a detail and a remediation, in text and under `--json`:

| Code | Means |
| --- | --- |
| `unknown_input`, `missing_input` | The inputs in `detail.inputs`. |
| `unknown_breakpoint`, `breakpoint_not_verified` | `detail.validSteps`, or the debugger's reason. |
| `not_paused` | The run is not paused (`detail.state`). |
| `not_a_debug_session` | The context was not started by the debugger: nex will not step or cancel a real flow run. |
| `flow_not_found`, `not_debuggable` | No such flow or subflow; or an action, which has Test but no Debug. |
| `context_not_found`, `start_failed`, `cancel_failed`, `permission_denied`, `release_unsupported`, `unexpected_response`, `invalid_input` | See the remediation printed with it. |

## Policy

Starting a run and sending a step command need **execute**: `--deny-execute`, `--read-only` and
`NEX_POLICY_DENY=execute` refuse them, as they refuse `nex flow test`. Breakpoint changes and `cancel` need
only **write**, so a run started earlier can still be cancelled under `--deny-execute`.

See the [core FlowDebugger guide](https://github.com/sonisoft-cnanda/now-sdk-ext-core/blob/main/docs/FlowDebugger.md)
for the API and the Workflow Studio calls underneath.
