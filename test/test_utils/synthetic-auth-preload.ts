import {join} from 'node:path'

/** Preload that stubs getCredentials on every installed SDK auth copy. */
export function syntheticAuthPreload(root: string): string {
  return `
import {createRequire} from 'node:module';
const require = createRequire(${JSON.stringify(join(root, 'package.json'))});
const coreRequire = createRequire(require.resolve('@sonisoft/now-sdk-ext-core/package.json'));
const {logger} = require('@servicenow/sdk-cli/dist/logger/index.js');
const credentials = {
  type: 'oauth',
  instanceUrl: 'https://example.service-now.com',
  access_token: 'synthetic-access',
  refresh_token: 'synthetic-refresh',
  token_type: 'Bearer',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};
const getCredentials = async () => {
  logger.info('Access Token has expired, refreshing token');
  return credentials;
};
for (const load of [require, coreRequire]) {
  try {
    load('@servicenow/sdk-cli/dist/auth/index.js').getCredentials = getCredentials;
  } catch {}
}
`
}

export function syntheticFetchPreload(passLoopback = false): string {
  return `
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input));
  ${passLoopback ? "if (url.hostname === '127.0.0.1') return realFetch(input, options);" : ''}
  if (url.pathname === '/angular.do') {
    return new Response(JSON.stringify({result: {user_id: 'fixture-user', user_name: 'tester'}}), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'JSESSIONID=synthetic-cookie; Path=/; Secure; HttpOnly; Max-Age=600',
      },
    });
  }
  return new Response(JSON.stringify({result: []}), {headers: {'Content-Type': 'application/json'}});
};
`
}