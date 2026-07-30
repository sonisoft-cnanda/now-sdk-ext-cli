/**
 * Unit tests for the argv secret check (NEX-54).
 *
 * The risk profile here is lopsided: a missed detection costs a warning nobody
 * saw, but a false positive blocks legitimate work outright. `nex exec` takes
 * arbitrary scripts and --query/--filter/--data/--payload/--spec all take
 * arbitrary text, so most of these tests are about NOT firing.
 */

import {describe, expect, it} from '@jest/globals'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- plain JS module in bin/, deliberately not part of the TS build
import {findSecretArgument, secretArgumentMessage} from '../../bin/argv-secrets.js'

describe('findSecretArgument', () => {
    describe('detects a secret carrying a value', () => {
        it.each([
            ['--password', 'hunter2'],
            ['--client-secret', 'abc123'],
            ['--token', 'eyJhbGciOi'],
            ['--access-token', 'tok'],
            ['--refresh-token', 'tok'],
            ['--api-key', 'key'],
            ['--credential', 'c'],
        ])('separated form: %s', (flag, value) => {
            const found = findSecretArgument(['query', flag, value])
            expect(found).not.toBeNull()
            expect(found.flag).toBe(flag)
            expect(found.form).toBe('separate')
        })

        it.each([
            '--password=hunter2',
            '--client-secret=abc123',
            '--token=eyJhbGciOi',
            '--api-key=key',
        ])('inline form: %s', (arg) => {
            const found = findSecretArgument(['query', arg])
            expect(found).not.toBeNull()
            expect(found.form).toBe('inline')
        })

        it('is case-insensitive on the flag name', () => {
            expect(findSecretArgument(['--PASSWORD', 'x'])).not.toBeNull()
        })

        it('finds a secret anywhere in the argument list', () => {
            expect(findSecretArgument(['query', '--table', 'incident', '--token', 't'])).not.toBeNull()
        })
    })

    describe('does not fire without an actual value', () => {
        it('ignores a trailing flag with nothing after it', () => {
            expect(findSecretArgument(['query', '--password'])).toBeNull()
        })

        it('ignores a flag followed by another flag', () => {
            expect(findSecretArgument(['--password', '--json'])).toBeNull()
        })

        it('ignores an empty inline value', () => {
            expect(findSecretArgument(['--password='])).toBeNull()
        })
    })

    describe('does not fire on legitimate arguments', () => {
        it('leaves ordinary commands alone', () => {
            expect(findSecretArgument(['query', '--table', 'incident', '--limit', '10'])).toBeNull()
        })

        it('leaves an encoded query alone even when it mentions a password field', () => {
            expect(
                findSecretArgument(['query', '--query', 'user_password!=NULL^active=true']),
            ).toBeNull()
        })

        it('leaves an exec script alone even when it contains the word password', () => {
            expect(
                findSecretArgument(['exec', 'global', '--params', '{"password":"in-a-payload"}']),
            ).toBeNull()
        })

        it('leaves a log filter alone', () => {
            expect(findSecretArgument(['log', '--filter', 'message CONTAINS token'])).toBeNull()
        })

        it('leaves --data and --payload alone, which carry arbitrary JSON', () => {
            expect(findSecretArgument(['bulk', 'update', '--data', '{"secret_field":"x"}'])).toBeNull()
            expect(findSecretArgument(['flow', 'message', '--payload', '{"token":"x"}'])).toBeNull()
        })

        it('does not match a short flag, which is too easily something else', () => {
            expect(findSecretArgument(['-p', 'value'])).toBeNull()
        })

        it('does not match a partial or unrelated long flag', () => {
            expect(findSecretArgument(['--password-file', 'p'])).toBeNull()
            expect(findSecretArgument(['--tokenize', 'x'])).toBeNull()
        })
    })

    describe('input handling', () => {
        it('returns null for an empty or non-array argv', () => {
            expect(findSecretArgument([])).toBeNull()
            expect(findSecretArgument(undefined)).toBeNull()
            expect(findSecretArgument(null)).toBeNull()
        })

        it('skips non-string entries rather than throwing', () => {
            expect(() => findSecretArgument(['query', 42, null, '--json'])).not.toThrow()
        })
    })
})

describe('secretArgumentMessage', () => {
    it('leads with the exposure, since that is the part the user must act on', () => {
        const message = secretArgumentMessage({flag: '--password'})
        expect(message).toContain('shell history')
        expect(message).toContain('process')
        expect(message).toMatch(/rotate/i)
    })

    it('names the offending flag and a concrete alternative', () => {
        const message = secretArgumentMessage({flag: '--client-secret'})
        expect(message).toContain('--client-secret')
        expect(message).toContain('nex auth list')
        expect(message).toMatch(/Remediation:/)
    })
})
