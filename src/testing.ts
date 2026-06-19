/**
 * @license MIT
 * svelte-tiny-i18n/testing
 * Copyright (c) 2025 Shiritai (Yang Tzu-Ching)
 *
 * A zero-dependency, Node/fs toolkit for auditing translation coverage.
 * It imports nothing from Svelte or the browser, so any consuming app can run
 * these checks in plain Node (vitest, a CI script, etc.) for free.
 * https://github.com/Shiritai/svelte-tiny-i18n
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { I18nConfig } from './svelte-tiny-i18n';

/**
 * The minimal shape this toolkit needs from an i18n config: the supported
 * locales (to know which keys count as leaves) and the translations to audit.
 *
 * ---
 *
 * 本工具所需的最小設定形狀：支援的語言（用來判斷哪些 key 算葉節點）與待稽核的翻譯。
 */
export type AuditableConfig = Pick<
    I18nConfig<readonly string[]>,
    'supportedLocales' | 'initialTranslations'
>;

/** Source-file extensions this toolkit scans. */
const SCANNED_EXTENSIONS = new Set(['.svelte', '.ts', '.js', '.mjs', '.cjs', '.mts', '.cts']);

/** Default call expressions treated as translation lookups, e.g. `$t('key')`. */
const DEFAULT_CALLEES = ['$t', 't', 'i18n.t'];

/**
 * Flattens a config's `initialTranslations` to dot-notation keys, mapping each
 * key to the per-locale string it provides. Mirrors the core's
 * `recursiveFlatten`: an object is a *leaf* when it contains a supported-locale
 * key whose value is a string; otherwise it is a nested scope to recurse into.
 *
 * - returns: `{ 'home.title': { en: 'Home', 'zh-TW': '首頁' }, ... }`
 *
 * ---
 *
 * 將設定的 `initialTranslations` 攤平成點分隔 key，並映射到各語言提供的字串。
 * 語意與核心的 `recursiveFlatten` 一致：物件含某支援語言 key 且其值為字串時視為
 * 葉節點，否則當作巢狀作用域繼續遞迴。
 */
export function flattenConfig(
    config: AuditableConfig
): Record<string, Partial<Record<string, string>>> {
    const { supportedLocales, initialTranslations = [] } = config;
    const result: Record<string, Partial<Record<string, string>>> = {};

    const recurse = (prefix: string, item: unknown): void => {
        if (typeof item !== 'object' || item === null) return;
        const node = item as Record<string, unknown>;
        const hasSupportedLocale = Object.keys(node).some((k) => supportedLocales.includes(k));

        if (hasSupportedLocale) {
            // Leaf node: collect every supported locale that maps to a string.
            const entry: Partial<Record<string, string>> = (result[prefix] ??= {});
            for (const locale of supportedLocales) {
                if (typeof node[locale] === 'string') entry[locale] = node[locale] as string;
            }
            return;
        }

        // Nested scope: descend, building the dotted key.
        for (const [key, value] of Object.entries(node)) {
            recurse(prefix ? `${prefix}.${key}` : key, value);
        }
    };

    for (const entry of initialTranslations) recurse('', entry);
    return result;
}

/**
 * Finds keys that lack a translation for one or more supported locales. A
 * locale counts as missing when it is absent OR maps to an empty string.
 *
 * - returns: `[{ key: 'bye', missing: ['zh-TW'] }, ...]`
 *
 * ---
 *
 * 找出缺少一個（或多個）支援語言翻譯的 key。語言不存在或對應空字串皆視為缺漏。
 */
export function findMissingLocales(config: AuditableConfig): { key: string; missing: string[] }[] {
    const { supportedLocales } = config;
    const flat = flattenConfig(config);
    const report: { key: string; missing: string[] }[] = [];

    for (const [key, entry] of Object.entries(flat)) {
        const missing = supportedLocales.filter((locale) => !entry[locale]);
        if (missing.length > 0) report.push({ key, missing });
    }
    return report;
}

/**
 * Finds keys that are entirely absent from the flattened config. Works for
 * statically scanned keys or any caller-supplied list (e.g. data-driven keys).
 *
 * ---
 *
 * 找出完全不存在於攤平設定中的 key。適用於靜態掃描出的 key，或呼叫者提供的清單
 * （例如資料驅動的 key）。
 */
export function findMissingKeys(config: AuditableConfig, keys: string[]): string[] {
    const flat = flattenConfig(config);
    return keys.filter((key) => !(key in flat));
}

/** A translation key used statically as a string literal, with its location. */
export interface StaticKeyHit {
    key: string;
    file: string;
}

/** A non-literal first argument to a translation call (cannot be checked statically). */
export interface DynamicKeyHit {
    file: string;
    snippet: string;
}

/** Result of {@link scanSourceKeys}. */
export interface ScanResult {
    staticKeys: StaticKeyHit[];
    dynamic: DynamicKeyHit[];
}

/**
 * Recursively scans source files for translation-call key usage.
 *
 * For every call to one of `callees` (default `['$t','t','i18n.t']`) it inspects
 * the FIRST argument:
 * - a string literal -> recorded under `staticKeys` (the cast escape hatch
 *   `$t('key' as Parameters<typeof $t>[0])` is unwrapped so the literal is caught);
 * - anything else (variable, template, expression) -> recorded under `dynamic`,
 *   since its key cannot be verified statically.
 *
 * `.svelte/.ts/.js/...` files are scanned; `node_modules` and dot-directories
 * are skipped. The match is regex-based (no AST) to keep this dependency-free.
 *
 * - param `paths` A file/dir path or array thereof to scan.
 * - param `opts.callees` Override the call names treated as lookups.
 *
 * ---
 *
 * 遞迴掃描原始碼中翻譯呼叫的 key 用法。對每個 `callees`（預設 `['$t','t','i18n.t']`）
 * 呼叫，檢查其「第一個參數」：字串字面值歸入 `staticKeys`（並會解開型別斷言逃生口
 * `$t('key' as ...)` 以攔到字面值）；其餘（變數、樣板、運算式）歸入 `dynamic`，因其
 * key 無法靜態驗證。掃描 `.svelte/.ts/.js/...`，略過 `node_modules` 與點開頭目錄。
 * 採正規式比對（不走 AST）以維持零依賴。
 */
export function scanSourceKeys(
    paths: string[] | string,
    opts: { callees?: string[] } = {}
): ScanResult {
    const callees = opts.callees ?? DEFAULT_CALLEES;
    const staticKeys: StaticKeyHit[] = [];
    const dynamic: DynamicKeyHit[] = [];

    // Match `<callee>(` then capture everything up to the matching first-arg
    // boundary (`,` at depth 0 or the closing `)`). `i18n.t` etc. need the dot
    // escaped; word boundary stops `xt(` matching `t(`.
    const calleePattern = callees.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const callRegex = new RegExp(`(?:^|[^\\w$.])(?:${calleePattern})\\s*\\(`, 'g');

    const visitFile = (file: string): void => {
        const source = readFileSync(file, 'utf8');
        callRegex.lastIndex = 0;
        // Each exec advances `lastIndex` to just past the `(` of the next call.
        while (callRegex.exec(source) !== null) {
            const firstArg = readFirstArg(source, callRegex.lastIndex);
            if (firstArg === null) continue;
            const literal = parseStringLiteral(firstArg);
            if (literal !== null) {
                staticKeys.push({ key: literal, file });
            } else {
                dynamic.push({ file, snippet: firstArg.trim() });
            }
        }
    };

    const visit = (path: string): void => {
        const stat = statSync(path);
        if (stat.isDirectory()) {
            for (const name of readdirSync(path)) {
                if (name === 'node_modules' || name.startsWith('.')) continue;
                visit(join(path, name));
            }
        } else if (SCANNED_EXTENSIONS.has(extname(path))) {
            visitFile(path);
        }
    };

    for (const path of Array.isArray(paths) ? paths : [paths]) visit(path);
    return { staticKeys, dynamic };
}

/**
 * Reads the source of the first argument of a call, starting just after `(`.
 * Returns the raw substring up to (but excluding) the depth-0 `,` or matching
 * `)`, tracking nested brackets and quoted strings. `null` if unterminated.
 */
function readFirstArg(source: string, start: number): string | null {
    let depth = 0;
    let quote = '';
    for (let i = start; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
            if (ch === '\\')
                i++; // skip escaped char
            else if (ch === quote) quote = '';
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch;
        } else if (ch === '(' || ch === '[' || ch === '{') {
            depth++;
        } else if (ch === ')' || ch === ']' || ch === '}') {
            if (depth === 0) return source.slice(start, i); // closing call paren
            depth--;
        } else if (ch === ',' && depth === 0) {
            return source.slice(start, i);
        }
    }
    return null;
}

/**
 * If the first-arg source is a single string literal (optionally wrapped in a
 * `... as T` / `<T>...` type assertion), returns its value; else `null`.
 */
function parseStringLiteral(arg: string): string | null {
    let trimmed = arg.trim();
    // Unwrap a trailing `as <Type>` assertion (the type-cast escape hatch).
    const asIndex = trimmed.search(/\bas\s/);
    if (asIndex !== -1) trimmed = trimmed.slice(0, asIndex).trim();
    // Unwrap a leading `<Type>` assertion.
    trimmed = trimmed.replace(/^<[^<>]+>\s*/, '').trim();

    const match = /^(['"`])((?:\\.|(?!\1).)*)\1$/.exec(trimmed);
    if (!match) return null;
    // Decode simple escapes; template literals with `${}` are not literals.
    if (match[1] === '`' && /\$\{/.test(match[2])) return null;
    return match[2].replace(/\\(.)/g, '$1');
}

/** Result of {@link auditTranslations}. */
export interface AuditResult {
    ok: boolean;
    missingKeys: string[];
    missingLocales: { key: string; missing: string[] }[];
    dynamic: DynamicKeyHit[];
}

/**
 * One-call audit composing the pure helpers above: scans `dir` for used keys,
 * reports keys missing from the config and (optionally) keys missing locale
 * coverage, and surfaces dynamic call sites that escape static checking.
 *
 * - param `opts.config` The i18n config to audit against.
 * - param `opts.dir` Directory (or file) to scan for `$t(...)` usage. Omit to
 *   skip scanning and audit only `extraKeys`.
 * - param `opts.extraKeys` Extra keys to verify (e.g. data-driven keys).
 * - param `opts.requireCompleteLocales` Also require every key to cover all
 *   locales (default `true`).
 * - returns: `{ ok, missingKeys, missingLocales, dynamic }`. `ok` is `true` when
 *   no keys are missing and (when required) no locales are missing.
 *
 * ---
 *
 * 組合上述純函式的單次稽核：掃描 `dir` 取得使用到的 key，回報設定中缺少的 key 與
 * （可選）語言覆蓋不全的 key，並列出逃過靜態檢查的動態呼叫點。`requireCompleteLocales`
 * 預設為 `true`。當無缺漏 key 且（要求時）無缺漏語言時，`ok` 為 `true`。
 */
export function auditTranslations(opts: {
    config: AuditableConfig;
    dir?: string;
    extraKeys?: string[];
    requireCompleteLocales?: boolean;
}): AuditResult {
    const { config, dir, extraKeys = [], requireCompleteLocales = true } = opts;
    const scan = dir ? scanSourceKeys(dir) : { staticKeys: [], dynamic: [] };

    const usedKeys = [...new Set([...scan.staticKeys.map((h) => h.key), ...extraKeys])];
    const missingKeys = findMissingKeys(config, usedKeys);
    const missingLocales = requireCompleteLocales ? findMissingLocales(config) : [];

    return {
        ok: missingKeys.length === 0 && missingLocales.length === 0,
        missingKeys,
        missingLocales,
        dynamic: scan.dynamic
    };
}
