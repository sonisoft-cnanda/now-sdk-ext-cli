 
 
import type { Creds } from '@servicenow/sdk-cli-core/dist/command/auth';

import { getCredentials } from "@servicenow/sdk-cli/dist/auth/index.js";
import { ServiceNowInstance, ServiceNowSettingsInstance } from '@sonisoft/now-sdk-ext-core';

export interface ScopeInfo {
  name: string;
  scope: string;
}

interface ScopeRecord {
  name: string;
  scope: string;
}

interface TableAPIResponse {
  result: ScopeRecord[];
}

/**
 * Get authorization header based on credential type
 * @param credential - ServiceNow credential object
 * @param username - Username for basic auth
 * @returns Authorization header string
 */
function getAuthHeader(credential: Creds, username: string): string {
  if (credential.type === 'basic' && 'password' in credential) {
    return `Basic ${Buffer.from(`${username}:${credential.password}`).toString('base64')}`;
  }

 if (credential.type === 'oauth' && 'access_token' in credential) {
    return `Bearer ${credential.access_token}`;
  }

  throw new Error('Unsupported authentication type');
}

/**
 * Query ServiceNow for available scopes matching a prefix
 * @param authAlias - Authentication alias to use
 * @param prefix - Prefix to filter scopes by
 * @returns Promise resolving to array of scope names
 */
export async function queryScopes(authAlias: string | undefined, prefix: string = ''): Promise<string[]> {
  try {
    // Get credentials
   
    const credential = await getCredentials(authAlias || "fluent-default");

    if (!credential) {
      // Returning no completions is the only sane behaviour here — a shell
      // completion hook cannot print an error without corrupting the candidate
      // list. But "no scopes" and "credentials unreadable" look identical, so
      // leave a breadcrumb for anyone debugging why completion went quiet.
      if (process.env.SN_CRED_STORE_DEBUG) {
        process.stderr.write(
          `[nex] scope completion: no credentials for "${authAlias || 'fluent-default'}"` +
            `${process.env.NOW_SDK_KEYCHAIN_PATCHED === '1' ? '' : ' (credential shim NOT active)'}\n`,
        );
      }

      return [];
    }

    // Create ServiceNow instance
    const snSettings: ServiceNowSettingsInstance = {
      alias: authAlias,
      credential
    };
    const instance = new ServiceNowInstance(snSettings);

    // Query sys_scope table via REST API
    const url = `${instance.getHost()}/api/now/table/sys_scope`;
    const params = new URLSearchParams({
      sysparm_fields: 'scope,name',
      sysparm_limit: '50',
      sysparm_query: prefix ? `scopeSTARTSWITH${prefix}^ORnameSTARTSWITH${prefix}` : ''
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': getAuthHeader(credential, instance.getUserName()),
        'Content-Type': 'application/json'
      },
      method: 'GET'
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as TableAPIResponse;
    const scopes: string[] = [];

    if (data.result && Array.isArray(data.result)) {
      for (const record of data.result) {
        if (record.scope) {
          scopes.push(record.scope);
        }
      }
    }

    return scopes;
  } catch {
    // Silently fail for autocomplete
    return [];
  }
}

/**
 * Cache for storing scope query results
 */
const scopeCache = new Map<string, { scopes: string[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached scopes or query if needed
 * This provides a simple caching mechanism to speed up autocomplete
 * @param authAlias - Authentication alias to use
 * @param prefix - Prefix to filter scopes by
 * @returns Promise resolving to array of scope names
 */
export async function getCachedScopes(authAlias: string | undefined, prefix: string = ''): Promise<string[]> {
  const cacheKey = `${authAlias || 'default'}:${prefix}`;
  const cached = scopeCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.scopes;
  }

  const scopes = await queryScopes(authAlias, prefix);
  scopeCache.set(cacheKey, { scopes, timestamp: Date.now() });
  
  return scopes;
}

