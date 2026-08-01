/**
 * NexGateway — the ONLY layer of the TUI allowed to import the core package
 * (enforced by no-restricted-imports; only src/tui/data/** is exempt).
 * Panes and components consume normalized DTOs and never see core managers
 * or response envelopes.
 *
 * Also the disposal owner: anything long-running (the syslog tail arrives in
 * Phase 2) registers here, and boot/terminal.ts calls disposeAll() on every
 * exit path — a useEffect teardown alone is skipped by uncaught exceptions,
 * which is exactly when a live poll would otherwise pin the process open.
 */
import { AmbientGateway } from './ambient.gateway.js'
import { RecordsGateway } from './records.gateway.js'

export type DisposeFn = () => void

export class NexGateway {
  readonly ambient: AmbientGateway
  readonly records: RecordsGateway
  private readonly disposers = new Set<DisposeFn>()

  constructor(instance: unknown) {
    this.ambient = new AmbientGateway(instance)
    this.records = new RecordsGateway(instance)
  }

  disposeAll(): void {
    for (const dispose of this.disposers) {
      try {
        dispose()
      } catch {
        // best-effort: disposal must never block the exit path
      }
    }

    this.disposers.clear()
  }

  registerDisposer(fn: DisposeFn): () => void {
    this.disposers.add(fn)
    return () => this.disposers.delete(fn)
  }
}
