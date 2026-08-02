/**
 * The NEX-73 acceptance test: under a 400-events/sec synthetic feed the
 * consumer re-renders at most ~10 times/sec — React subscribes to a
 * version counter on a fixed interval, never per event.
 */
import { describe, expect, it } from '@jest/globals'
import { Text } from 'ink'
import { render } from 'ink-testing-library'
import { createElement } from 'react'

import { useStreamVersion } from '../../../src/tui/hooks/use-stream-buffer.js'

describe('useStreamVersion', () => {
  it('caps consumer renders at the frame rate regardless of ingest rate', async () => {
    const source = { version: 0 }
    let renders = 0

    function Probe(): ReturnType<typeof Text> {
      renders += 1
      const version = useStreamVersion(source, 10)
      return createElement(Text, null, `v${version}`)
    }

    const view = render(createElement(Probe))

    // Synthetic firehose: bump the version 400 times over ~1s of real time
    // compressed to 500ms wall clock — far more events than frames.
    const start = Date.now()
    while (Date.now() - start < 500) {
      for (let i = 0; i < 40; i++) source.version += 1
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => { setTimeout(resolve, 25) })
    }

    // ~500ms at 10fps = ~5 ticks (+1 mount render, + jitter allowance).
    expect(renders).toBeLessThanOrEqual(10)

    // Let one more frame tick fire so the final version lands, then stop
    // the feed and assert convergence (the assertion must not race the
    // interval).
    const finalVersion = source.version
    await new Promise((resolve) => { setTimeout(resolve, 250) })
    expect(view.lastFrame()).toContain(`v${finalVersion}`)
    view.unmount()
  })

  it('does not re-render at all when the version is quiet', async () => {
    const source = { version: 7 }
    let renders = 0

    function Probe(): ReturnType<typeof Text> {
      renders += 1
      useStreamVersion(source, 20)
      return createElement(Text, null, 'quiet')
    }

    const view = render(createElement(Probe))
    await new Promise((resolve) => { setTimeout(resolve, 300) })
    // Mount render only — setState with an unchanged value bails out.
    expect(renders).toBeLessThanOrEqual(2)
    view.unmount()
  })
})
