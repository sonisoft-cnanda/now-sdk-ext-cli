import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const startTailingWithChannelAjax = jest.fn<any>()
const stopTailing = jest.fn<any>()

jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  SyslogReader: jest.fn().mockImplementation(() => ({ startTailingWithChannelAjax, stopTailing })),
}))

const { LogsGateway } = await import('../../../src/tui/data/logs.gateway.js')

type OnLog = (raw: Record<string, unknown>) => void

/** Capture the onLog callback and control the tail promise. */
function armTail(): { emit: OnLog; settle: () => void } {
  let emit!: OnLog
  let settle!: () => void
  startTailingWithChannelAjax.mockImplementationOnce((options: { onLog: OnLog }) => {
    emit = options.onLog
    return new Promise<void>((resolve) => {
      settle = resolve
    })
  })
  return { emit: (raw) => emit(raw), settle: () => settle() }
}

const raw = (message: string, level = 'info', source = 'src') => ({
  level, message, source, sys_created_on: '2026-08-01 10:00:00', sys_id: 'x',
})

describe('LogsGateway', () => {
  beforeEach(() => {
    startTailingWithChannelAjax.mockClear()
    stopTailing.mockClear()
  })

  it('ingests into the view and bumps the version per entry', () => {
    const { emit } = armTail()
    const gw = new LogsGateway({}, 10)
    gw.startTail()
    const v0 = gw.version
    emit(raw('one'))
    emit(raw('two'))
    expect(gw.version).toBeGreaterThan(v0)
    expect(gw.viewSource().length).toBe(2)
    expect(gw.getStatus()).toBe('connected')
  })

  it('filters on ingest with LogFilterService rules', () => {
    const { emit } = armTail()
    const gw = new LogsGateway({}, 10)
    gw.startTail()
    gw.setRules([{ field: 'message', operator: 'CONTAINS_CI', value: 'acme' } as never])
    emit(raw('ACME relay refused'))
    emit(raw('unrelated noise'))
    expect(gw.viewSource().length).toBe(1)
    expect(gw.hiddenRatio()).toBeCloseTo(0.5)
  })

  it('re-derives the view from raw when rules change — no refetch', () => {
    const { emit } = armTail()
    const gw = new LogsGateway({}, 10)
    gw.startTail()
    emit(raw('ACME one'))
    emit(raw('noise'))
    expect(gw.viewSource().length).toBe(2)
    gw.setRules([{ field: 'message', operator: 'CONTAINS_CI', value: 'acme' } as never])
    expect(gw.viewSource().length).toBe(1)
    gw.setRules([])
    expect(gw.viewSource().length).toBe(2)
  })

  it('bounds memory at capacity and reports drops', () => {
    const { emit } = armTail()
    const gw = new LogsGateway({}, 3)
    gw.startTail()
    for (let i = 0; i < 10; i++) emit(raw(`m${i}`))
    expect(gw.viewSource().length).toBe(3)
    expect(gw.rawDropped()).toBe(7)
  })

  it('stopTail stops the reader and reports stopped', () => {
    armTail()
    const gw = new LogsGateway({}, 10)
    gw.startTail()
    gw.stopTail()
    expect(stopTailing).toHaveBeenCalled()
    expect(gw.getStatus()).toBe('stopped')
    expect(gw.isTailing()).toBe(false)
  })

  it('a dying tail surfaces through status, never throws', async () => {
    startTailingWithChannelAjax.mockImplementationOnce(() => Promise.reject(new Error('auth')))
    const gw = new LogsGateway({}, 10)
    gw.startTail()
    await new Promise((resolve) => { setTimeout(resolve, 5) })
    expect(gw.getStatus()).toBe('stopped')
  })

  it('startTail is idempotent while running', () => {
    armTail()
    const gw = new LogsGateway({}, 10)
    gw.startTail()
    gw.startTail()
    expect(startTailingWithChannelAjax).toHaveBeenCalledTimes(1)
  })
})
