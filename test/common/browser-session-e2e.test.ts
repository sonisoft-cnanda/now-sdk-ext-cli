import {describe, expect, it} from '@jest/globals'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'

describe('browser session command', () => {
  it('returns metadata JSON and writes cookie-only state without SDK stdout or secrets', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'nex-browser-e2e-'))
    const root = resolve(process.cwd())
    const statePath = join(directory, 'state.json')
    const preload = join(directory, 'fixture.mjs')
    try {
      await writeFile(preload, `
import {createRequire} from 'node:module';
const require=createRequire(${JSON.stringify(join(root, 'package.json'))});
const auth=require('@servicenow/sdk-cli/dist/auth/index.js');
const {logger}=require('@servicenow/sdk-cli/dist/logger/index.js');
auth.getCredentials=async()=>{
 logger.info('Access Token has expired, refreshing token');
 return {type:'oauth',instanceUrl:'https://example.service-now.com',access_token:'synthetic-access',
 refresh_token:'synthetic-refresh',token_type:'Bearer',expires_at:Math.floor(Date.now()/1000)+3600};
};
globalThis.fetch=async(input,options)=>{
 const url=new URL(String(input));
 if(url.pathname==='/angular.do')return new Response(JSON.stringify({result:{user_id:'fixture-user',user_name:'tester'}}),
 {headers:{'Content-Type':'application/json','Set-Cookie':'JSESSIONID=synthetic-cookie; Path=/; Secure; HttpOnly; Max-Age=600'}});
 return new Response(JSON.stringify({result:[]}),{headers:{'Content-Type':'application/json'}});
};
`)
      const env = {...process.env, SN_CRED_STORE: 'file', SN_CRED_STORE_PATH: join(directory, 'credentials.json'),
        SN_CRED_STORE_DISABLE: ''}
      delete env.NODE_ENV
      for (const key of Object.keys(env)) if (key.startsWith('JEST_')) delete env[key]
      const {stdout, stderr} = await promisify(execFile)(process.execPath,
        ['--import', preload, join(root, 'bin/run.js'), 'auth', 'browser-session', '-a', 'fixture',
          '--cred-store', '--output', statePath, '--json'],
        {env, timeout: 30000})
      const metadata: unknown = JSON.parse(stdout)
      expect(JSON.stringify(metadata)).toContain(statePath)
      expect(stdout + stderr).not.toMatch(/synthetic-(access|refresh|cookie)/)
      expect(stdout).not.toContain('[now-sdk]')
      const state = JSON.parse(await readFile(statePath, 'utf8')) as {cookies: Array<{expires: number; httpOnly: boolean}>; origins: unknown[]}
      expect(state.cookies).toHaveLength(1)
      expect(state.cookies[0].expires).toBeGreaterThan(Date.now() / 1000)
      expect(state.cookies[0].httpOnly).toBe(true)
      expect(state.origins).toEqual([])
    } finally { await rm(directory, {recursive: true, force: true}) }
  }, 40000)
})
