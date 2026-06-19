/**
 * @license MIT
 * svelte-tiny-i18n/eslint
 * Copyright (c) 2025 Shiritai (Yang Tzu-Ching)
 *
 * A flat-config ESLint plugin. Its sole rule, `no-key-assertion`, bans the
 * type-cast escape hatch (`$t('x' as Parameters<typeof $t>[0])`) that silences
 * the key type guard, pushing you to add the key to your i18n config instead.
 * `eslint` stays a peer dependency; this file is type-only against it.
 * https://github.com/Shiritai/svelte-tiny-i18n
 */

import type { Rule } from 'eslint';

/** Options for the `no-key-assertion` rule. */
interface NoKeyAssertionOptions {
    /** Call names treated as translation lookups. @default ['$t','t','i18n.t'] */
    callees?: string[];
}

const DEFAULT_CALLEES = ['$t', 't', 'i18n.t'];

/**
 * Resolves a call expression's callee to its source-name, e.g. `$t` or
 * `i18n.t`, so it can be compared against the configured `callees`. Returns
 * `null` for shapes we do not name (computed access, deeper chains, etc.).
 */
function calleeName(callee: Rule.Node): string | null {
    if (callee.type === 'Identifier') return callee.name;
    if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.object.type === 'Identifier' &&
        callee.property.type === 'Identifier'
    ) {
        return `${callee.object.name}.${callee.property.name}`;
    }
    return null;
}

const noKeyAssertion: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Disallow type assertions on i18n key arguments, which silence the key type guard',
            recommended: true
        },
        fixable: 'code',
        schema: [
            {
                type: 'object',
                properties: {
                    callees: { type: 'array', items: { type: 'string' } }
                },
                additionalProperties: false
            }
        ],
        messages: {
            noKeyAssertion:
                'Do not cast the i18n key with a type assertion; it silences the missing-key type guard. Add this key to your i18n config instead.'
        }
    },

    create(context) {
        const options = (context.options[0] ?? {}) as NoKeyAssertionOptions;
        const callees = options.callees ?? DEFAULT_CALLEES;
        const sourceCode = context.sourceCode ?? context.getSourceCode();

        return {
            CallExpression(node) {
                const name = calleeName(node.callee as Rule.Node);
                if (name === null || !callees.includes(name)) return;

                // TS-specific nodes (TSAsExpression/TSTypeAssertion) are absent
                // from ESTree's type union, so inspect the node structurally.
                const firstArg = node.arguments[0] as unknown as
                    | { type: string; expression?: Rule.Node }
                    | undefined;
                if (
                    !firstArg ||
                    (firstArg.type !== 'TSAsExpression' && firstArg.type !== 'TSTypeAssertion')
                ) {
                    return;
                }

                // The inner expression is the real key; unwrapping it lets the
                // genuine type error (a key not in the config) surface again.
                const inner = firstArg.expression;
                context.report({
                    node: firstArg,
                    messageId: 'noKeyAssertion',
                    fix: (fixer) =>
                        inner ? fixer.replaceText(firstArg, sourceCode.getText(inner)) : null
                });
            }
        };
    }
};

const plugin = {
    rules: {
        'no-key-assertion': noKeyAssertion
    }
};

/**
 * The rule map, keyed by name (`no-key-assertion`).
 *
 * ---
 *
 * 規則對應表，以名稱為 key（`no-key-assertion`）。
 */
export const rules = plugin.rules;

/**
 * Flat-config presets. `recommended` registers the plugin under the
 * `svelte-tiny-i18n` namespace and enables `no-key-assertion` as an error.
 *
 * ## Example
 * ```js
 * // eslint.config.js
 * import i18n from 'svelte-tiny-i18n/eslint';
 *
 * export default [i18n.configs.recommended];
 * ```
 *
 * ---
 *
 * Flat config 預設組。`recommended` 以 `svelte-tiny-i18n` 命名空間註冊本外掛，
 * 並將 `no-key-assertion` 啟用為 error。
 */
export const configs = {
    recommended: {
        plugins: { 'svelte-tiny-i18n': plugin },
        rules: { 'svelte-tiny-i18n/no-key-assertion': 'error' }
    }
} as const;

export default { rules, configs };
