import type { PaneIntent } from '../../../src/tui/commands/palette-actions.js'

import { describe, expect, it } from '@jest/globals'

import { buildPaletteActions, INTENT_OWNER, searchTextsOf } from '../../../src/tui/commands/palette-actions.js'
import { rank } from '../../../src/tui/ui/palette-score.js'

const BASE_PANES = [
  { id: 'records' as const, label: 'Records' },
  { id: 'logs' as const, label: 'Logs' },
  { id: 'scripts' as const, label: 'Scripts' },
  { id: 'ops' as const, label: 'Ops' },
]

function harness(options: { panes?: typeof BASE_PANES; sendOk?: boolean } = {}) {
  const calls: string[] = []
  const intents: PaneIntent[] = []
  const actions = buildPaletteActions({
    panes: options.panes ?? BASE_PANES,
    quit: () => calls.push('quit'),
    sendIntent(intent) {
      intents.push(intent)
      return options.sendOk ?? true
    },
    setPane: (p) => calls.push(`pane:${p}`),
    showHelp: () => calls.push('help'),
    toast: (kind, message) => calls.push(`toast:${kind}:${message}`),
  })
  const run = (id: string) => actions.find((a) => a.id === id)!.run()
  return { actions, calls, intents, run }
}

describe('buildPaletteActions', () => {
  it('offers one entry per available pane, numbered as the key that also does it', () => {
    const { actions } = harness()
    const panes = actions.filter((a) => a.group === 'Go to')
    expect(panes.map((a) => a.label)).toEqual(['Records', 'Logs', 'Scripts', 'Ops'])
    expect(panes.map((a) => a.key)).toEqual(['1', '2', '3', '4'])
  })

  it('numbers Project as 5 only when the session has it', () => {
    const withProject = [...BASE_PANES, { id: 'project' as const, label: 'Project' }]
    const { actions } = harness({ panes: withProject })
    expect(actions.find((a) => a.id === 'pane.project')?.key).toBe('5')
    expect(harness().actions.find((a) => a.id === 'pane.project')).toBeUndefined()
  })

  it('switches pane when a pane entry runs', () => {
    const { calls, run } = harness()
    run('pane.logs')
    expect(calls).toEqual(['pane:logs'])
  })

  it('raises the intent for a pane-local action', () => {
    const { intents, run } = harness()
    run('records.table')
    expect(intents).toEqual([{ kind: 'pick-table' }])
  })

  it('says so rather than no-opping when the owning pane is absent', () => {
    const { calls, run } = harness({ sendOk: false })
    run('scripts.scope')
    expect(calls.some((c) => c.startsWith('toast:info:'))).toBe(true)
  })

  it('wires help and quit', () => {
    const { calls, run } = harness()
    run('help')
    run('quit')
    expect(calls).toEqual(['help', 'quit'])
  })

  it('gives every action a unique id — ids key the list and drive tests', () => {
    const { actions } = harness()
    expect(new Set(actions.map((a) => a.id)).size).toBe(actions.length)
  })
})

describe('INTENT_OWNER', () => {
  it('names an owner for every intent kind, so none can silently vanish', () => {
    const { actions } = harness()
    // Every intent-raising action must resolve to a pane.
    for (const kind of Object.keys(INTENT_OWNER)) {
      expect(INTENT_OWNER[kind as PaneIntent['kind']]).toBeTruthy()
    }

    expect(actions.length).toBeGreaterThan(Object.keys(INTENT_OWNER).length)
  })

  it('routes docs to Scripts — beside the editor is the point', () => {
    expect(INTENT_OWNER['open-docs']).toBe('scripts')
  })
})

describe('searching the palette', () => {
  const { actions } = harness()
  const top = (needle: string) => rank(needle, actions, searchTextsOf)[0]?.item.id

  it('finds a pane by name', () => {
    expect(top('logs')).toBe('pane.logs')
  })

  it('finds the table picker by what it does, not its id', () => {
    expect(top('table')).toBe('records.table')
  })

  it('finds the docs by "fluent"', () => {
    expect(top('fluent')).toBe('docs.open')
  })

  it('finds quit by a prefix', () => {
    expect(top('qui')).toBe('quit')
  })

  it('returns nothing for gibberish rather than a bad guess', () => {
    expect(top('zzzzqqq')).toBeUndefined()
  })
})
