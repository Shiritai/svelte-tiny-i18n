/** @vitest-environment node */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
    flattenConfig,
    findMissingLocales,
    findMissingKeys,
    scanSourceKeys,
    auditTranslations,
    type AuditableConfig
} from '../src/testing';
import { registerI18nMatchers } from '../src/testing-vitest';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'scan');

const config: AuditableConfig = {
    supportedLocales: ['en', 'es', 'zh-TW'],
    initialTranslations: [
        {
            hello: { en: 'Hello', es: 'Hola', 'zh-TW': '你好' },
            bye: { en: 'Goodbye', es: 'Adios' }, // 'zh-TW' missing
            empty: { en: 'X', es: '', 'zh-TW': 'Y' }, // 'es' empty -> missing
            home: {
                title: { en: 'Home', es: 'Casa', 'zh-TW': '首頁' }
            }
        }
    ]
};

describe('flattenConfig', () => {
    it('應將巢狀設定攤平為點分隔 key 並收集各語言字串', () => {
        const flat = flattenConfig(config);
        expect(flat['hello']).toEqual({ en: 'Hello', es: 'Hola', 'zh-TW': '你好' });
        expect(flat['home.title']).toEqual({ en: 'Home', es: 'Casa', 'zh-TW': '首頁' });
        expect(flat['bye']).toEqual({ en: 'Goodbye', es: 'Adios' });
    });

    it('應忽略不支援的語言', () => {
        const flat = flattenConfig({
            supportedLocales: ['en'],
            initialTranslations: [{ k: { en: 'X', fr: 'Y' } }]
        });
        expect(flat['k']).toEqual({ en: 'X' });
    });

    it('initialTranslations 缺省時不應拋錯', () => {
        expect(flattenConfig({ supportedLocales: ['en'] })).toEqual({});
    });
});

describe('findMissingLocales', () => {
    it('應回報缺少或空字串的語言', () => {
        const missing = findMissingLocales(config);
        expect(missing).toContainEqual({ key: 'bye', missing: ['zh-TW'] });
        expect(missing).toContainEqual({ key: 'empty', missing: ['es'] });
    });

    it('完整覆蓋的 key 不應出現在結果中', () => {
        const keys = findMissingLocales(config).map((m) => m.key);
        expect(keys).not.toContain('hello');
        expect(keys).not.toContain('home.title');
    });
});

describe('findMissingKeys', () => {
    it('應回報設定中不存在的 key', () => {
        expect(findMissingKeys(config, ['hello', 'nope', 'home.title', 'absent.key'])).toEqual([
            'nope',
            'absent.key'
        ]);
    });

    it('全部存在時應回傳空陣列', () => {
        expect(findMissingKeys(config, ['hello', 'bye'])).toEqual([]);
    });
});

describe('scanSourceKeys', () => {
    it('應掃描出 .svelte/.ts 中的字面值 key', () => {
        const { staticKeys } = scanSourceKeys(FIXTURES);
        const keys = staticKeys.map((h) => h.key);
        expect(keys).toContain('home.title');
        expect(keys).toContain('home.subtitle');
        expect(keys).toContain('shared.ok');
        expect(keys).toContain('greeting.hello');
        expect(keys).toContain('greeting.bye'); // i18n.t(...)
    });

    it('應攔到型別斷言逃生口 ($t("key" as ...)) 內的字面值', () => {
        const { staticKeys } = scanSourceKeys(FIXTURES);
        expect(staticKeys.map((h) => h.key)).toContain('casted.key');
    });

    it('非字面值參數應歸入 dynamic', () => {
        const { dynamic } = scanSourceKeys(FIXTURES);
        const snippets = dynamic.map((d) => d.snippet);
        expect(snippets).toContain('name');
        expect(snippets.some((s) => s.includes('tmpl.'))).toBe(true);
    });

    it('應略過 node_modules', () => {
        const { staticKeys } = scanSourceKeys(FIXTURES);
        expect(staticKeys.map((h) => h.key)).not.toContain('should.be.ignored');
    });

    it('每個命中應附帶來源檔路徑', () => {
        const { staticKeys } = scanSourceKeys(FIXTURES);
        expect(staticKeys.every((h) => typeof h.file === 'string' && h.file.length > 0)).toBe(true);
    });

    it('應支援自訂 callees', () => {
        const { staticKeys } = scanSourceKeys(FIXTURES, { callees: ['i18n.t'] });
        const keys = staticKeys.map((h) => h.key);
        expect(keys).toContain('greeting.bye');
        expect(keys).not.toContain('home.title'); // 來自 $t
    });

    it('應接受單一路徑字串', () => {
        const { staticKeys } = scanSourceKeys(join(FIXTURES, 'usage.ts'));
        expect(staticKeys.map((h) => h.key)).toContain('greeting.hello');
    });
});

describe('auditTranslations', () => {
    it('應組合掃描 + 缺漏檢查並回報 ok=false', () => {
        const result = auditTranslations({ config, dir: FIXTURES });
        // 掃描到的 home.subtitle / shared.ok / greeting.* / casted.key 皆不在 config
        expect(result.ok).toBe(false);
        expect(result.missingKeys).toContain('home.subtitle');
        expect(result.missingKeys).toContain('casted.key');
        // 缺漏語言 (bye/empty) 應被回報
        expect(result.missingLocales.map((m) => m.key)).toEqual(
            expect.arrayContaining(['bye', 'empty'])
        );
        // 動態 key 應被列出
        expect(result.dynamic.length).toBeGreaterThan(0);
    });

    it('requireCompleteLocales=false 時應略過語言檢查', () => {
        const result = auditTranslations({
            config,
            extraKeys: ['hello'],
            requireCompleteLocales: false
        });
        expect(result.missingLocales).toEqual([]);
        expect(result.ok).toBe(true);
    });

    it('extraKeys 應一併檢查 (資料驅動 key)', () => {
        const result = auditTranslations({
            config,
            extraKeys: ['hello', 'data.driven.key'],
            requireCompleteLocales: false
        });
        expect(result.missingKeys).toEqual(['data.driven.key']);
    });

    it('完整設定 + 無掃描時 ok=true', () => {
        const complete: AuditableConfig = {
            supportedLocales: ['en'],
            initialTranslations: [{ a: { en: 'A' }, b: { en: 'B' } }]
        };
        const result = auditTranslations({ config: complete, extraKeys: ['a', 'b'] });
        expect(result.ok).toBe(true);
        expect(result.missingKeys).toEqual([]);
        expect(result.missingLocales).toEqual([]);
    });
});

describe('testing/vitest matchers', () => {
    registerI18nMatchers();

    it('toHaveCompleteLocales 應在有缺漏時失敗、完整時通過', () => {
        const complete: AuditableConfig = {
            supportedLocales: ['en', 'es'],
            initialTranslations: [{ a: { en: 'A', es: 'A' } }]
        };
        expect(complete).toHaveCompleteLocales();
        expect(config).not.toHaveCompleteLocales();
    });

    it('toHaveNoMissingKeys 應在 key 缺漏時失敗、皆存在時通過', () => {
        expect(config).toHaveNoMissingKeys(['hello', 'home.title']);
        expect(config).not.toHaveNoMissingKeys(['hello', 'nope']);
    });
});
