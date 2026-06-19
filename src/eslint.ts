/**
 * @license MIT
 * svelte-tiny-i18n/eslint
 * Copyright (c) 2025 Shiritai (Yang Tzu-Ching)
 *
 * A flat-config ESLint plugin. Its sole rule, `no-key-assertion`, bans the
 * type-cast escape hatch (`$t('x' as Parameters<typeof $t>[0])`) that silences
 * the key type guard, pushing you to add the key to your i18n config instead.
 * It fires only on a STATICALLY-KNOWN key (a string literal or a template with
 * no expressions): only there could the type system have caught the missing
 * key, so only there is the cast a real escape hatch. A dynamic-key cast
 * (`$t(key as ...)`, `` $t(`a.${x}` as ...) ``) is a legitimate bridge the
 * guard could never have checked, so flagging it would be a false positive.
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

// TS cast nodes (TSAsExpression/TSTypeAssertion) live outside ESTree's `Rule.Node`
// union, so the assertion helpers work against this loose structural shape.
type AnyNode = { type: string; expression?: AnyNode; value?: unknown; expressions?: unknown[] };

function isAssertion(node: AnyNode | undefined): node is AnyNode & { expression: AnyNode } {
    return node?.type === 'TSAsExpression' || node?.type === 'TSTypeAssertion';
}

/**
 * Peels nested casts (e.g. `('x' as A) as B`) down to the underlying value, so
 * we judge whether the cast wraps a static key rather than another cast.
 */
function unwrapAssertions(node: AnyNode): AnyNode {
    let inner = node;
    while (isAssertion(inner)) inner = inner.expression;
    return inner;
}

/**
 * A "static key": a value the key type guard could have checked on its own -- a
 * string literal, or a template literal with no interpolations. Anything else
 * (identifier, member/call expression, interpolating template, etc.) is dynamic
 * and unknowable to the type system, so a cast around it is not an escape hatch.
 */
function isStaticKey(node: AnyNode): boolean {
    if (node.type === 'Literal') return typeof node.value === 'string';
    return node.type === 'TemplateLiteral' && node.expressions?.length === 0;
}

const noKeyAssertion: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Disallow type assertions on STATIC i18n key arguments (literal / no-expression template), which silence a key type guard the compiler could have enforced. Dynamic-key casts are intentionally allowed.',
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

                const firstArg = node.arguments[0] as unknown as AnyNode | undefined;
                if (!isAssertion(firstArg)) return;

                // Only a cast wrapping a static key is an escape hatch: the
                // type system could have flagged a wrong literal but not a
                // dynamic value, so leave dynamic-key casts alone.
                const inner = unwrapAssertions(firstArg);
                if (!isStaticKey(inner)) return;

                // Report on the cast; unwrapping to the literal lets the genuine
                // type error (a key not in the config) surface again.
                const castNode = firstArg as unknown as Rule.Node;
                context.report({
                    node: castNode,
                    messageId: 'noKeyAssertion',
                    fix: (fixer) =>
                        fixer.replaceText(
                            castNode,
                            sourceCode.getText(inner as unknown as Rule.Node)
                        )
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
