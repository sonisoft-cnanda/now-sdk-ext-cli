/**
 * The frozen TUI session: one ServiceNowInstance, identity resolved once,
 * environment classified once, one gateway. Built OUTSIDE React and passed
 * through a stable context — a context whose value identity changes
 * re-renders every consumer, and at Ink's frame budget that is how the app
 * becomes unusable. Every mutable value lives in the store instead.
 *
 * The session carries the instance, never the credential. Credential
 * resolution stays in AuthenticatedCommand.init(); nothing under src/tui/
 * may import the auth module (enforced by no-restricted-imports).
 */
import type { InstanceEnv } from '../data/types.js'

import { NexGateway } from '../data/gateway.js'

/** Structural view of core's ServiceNowInstance — the two methods used. */
export interface InstanceLike {
  getHost(): string
  getUserName(): string
}

export interface TuiSession {
  readonly alias: string
  readonly env: InstanceEnv
  readonly gateway: NexGateway
  readonly host: string
  readonly readOnly: boolean
  readonly user: string
}

/**
 * Classify an alias/host into an environment. Order: explicit
 * NEX_TUI_ENV_<ALIAS> env var, then hostname heuristics. The default is
 * 'unknown', and every safety decision treats 'unknown' as prod — a
 * brand-new alias is the one most likely to be pointed somewhere
 * frightening, so it gets maximum protection, never a guess of "nonprod".
 */
export function classifyEnvironment(
  alias: string,
  host: string,
  env: NodeJS.ProcessEnv = process.env,
): InstanceEnv {
  const explicit = env[`NEX_TUI_ENV_${alias.toUpperCase().replaceAll(/[^\dA-Z]/g, '_')}`]
  if (explicit === 'dev' || explicit === 'prod' || explicit === 'test' || explicit === 'unknown') {
    return explicit
  }

  let hostname: string
  try {
    hostname = new URL(host).hostname
  } catch {
    hostname = host
  }

  if (/(^|[.-])(prd|prod)([.-]|$)/i.test(hostname)) return 'prod'
  if (/(^|[.-])dev\d*([.-]|$)/i.test(hostname)) return 'dev'
  if (/(^|[.-])(qa|sandbox|sb\d*|stage|staging|test|uat)\d*([.-]|$)/i.test(hostname)) return 'test'
  return 'unknown'
}

export interface CreateSessionOptions {
  alias: string
  instance: InstanceLike
  readOnly: boolean
}

export function createSession(options: CreateSessionOptions): TuiSession {
  const host = options.instance.getHost()
  const user = options.instance.getUserName()
  const env = classifyEnvironment(options.alias, host)
  const session: TuiSession = {
    alias: options.alias,
    env,
    gateway: new NexGateway(options.instance),
    host,
    readOnly: options.readOnly,
    user,
  }
  return Object.freeze(session)
}
