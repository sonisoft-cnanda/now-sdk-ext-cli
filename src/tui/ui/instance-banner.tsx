import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useEffect } from 'react'

import type { AmbientState } from '../data/ambient.gateway.js'

import { useSession } from '../context/session-context.js'
import { useUi } from '../context/ui-context.js'
import { useAsyncResource } from '../hooks/use-async-resource.js'
import { isHighRiskEnv, theme } from './theme.js'

const AMBIENT_REFRESH_MS = 60 * 1000

export interface InstanceBannerProps {
  columns: number
}

/**
 * Row 1, every pane, never scrolled, never covered. The answer to the
 * classic ServiceNow mistake: env badge, alias, RESOLVED HOST (always —
 * aliases lie), user, scope, current update set (permanent warning glyph on
 * Default), all visible on every frame.
 *
 * prod/unknown render the entire row inverse for the whole session, with
 * the env text at both ends so the signal survives NO_COLOR.
 */
export function InstanceBanner(props: InstanceBannerProps): ReactElement {
  const session = useSession()
  const { glyphs } = useUi()
  const ambient = useAsyncResource<AmbientState>()
  const { run } = ambient

  useEffect(() => {
    const load = () => {
      run(() => session.gateway.ambient.getAmbient())
    }

    load()
    const timer = setInterval(load, AMBIENT_REFRESH_MS)
    return () => {
      clearInterval(timer)
    }
  }, [run, session])

  const envLabel = session.env.toUpperCase()
  const highRisk = isHighRiskEnv(session.env)
  const envColor = theme.env[session.env]

  const state = ambient.resource
  // Real update-set names run long ("Telegram Compliance Demo - SAM…") and a
  // wrapped banner breaks the whole frame-height budget — clamp both values.
  const clamp = (value: string, max: number) =>
    value.length > max ? value.slice(0, max - 1) + glyphs.ellipsis : value
  const scope = clamp(state.status === 'ready' ? state.data.scope : '…', 24)
  const setName = clamp(state.status === 'ready' ? state.data.updateSetName : '…', 28)
  const setWarn = state.status === 'ready' && state.data.updateSetIsDefault

  const host = session.host.replace(/^https?:\/\//, '')
  const narrow = props.columns < 100
  const sep = ` ${glyphs.separator} `

  const body = [
    `${session.alias}  ${host}`,
    // OAuth credentials have no username — omit rather than print blank.
    ...(narrow || !session.user ? [] : [session.user]),
    `scope ${scope}`,
    `set ${setName}${setWarn ? ` ${glyphs.warn}` : ''}`,
    ...(session.readOnly ? ['READ-ONLY'] : []),
  ].join(sep)

  return (
    <Box>
      <Text backgroundColor={highRisk ? envColor : undefined} bold color={highRisk ? 'black' : envColor} inverse={highRisk}>
        {` ${envLabel} `}
      </Text>
      <Text inverse={highRisk}> {body} </Text>
      {highRisk ? <Text bold inverse>{` ${envLabel} `}</Text> : null}
    </Box>
  )
}
