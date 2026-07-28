import { Config } from '@oclif/core'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let cachedConfig: Config | null = null

/**
 * Load a real OCLIF Config object for the project.
 * Cached after first load for performance.
 */
export async function getTestConfig(): Promise<Config> {
  if (!cachedConfig) {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const root = path.resolve(__dirname, '../../')
    cachedConfig = await Config.load({ root })
  }
  return cachedConfig
}
