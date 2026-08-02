/**
 * Semantic colour tokens. No component references a raw colour — everything
 * routes through these roles, which is what makes NO_COLOR a degradation
 * instead of a loss and keeps the palette changeable in one place.
 *
 * Values are ink <Text> colour names.
 */
import type { InstanceEnv } from '../data/types.js'

export const theme = {
  edit: {
    dirty: 'yellow',
    mandatory: 'red',
    readonly: 'gray',
  },
  env: {
    dev: 'green',
    prod: 'red',
    test: 'yellow',
    unknown: 'magenta',
  } satisfies Record<InstanceEnv, string>,
  fg: {
    accent: 'cyan',
    muted: 'gray',
  },
  state: {
    error: 'red',
    info: 'blue',
    ok: 'green',
    pending: 'gray',
    running: 'cyan',
    warn: 'yellow',
  },
} as const

/** Environments whose banner renders inverse for the whole session. */
export function isHighRiskEnv(env: InstanceEnv): boolean {
  return env === 'prod' || env === 'unknown'
}

/** ServiceNow priority value → colour role + high-priority marker. */
export function priorityStyle(value: string): { color?: string; marked: boolean } {
  switch (value) {
    case '1': {
      return { color: theme.state.error, marked: true }
    }

    case '2': {
      return { color: theme.state.error, marked: true }
    }

    case '3': {
      return { color: theme.state.warn, marked: false }
    }

    case '5': {
      return { color: theme.fg.muted, marked: false }
    }

    default: {
      return { marked: false }
    }
  }
}

/** Incident-family state value → colour role. */
export function taskStateStyle(value: string): string | undefined {
  switch (value) {
    case '1': {
      return theme.state.info
    }

    case '2': {
      return theme.state.running
    }

    case '3': {
      return theme.state.warn
    }

    case '6': {
      return theme.state.ok
    }

    case '7': {
      return theme.fg.muted
    }

    case '8': {
      return theme.fg.muted
    }

    default: {
      return undefined
    }
  }
}
