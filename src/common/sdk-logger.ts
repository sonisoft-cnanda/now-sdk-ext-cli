import {logger as sdkLogger} from '@servicenow/sdk-cli/dist/logger/index.js'
import {createRequire} from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Silence every installed SDK logger copy.
 *
 * Core 6.6.0 may nest `@servicenow/sdk-cli` 4.12 beside the CLI's own copy.
 * `createBrowserSession` logs through that nested logger, so silencing only
 * the top-level import leaks `[now-sdk]` refresh lines onto stdout.
 */
export function silenceSdkLoggers(): void {
  sdkLogger.setLevel('silent')
  try {
    const coreRequire = createRequire(require.resolve('@sonisoft/now-sdk-ext-core/package.json'))
    coreRequire('@servicenow/sdk-cli/dist/logger/index.js').logger.setLevel('silent')
  } catch {
    // A single sdk-cli copy is enough.
  }
}