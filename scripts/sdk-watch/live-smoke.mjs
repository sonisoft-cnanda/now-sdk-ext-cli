#!/usr/bin/env node
// Live, read-only check of the built `nex` after an SDK/dependency bump.
//
// Usage: SN_INSTANCE_ALIAS=<non-prod alias> SN_CRED_STORE=file node scripts/sdk-watch/live-smoke.mjs
//   optional: QA_APP_SCOPE=<a sys_app scope>        expect `nex exec` to run in that scope
//             QA_STORE_APP_SCOPE=<a sys_store_app>   expect exit 2 naming the store app
// Needs `npm run build`. Uses --cred-store (credentials from sn-credstore) and runs only
// gs.info() scripts and reads. Use a development instance or PDI, never production.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const alias = process.env.SN_INSTANCE_ALIAS?.trim();
if (!alias) {
    process.stderr.write('Set SN_INSTANCE_ALIAS to a configured, non-production alias.\n');
    process.exit(2);
}
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const work = mkdtempSync(join(tmpdir(), 'nex-live-'));
const marker = `SDK_QA_${Date.now()}`;
const scriptFile = join(work, 'scope.js');
writeFileSync(scriptFile, `gs.info('${marker}=' + gs.getCurrentScopeName());\n`);

const nex = (...args) => {
    const r = spawnSync(process.execPath, [join(root, 'bin/run.js'), ...args, '-a', alias, '--cred-store'],
        { encoding: 'utf8', timeout: 180_000 });
    return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
};
const checks = [];
function check(name, run) {
    let pass = false;
    let detail;
    try {
        detail = run();
        pass = true;
    } catch (err) {
        detail = err.message;
    }
    checks.push({ name, pass, detail });
    process.stderr.write(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}\n`);
}
const expect = (cond, message) => {
    if (!cond) throw new Error(message);
};
const oneLine = (s) => s.replace(/\s+/g, ' ').trim().slice(0, 300);

check('query reads the Global scope record', () => {
    const r = nex('query', '-t', 'sys_scope', '-q', 'sys_id=global', '-f', 'sys_id,name', '-j', '--read-only');
    expect(r.code === 0, `exit ${r.code}: ${oneLine(r.out)}`);
    const json = JSON.parse(r.out.slice(r.out.indexOf('{'), r.out.lastIndexOf('}') + 1));
    expect(json.records?.[0]?.sys_id === 'global', `unexpected records: ${JSON.stringify(json.records)}`);
    return 'sys_id=global';
});
check('exec global runs in the Global scope', () => {
    const r = nex('exec', 'global', scriptFile);
    expect(r.code === 0 && r.out.includes(`${marker}=rhino.global`), `exit ${r.code}: ${oneLine(r.out)}`);
    return `${marker}=rhino.global`;
});
check('exec refuses an unknown scope with exit 2', () => {
    const r = nex('exec', 'x_sdk_qa_no_such_scope', scriptFile);
    expect(r.code === 2 && /No application with scope/.test(r.out), `exit ${r.code}: ${oneLine(r.out)}`);
    return 'exit 2, SCOPE_NOT_FOUND message';
});
if (process.env.QA_STORE_APP_SCOPE) {
    check(`exec refuses store app ${process.env.QA_STORE_APP_SCOPE}`, () => {
        const r = nex('exec', process.env.QA_STORE_APP_SCOPE, scriptFile);
        expect(r.code === 2 && /sys_store_app/.test(r.out), `exit ${r.code}: ${oneLine(r.out)}`);
        return 'exit 2, names the store app';
    });
}
if (process.env.QA_APP_SCOPE) {
    check(`exec runs in sys_app ${process.env.QA_APP_SCOPE}`, () => {
        const r = nex('exec', process.env.QA_APP_SCOPE, scriptFile);
        expect(r.code === 0 && r.out.includes(`${marker}=${process.env.QA_APP_SCOPE}`), `exit ${r.code}: ${oneLine(r.out)}`);
        return `${marker}=${process.env.QA_APP_SCOPE}`;
    });
}
rmSync(work, { recursive: true, force: true });

const pass = checks.every((c) => c.pass);
process.stdout.write(`${JSON.stringify({ alias, pass, checks }, null, 2)}\n`);
process.exit(pass ? 0 : 1);
