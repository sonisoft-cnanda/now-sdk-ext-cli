/**
 * Ambient instance state for the banner: current application scope and
 * current update set — the two pieces of state that silently decide where
 * every write lands, surfaced on every frame. Cached 60s; the Phase-5
 * switchers invalidate on write.
 */
import { ScopeManager, UpdateSetManager } from '@sonisoft/now-sdk-ext-core'

import { TtlCache } from './cache.js'

const AMBIENT_TTL_MS = 60 * 1000

export interface AmbientState {
  scope: string
  /** True when the current set is the Default trap. */
  updateSetIsDefault: boolean
  updateSetName: string
}

export class AmbientGateway {
  private readonly cache = new TtlCache<AmbientState>({ maxEntries: 1, ttlMs: AMBIENT_TTL_MS })
  private readonly scopeManager: ScopeManager
  private readonly updateSets: UpdateSetManager

  constructor(instance: unknown) {
    this.scopeManager = new ScopeManager(instance as never)
    this.updateSets = new UpdateSetManager(instance as never)
  }

  /**
   * Best-effort: the banner must render even when one of the two lookups
   * fails (insufficient roles, older instance) — a failed side shows '?'
   * rather than blocking the app.
   */
  async getAmbient(): Promise<AmbientState> {
    return this.cache.getOrLoad('ambient', async () => {
      const [application, updateSet] = await Promise.all([
        this.scopeManager.getCurrentApplication().catch(() => null),
        this.updateSets.getCurrentUpdateSet().catch(() => null),
      ])
      const updateSetName = updateSet?.name ?? '?'
      return {
        scope: application?.scope || application?.name || '?',
        updateSetIsDefault: updateSetName.toLowerCase() === 'default',
        updateSetName,
      }
    })
  }

  invalidate(): void {
    this.cache.clear()
  }
}
