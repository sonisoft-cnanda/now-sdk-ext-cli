/**
 * Tier-2 gate + shell chrome checks. Substring assertions only — the
 * convention test/services follows, and the only thing that survives a
 * theme change.
 */
import { describe, expect, it } from '@jest/globals'
import { render } from 'ink-testing-library'
import { createElement } from 'react'

import type { TuiSession } from '../../src/tui/boot/session.js'

import { App } from '../../src/tui/app.js'

function fakeSession(overrides: Partial<TuiSession> = {}): TuiSession {
  const gateway = {
    ambient: {
      getAmbient: async () => ({ scope: 'x_acme_core', updateSetIsDefault: true, updateSetName: 'Default' }),
      invalidate() {},
    },
    disposeAll() {},
    logs: {
      capacity: 5000,
      getRules: () => [],
      getStatus: () => 'connecting',
      hiddenRatio: () => 0,
      isTailing: () => true,
      rawDropped: () => 0,
      setRules() {},
      snapshot: () => [],
      startTail() {},
      stopTail() {},
      version: 0,
      viewSource: () => ({ at: () => { throw new Error('empty') }, length: 0 }),
    },
    records: {
      countQuery: async () => 2,
      fetchPage: async () => ({
        fetchedAt: Date.now(),
        hasMore: false,
        limit: 25,
        offset: 0,
        query: '',
        rows: [
          { cells: { number: { displayValue: 'INC0010001', value: 'INC0010001' }, short_description: { displayValue: 'Email down', value: 'Email down' } }, sysId: 'a' },
          { cells: { number: { displayValue: 'INC0010002', value: 'INC0010002' }, short_description: { displayValue: 'VPN drops', value: 'VPN drops' } }, sysId: 'b' },
        ],
        table: 'incident',
      }),
      fetchRecord: async () => undefined,
      getChoices: async () => [],
      getSchema: async () => ({ fields: [], label: 'Incident', table: 'incident' }),
      listTables: async () => [{ label: 'Incident', name: 'incident' }],
    },
    registerDisposer: () => () => {},
  }

  return Object.freeze({
    alias: 'dev',
    env: 'dev',
    gateway: gateway as unknown as TuiSession['gateway'],
    host: 'https://dev12345.service-now.com',
    readOnly: false,
    user: 'admin',
    ...overrides,
  }) as TuiSession
}

const flush = async (ms = 20) => new Promise((resolve) => { setTimeout(resolve, ms) })

describe('App shell', () => {
  it('renders the banner identity: alias, resolved host, env badge', async () => {
    const { lastFrame, unmount } = render(createElement(App, { initialTable: 'incident', session: fakeSession() }))
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('DEV')
    expect(frame).toContain('dev12345.service-now.com')
    expect(frame).toContain('Records')
    unmount()
  })

  it('shows ambient scope and flags the Default update set', async () => {
    const { lastFrame, unmount } = render(createElement(App, { initialTable: 'incident', session: fakeSession() }))
    await flush(50)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('x_acme_core')
    expect(frame).toContain('Default')
    unmount()
  })

  it('marks a read-only session in the banner', async () => {
    const { lastFrame, unmount } = render(
      createElement(App, { initialTable: 'incident', session: fakeSession({ readOnly: true }) }),
    )
    await flush()
    expect(lastFrame() ?? '').toContain('READ-ONLY')
    unmount()
  })

  it('renders fetched records in the list', async () => {
    const { lastFrame, unmount } = render(createElement(App, { initialTable: 'incident', session: fakeSession() }))
    await flush(50)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('INC0010001')
    expect(frame).toContain('of 2')
    unmount()
  })

  it('opens the table picker when no table is given', async () => {
    const { lastFrame, unmount } = render(createElement(App, { session: fakeSession() }))
    await flush(50)
    expect(lastFrame() ?? '').toContain('Table')
    unmount()
  })

  it('? opens the help overlay derived from the registry', async () => {
    const { lastFrame, stdin, unmount } = render(
      createElement(App, { initialTable: 'incident', session: fakeSession() }),
    )
    await flush()
    stdin.write('?')
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Keymap')
    expect(frame).toContain('encoded query')
    unmount()
  })

  it('digit keys switch panes — Logs mounts the live pane', async () => {
    const { lastFrame, stdin, unmount } = render(
      createElement(App, { initialTable: 'incident', session: fakeSession() }),
    )
    await flush()
    stdin.write('2')
    await flush(150)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('FOLLOW')
    expect(frame).toContain('Waiting for log traffic')
    unmount()
  })
})
