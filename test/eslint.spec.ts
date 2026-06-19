/** @vitest-environment node */

import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { parser } from 'typescript-eslint';
import { rules } from '../src/eslint';

// Use @typescript-eslint/parser (re-exported by typescript-eslint) so the
// TS-only cast nodes (TSAsExpression / TSTypeAssertion) are produced.
const ruleTester = new RuleTester({
    languageOptions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parser: parser as any,
        parserOptions: { ecmaVersion: 'latest', sourceType: 'module' }
    }
});

describe('eslint: no-key-assertion', () => {
    it('passes/fails as specified', () => {
        ruleTester.run('no-key-assertion', rules['no-key-assertion'], {
            valid: [
                // Plain literal key, no cast.
                { code: `$t('home.title');` },
                { code: `t('shared.ok');` },
                { code: `i18n.t('greeting.bye');` },
                // A cast on a non-i18n call must be ignored.
                { code: `other('x' as Foo);` },
                // A cast that is not the FIRST argument must be ignored.
                { code: `$t('home.title', extra as Bar);` }
            ],
            invalid: [
                {
                    // `as` assertion escape hatch -> fixer unwraps to the literal.
                    code: `$t('x' as Parameters<typeof $t>[0]);`,
                    output: `$t('x');`,
                    errors: [{ messageId: 'noKeyAssertion' }]
                },
                {
                    // Angle-bracket assertion form.
                    code: `t(<string>'y');`,
                    output: `t('y');`,
                    errors: [{ messageId: 'noKeyAssertion' }]
                },
                {
                    // Member-expression callee `i18n.t`.
                    code: `i18n.t('z' as never);`,
                    output: `i18n.t('z');`,
                    errors: [{ messageId: 'noKeyAssertion' }]
                }
            ]
        });
    });
});
