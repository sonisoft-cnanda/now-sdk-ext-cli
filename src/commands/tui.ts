/* eslint-disable perfectionist/sort-objects */

import { Flags } from '@oclif/core'

import { AuthenticatedCommand } from '../common/authenticated-command.js'

/**
 * The ONLY TUI file allowed under src/commands/ — oclif discovers every file
 * emitted into dist/commands/** as a command, so the entire workspace lives
 * in src/tui/ and is reached through the dynamic import below.
 */
export class Tui extends AuthenticatedCommand<typeof Tui> {
  static args = {}
  static description = 'Open the full-screen ServiceNow workspace.\n\n' +
    'An interactive terminal UI over the same core managers the CLI uses: ' +
    'records, logs, scripts, flows/ATF/update sets — with the target instance, ' +
    'scope and current update set always visible.\n\n' +
    'Requires an interactive terminal (both stdin and stdout must be TTYs). ' +
    'For scripting and agents, use the individual nex commands with --json.'
  static enableJsonFlag = true
  static examples = [
    {
      description: 'Open the workspace',
      command: '<%= config.bin %> <%= command.id %> --auth dev',
    },
    {
      description: 'Inspect the workspace descriptor without a terminal',
      command: '<%= config.bin %> <%= command.id %> --auth dev --json',
    },
  ]
  static flags = {
    'pane': Flags.option({
      description: 'Pane to open on.',
      options: ['records', 'logs', 'scripts', 'ops', 'project'] as const,
    })(),
    'table': Flags.string({
      description: 'Open the Records pane on this table.',
    }),
    'query': Flags.string({
      description: 'Encoded query to prefill in the Records pane.',
    }),
    'read-only': Flags.boolean({
      default: false,
      description: 'Refuse every write for this session (enforced in the data gateway).',
    }),
    'approve-all': Flags.boolean({
      default: false,
      description: 'Pre-approve routine writes for a dev loop. Refuses to engage on prod or ' +
        'unclassified instances, and never covers bulk or destructive operations.',
    }),
    'ascii': Flags.boolean({
      default: false,
      description: 'Use ASCII glyphs instead of Unicode.',
    }),
    'scrollback': Flags.integer({
      default: 5000,
      description: 'Log-tail buffer capacity in lines (bounds memory; oldest lines drop).',
    }),
  }

  public async init(): Promise<void> {
    // The TTY guard runs BEFORE credential resolution: a session that cannot
    // render should not touch the keyring. --json is exempt — it needs the
    // credential (host/user land in the descriptor) but never a terminal.
    // this.argv is available pre-parse; enableJsonFlag guarantees the flag.
    if (!this.argv.includes('--json')) {
      this.guardInteractive()
    }

    await super.init()
  }

  async run(): Promise<unknown> {
    const { flags } = await this.parse(Tui)

    const descriptor = {
      alias: flags.auth ?? 'fluent-default',
      host: this.instance.getHost() ?? null,
      // OAuth credentials carry no username — null, not undefined, so the
      // key survives JSON serialization and agents see the distinction.
      user: this.instance.getUserName() ?? null,
      readOnly: flags['read-only'],
      panes: ['records', 'logs', 'scripts', 'ops', 'project'],
      version: this.config.version,
    }

    if (this.jsonEnabled()) {
      return descriptor
    }

    this.guardSize()

    // Dynamic import: React + Ink never load for the other commands.
    const { startTui } = await import('../tui/index.js')
    await startTui({
      alias: descriptor.alias,
      approveAll: flags['approve-all'],
      ascii: flags.ascii,
      initialPane: flags.pane,
      initialQuery: flags.query,
      initialTable: flags.table,
      instance: this.instance,
      readOnly: flags['read-only'],
      scrollback: flags.scrollback,
    })
  }

  private guardInteractive(): void {
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)
      && process.env.TERM !== 'dumb'
      && !process.env.CI

    if (!interactive) {
      // Both streams matter: Ink throws "Raw mode is not supported" when
      // stdin is not a TTY, so a stdout-only check still crashes under
      // `nex tui < /dev/null`.
      this.error('nex tui requires an interactive terminal (stdin and stdout must be TTYs).', {
        suggestions: [
          'Use the individual commands for scripting: nex query, nex log, nex exec — all support --json.',
          'Run "nex tui --json" to inspect the workspace descriptor without a terminal.',
        ],
      })
    }
  }

  private guardSize(): void {
    const columns = process.stdout.columns ?? 0
    const rows = process.stdout.rows ?? 0
    if (columns < 60 || rows < 20) {
      this.error(`nex tui needs at least 60x20. Current: ${columns}x${rows}.`)
    }
  }
}
