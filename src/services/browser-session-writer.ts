import type {BrowserSession} from '@sonisoft/now-sdk-ext-core'

import {randomUUID} from 'node:crypto'
import {link, lstat, mkdir, open, rename, unlink} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'

/** Persist browser state without exposing credentials through command output. */
export async function writeBrowserSession(session: BrowserSession, output: string, force = false): Promise<string> {
  const path = resolve(output)
  const parent = dirname(path)
  await mkdir(parent, {mode: 0o700, recursive: true})
  try {
    const existing = await lstat(path)
    if (existing.isSymbolicLink() || !existing.isFile()) throw new Error('Auth output must be a regular file.')
    if (!force) throw new Error('Auth output exists. Use --force to replace it.')
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  const temporary = resolve(parent, '.auth-' + randomUUID())
  try {
    const handle = await open(temporary, 'wx', 0o600)
    try {
      await handle.writeFile(JSON.stringify(session.storageState))
      await handle.sync()
    } finally { await handle.close() }

    if (force) {
      const current = await lstat(path).catch((error: unknown) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
        throw error
      })
      if (current && (!current.isFile() || current.isSymbolicLink())) throw new Error('Auth output must be a regular file.')
      await rename(temporary, path)
    } else {
      await link(temporary, path)
    }

    return path
  } finally {
    await unlink(temporary).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
  }
}
