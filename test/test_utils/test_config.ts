/**
 * Default live-test alias. Change it here — not in individual tests — or override
 * with `SN_INSTANCE_ALIAS` in the environment.
 *
 *   SN_INSTANCE_ALIAS=strongtiedev npm run test:integration:auth
 */
export const DEFAULT_SN_INSTANCE_ALIAS = 'dev206299'

/**
 * ServiceNow instance alias used for live tests.
 * Tests must import this constant instead of embedding an instance name.
 */
export const SN_INSTANCE_ALIAS: string =
  process.env.SN_INSTANCE_ALIAS?.trim() || DEFAULT_SN_INSTANCE_ALIAS
