import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {createHash} from 'node:crypto'
import {existsSync} from 'node:fs'
import {mkdtemp, readFile, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {promisify} from 'node:util'
import {createRequire} from 'node:module'
import {packageTreeDigest} from './controls.mjs'

const execute = promisify(execFile)
const root = resolve(import.meta.dirname, '../..')
assert.ok(existsSync(join(root, 'dist/commands/metadata/insert.js')), 'Build the candidate before package evaluations.')
const directory = await mkdtemp(join(process.env.PAPERCLIP_SCRATCH_DIR || tmpdir(), 'nex-metadata-package-'))
const sourceSha = (await execute('git', ['rev-parse', 'HEAD'], {cwd: root})).stdout.trim()
const dirty = Boolean((await execute('git', ['status', '--porcelain', '--untracked-files=normal'], {cwd: root})).stdout.trim())
const readme = await readFile(join(root, 'README.md'))
let packed
try {
  packed = await execute('npm', ['pack', '--json', '--pack-destination', directory], {cwd: root, maxBuffer: 8 * 1024 * 1024})
} finally {
  // prepack regenerates all help, including unrelated stale sections and the local
  // Node version. Keep the caller's source checkout intact after packaging.
  await writeFile(join(root, 'README.md'), readme)
}
// oclif writes lifecycle progress before npm's JSON, even with --json.
const jsonStart = packed.stdout.lastIndexOf('\n[\n')
const [manifest] = JSON.parse(jsonStart === -1 ? packed.stdout : packed.stdout.slice(jsonStart + 1))
for (const path of ['oclif.manifest.json', 'dist/commands/metadata/insert.js', 'dist/commands/metadata/update.js', 'dist/commands/metadata/delete.js']) {
  assert.ok(manifest.files.some(file => file.path === path), `Candidate package is missing ${path}`)
}
const tarball = join(directory, manifest.filename)
const digest = createHash('sha256').update(await readFile(tarball)).digest('hex')
// npm run forwards .npmrc's allow-scripts through an env setting that nested
// project installs reject (npm/cli#9912). Keep file policy intact and disable
// every install script; remove only that unsupported forwarded setting.
const installEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'npm_config_allow_scripts'))
await execute('npm', ['install', '--prefix', directory, '--ignore-scripts', '--no-audit', '--no-fund', tarball],
  {cwd: directory, env: installEnvironment, timeout: 240_000, maxBuffer: 8 * 1024 * 1024})
const packageRoot = join(directory, 'node_modules/@sonisoft/now-sdk-ext-cli')
const cliBin = join(packageRoot, 'bin/run.js')
const environment = {...process.env, NEX_METADATA_CLI_BIN: cliBin}
// Child evaluations create and verify an isolated fabricated credential store.
const tested = await execute(process.execPath, ['--experimental-vm-modules', join(root, 'node_modules/jest/bin/jest.js'), '--runInBand', '--runTestsByPath', 'test/common/metadata-eval.test.ts'],
  {cwd: root, env: environment, timeout: 1_200_000, maxBuffer: 8 * 1024 * 1024})
process.stdout.write(tested.stdout)
process.stderr.write(tested.stderr)
for (const command of [['metadata', 'insert'], ['metadata', 'update'], ['metadata', 'delete'], ['query']]) {
  const help = await execute(process.execPath, [cliBin, ...command, '--help'], {cwd: directory, timeout: 30_000})
  for (const flag of ['--auth', '--cred-store', '--read-only', '--deny-write', '--log-dir', '--json']) assert.ok(help.stdout.includes(flag), `Missing inherited flag ${flag}`)
}
const core = JSON.parse(await readFile(createRequire(cliBin).resolve('@sonisoft/now-sdk-ext-core/package.json'), 'utf8')).version
assert.equal(core, '6.8.0', 'Candidate must resolve the reviewed core version.')
const receipt = {sourceSha, sourceDirty: dirty, packageDigest: digest, packageTreeDigest: packageTreeDigest(packageRoot), tarball, cliBin, packageRoot, node: process.version, core}
const receiptPath = join(directory, 'candidate.json')
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', {mode: 0o600})
process.stdout.write(JSON.stringify({...receipt, receiptPath}, null, 2) + '\n')
