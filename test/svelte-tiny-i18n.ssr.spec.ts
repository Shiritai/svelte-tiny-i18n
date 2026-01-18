/** @vitest-environment node */

import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
    createI18nStore,
    defineI18nConfig,
    type I18nConfig,
    type PartialTranslationEntryMap
} from '../src/svelte-tiny-i18n';

describe('svelte-tiny-i18n (SSR Mode)', () => {
    // 輔助函式：建立標準的 i18n 實例
    const createTestInstance = (
        overrides: Partial<I18nConfig<['en', 'es', 'zh-TW']>> = {},
        initialTranslations: PartialTranslationEntryMap<'en' | 'es' | 'zh-TW'>[] = [
            { hello: { en: 'Hello' } }
        ]
    ) => {
        const config = defineI18nConfig({
            supportedLocales: ['en', 'es', 'zh-TW'],
            defaultLocale: 'en',
            localStorageKey: 'test-lang-key',
            initialTranslations,
            ...overrides
        });
        return createI18nStore(config);
    };

    it('Environment should be SSR (window is undefined)', () => {
        expect(typeof window).toBe('undefined');
    });

    describe('getInitLocale', () => {
        it('應永遠使用 defaultLocale', () => {
            // 即使我們嘗試設定 localStorage (在 node 環境實際上無法設定，因為沒有 window.localStorage)
            // 這裡主要是確認 getInitLocale 不會崩潰且回傳預設值
            const i18n = createTestInstance();
            expect(get(i18n.locale)).toBe('en');
        });
    });

    describe('localStorage Persistence', () => {
        it('setLocale 不應嘗試呼叫 localStorage', () => {
            const i18n = createTestInstance();
            // 在 Node 環境中執行 setLocale，如果它嘗試存取 localStorage，會拋出 ReferenceError
            expect(() => i18n.setLocale('es')).not.toThrow();
            expect(get(i18n.locale)).toBe('es');
        });
    });
});
