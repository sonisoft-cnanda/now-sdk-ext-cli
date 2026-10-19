import {reader} from '../../scripts/metadata/cli.mjs'

try {
  const rows = reader(process.argv[2], {alias: 'metadata-fixture'})
    .rows('sys_script_include', `sys_id=${'b'.repeat(32)}`, 'sys_id,name')
  process.stdout.write(JSON.stringify({records: rows}) + '\n')
} catch {
  process.stderr.write('Read evidence refused.\n')
  process.exitCode = 1
}
