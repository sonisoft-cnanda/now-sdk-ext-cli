import { Flags } from '@oclif/core'
import { BehaviorDetailOptions } from '@sonisoft/now-sdk-ext-core'

/** Shared controls for table discovery and direct behavior retrieval. */
export const behaviorFlags = {
  'dependency-depth': Flags.integer({ default: 0, description: 'Expand one dependency level; requires --details dependencies', max: 1, min: 0 }),
  details: Flags.option({ description: 'Include selected detail now; repeat for multiple kinds', multiple: true, options: ['scripts', 'definitions', 'dependencies'] as const })(),
  json: Flags.boolean({ default: false, description: 'Emit one JSON document' }),
  'max-bytes': Flags.integer({ default: 65_536, description: 'Maximum JSON response bytes; omissions include retrieval references', max: 1_048_576, min: 4096 }),
  scope: Flags.string({ description: 'Transaction scope for flow definition reads' }),
}

/** Translate CLI flag spelling into core options. */
export function behaviorOptions(flags: {
  'dependency-depth': number
  details?: BehaviorDetailOptions['details']
  'max-bytes': number
  scope?: string
}): BehaviorDetailOptions {
  return { dependencyDepth: flags['dependency-depth'] as 0 | 1, details: flags.details, maxBytes: flags['max-bytes'], scope: flags.scope }
}
