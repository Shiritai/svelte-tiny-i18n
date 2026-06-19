/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
    createI18nStore,
    defineI18nConfig,
    type I18nConfig,
    type PartialTranslationEntryMap
} from '../src/svelte-tiny-i18n';

// 模擬瀏覽器 Globals
let mockStorage: Record<string, string> = {};
const mockLocalStorage = {
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
    }),
    clear: vi.fn(() => {
        mockStorage = {};
    })
};

const mockNavigator = {
    languages: ['en-US', 'en'] as readonly string[] | undefined,
    language: 'en-US' as string | undefined
};

// 模擬 console
// 模擬 console
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

// 輔助函式：建立標準的 i18n 實例
const createTestInstance = (
    overrides: Partial<I18nConfig<['en', 'es', 'zh-TW']>> = {},
    initialTranslations = [
        {
            hello: { en: 'Hello', es: 'Hola', 'zh-TW': '你好' },
            welcome: { en: 'Welcome, {name}!', es: 'Bienvenido, {name}!' },
            bye: { en: 'Goodbye', es: 'Adiós' } // 'zh-TW' 故意缺失
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any
) => {
    const config = defineI18nConfig({
        supportedLocales: ['en', 'es', 'zh-TW'],
        defaultLocale: 'en',
        localStorageKey: 'test-lang-key',
        initialTranslations,
        // These suites assert the warn/fallback path; opt out of the
        // strict-under-test default (strict mode has its own suite below).
        strict: false,
        ...overrides
    });
    return createI18nStore(config);
};

// --- 測試開始 ---

describe('svelte-tiny-i18n', () => {
    beforeEach(() => {
        // 重置所有 Mocks
        vi.clearAllMocks();
        mockStorage = {};
        // 預設為 SSR
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        // 清除 jsdom 在測試之間持久化的 localStorage，
        // 避免狀態洩漏到下一個 createTestInstance()
        if (typeof window !== 'undefined') {
            window.localStorage.clear();
        }
    });

    describe('defineI18nConfig', () => {
        it('應回傳傳入的設定物件', () => {
            const config = {
                supportedLocales: ['en'],
                defaultLocale: 'en',
                localStorageKey: 'test',
                initialTranslations: [],
                devLogs: false
            };
            expect(defineI18nConfig(config)).toEqual(config);
        });
    });

    describe('createI18nStore (核心)', () => {
        it('應建立並回傳 i18n 實例及 API', () => {
            const i18n = createTestInstance();
            expect(i18n).toHaveProperty('supportedLocales');
            expect(i18n).toHaveProperty('defaultLocale');
            expect(i18n).toHaveProperty('localStorageKey');
            expect(i18n).toHaveProperty('locale');
            expect(i18n).toHaveProperty('t');
            expect(i18n).toHaveProperty('setLocale');
            expect(i18n).toHaveProperty('extendTranslations');
            expect(i18n).toHaveProperty('_types');
        });

        it('應正確設定回傳的屬性', () => {
            const i18n = createTestInstance();
            expect(i18n.supportedLocales).toEqual(['en', 'es', 'zh-TW']);
            expect(i18n.defaultLocale).toBe('en');
            expect(i18n.localStorageKey).toBe('test-lang-key');
        });

        it('應忽略 initialTranslations 中不支援的語言', () => {
            const i18n = createTestInstance({}, [
                { 'unsupported.key': { en: 'Hello', fr: 'Bonjour' } }
            ]);

            const t = get(i18n.t);
            expect(t('unsupported.key')).toBe('Hello'); // 'en' 應該存在

            // 即使我們手動嘗試，'fr' 也不應該被加入
            // (這個斷言比較困難，因為 'translations' 是閉包內的變數)
            // 但我們可以透過切換到一個不存在的語言來間接驗證
            i18n.setLocale('es');
            const t_es = get(i18n.t);
            expect(t_es('unsupported.key')).toBe('unsupported.key'); // 'es' 也不存在

            // 主要是為了確保 'fr' 不會污染其他語言或導致錯誤
            // 由於 'unsupported.key' 在 'es' 中缺失，*預期*會收到一個 "not found" 警告
            expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[svelte-tiny-i18n] missing_key: unsupported.key')
            );
        });

        it('即使 initialTranslations 為空陣列，也應能建立 store', () => {
            const i18n = createTestInstance({}, []); // 傳入空陣列
            const t = get(i18n.t);

            expect(t('any.key')).toBe('any.key'); // 不應拋出錯誤
            i18n.setLocale('es');
            const t_es = get(i18n.t);
            expect(t_es('any.key')).toBe('any.key'); // 切換語言也不應拋出錯誤
        });
    });

    describe('getInitLocale (初始語言邏輯)', () => {
        // SSR tests moved to svelte-tiny-i18n.ssr.spec.ts

        describe('CSR (browser: true)', () => {
            beforeEach(() => {
                vi.stubGlobal('localStorage', mockLocalStorage);
                vi.stubGlobal('navigator', mockNavigator);
            });

            it('1. 應優先使用 localStorage 中的有效語言', () => {
                mockLocalStorage.setItem('test-lang-key', 'zh-TW');
                vi.stubGlobal('navigator', { languages: ['es'] }); // 應被忽略

                const i18n = createTestInstance();
                expect(get(i18n.locale)).toBe('zh-TW');
                expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-lang-key');
            });

            it('2. 若 localStorage 語言無效，應嘗試 navigator.languages (完整匹配)', () => {
                mockLocalStorage.setItem('test-lang-key', 'fr'); // 無效
                vi.stubGlobal('navigator', { languages: ['de', 'zh-TW'] });

                const i18n = createTestInstance();
                expect(get(i18n.locale)).toBe('zh-TW');
            });

            it('3. 應嘗試 navigator.languages (基礎語言匹配)', () => {
                mockLocalStorage.setItem('test-lang-key', 'fr'); // 無效
                vi.stubGlobal('navigator', { languages: ['es-MX', 'de'] }); // 'es-MX' -> 'es'

                const i18n = createTestInstance();
                expect(get(i18n.locale)).toBe('es');
            });

            it('4. 若 navigator.languages 為空，應嘗試 navigator.language', () => {
                mockLocalStorage.setItem('test-lang-key', 'fr'); // 無效
                vi.stubGlobal('navigator', {
                    languages: undefined,
                    language: 'es-ES' // 'es-ES' -> 'es'
                });

                const i18n = createTestInstance();
                expect(get(i18n.locale)).toBe('es');
            });

            it('5. 若以上皆失敗，應回退到 defaultLocale', () => {
                mockLocalStorage.setItem('test-lang-key', 'fr'); // 無效
                vi.stubGlobal('navigator', {
                    languages: ['de', 'jp'],
                    language: 'kr'
                });

                const i18n = createTestInstance();
                expect(get(i18n.locale)).toBe('en');
            });
        });
    });

    describe('t (翻譯 store)', () => {
        it('應在初始 (預設) 語言下正確翻譯', () => {
            const i18n = createTestInstance();
            const t = get(i18n.t);
            expect(t('hello')).toBe('Hello');
        });

        it('當 key 找不到時，應回傳 key 本身', () => {
            const i18n = createTestInstance();
            const t = get(i18n.t);
            expect(t('missing.key')).toBe('missing.key');
        });

        it('當某語言缺少翻譯時，應回傳 key 本身', () => {
            const i18n = createTestInstance();
            i18n.setLocale('zh-TW');
            const t = get(i18n.t);
            // 'bye' 故意缺少 'zh-TW' 翻譯
            expect(t('bye')).toBe('bye');
        });

        it('當 locale 變更時，應更新 t 函式', () => {
            const i18n = createTestInstance();
            let t = get(i18n.t);
            expect(t('hello')).toBe('Hello');

            i18n.setLocale('es');
            t = get(i18n.t);
            expect(t('hello')).toBe('Hola');

            i18n.setLocale('zh-TW');
            t = get(i18n.t);
            expect(t('hello')).toBe('你好');
        });

        it('應正確處理變數替換 (replacements)', () => {
            const i18n = createTestInstance();
            const t = get(i18n.t);
            expect(t('welcome', { name: 'Meow' })).toBe('Welcome, Meow!');
        });

        it('應處理數字 0 作為有效的替換值', () => {
            const i18n = createTestInstance({}, [{ count: { en: 'Items: {num}' } }]);
            const t = get(i18n.t);
            expect(t('count', { num: 0 })).toBe('Items: 0');
        });

        it('當替換物件中缺少 key 時，應保留原始佔位符', () => {
            const i18n = createTestInstance();
            const t = get(i18n.t);
            expect(t('welcome', { wrong_key: 'User' })).toBe('Welcome, {name}!');
        });

        it('當替換值為 null 或 undefined 時，應保留原始佔位符', () => {
            const i18n = createTestInstance();
            const t = get(i18n.t);
            expect(t('welcome', { name: undefined as unknown as string })).toBe('Welcome, {name}!');
            expect(t('welcome', { name: null as unknown as string })).toBe('Welcome, {name}!');
        });

        it('應能處理多個變數替換', () => {
            const i18n = createTestInstance({}, [
                { 'multi.replace': { en: 'Hello {name}, welcome to {place}!' } }
            ]);
            const t = get(i18n.t);
            const result = t('multi.replace', { name: 'Meow', place: 'Svelte' });
            expect(result).toBe('Hello Meow, welcome to Svelte!');
        });

        it('當 locale 被 set 為不支援的語言時，_t store 應保持不變', () => {
            vi.stubGlobal('localStorage', mockLocalStorage);
            vi.stubGlobal('navigator', mockNavigator);
            const i18n = createTestInstance();

            // 1. 初始狀態
            expect(get(i18n.locale)).toBe('en');
            let t = get(i18n.t);
            expect(t('hello')).toBe('Hello');

            // 2. 清除 localStorage 的 mock，以便檢查
            mockLocalStorage.setItem.mockClear();

            // 3. 執行無效的 set
            i18n.setLocale('fr');

            // 4. 驗證 store 狀態

            // 4a. locale store 不應該變成 'fr', 應該是 'en'
            expect(get(i18n.locale)).not.toBe('fr');
            expect(get(i18n.locale)).toBe('en');

            // 4b. [關鍵] 't' 函式 *不應該* 崩潰，且應繼續使用 *上一個* 有效的翻譯 ('en')
            t = get(i18n.t);
            expect(t('hello')).toBe('Hello'); // 仍然是 'Hello', 而不是 'Hola' 或 key
        });

        it('當替換值本身包含大括號時，應能正確顯示', () => {
            const i18n = createTestInstance({}, [{ 'replace.nested': { en: 'Value is {value}' } }]);
            const t = get(i18n.t);

            // 替換值本身包含 {key}
            const result = t('replace.nested', { value: '{some_other_key}' });
            expect(result).toBe('Value is {some_other_key}');
        });
    });

    describe('setLocale (API)', () => {
        it('應使用有效的語言設定 locale', () => {
            const i18n = createTestInstance();
            expect(get(i18n.locale)).toBe('en'); // 初始值
            i18n.setLocale('es');
            expect(get(i18n.locale)).toBe('es');
        });

        it('應忽略無效的語言，並保持目前語言不變', () => {
            const i18n = createTestInstance();
            expect(get(i18n.locale)).toBe('en');
            i18n.setLocale('fr'); // 不在 supportedLocales
            expect(get(i18n.locale)).toBe('en');
        });

        it('應忽略 null, undefined 或空字串，並保持目前語言不變', () => {
            const i18n = createTestInstance();
            expect(get(i18n.locale)).toBe('en');
            i18n.setLocale(null);
            expect(get(i18n.locale)).toBe('en');
            i18n.setLocale(undefined);
            expect(get(i18n.locale)).toBe('en');
            i18n.setLocale('');
            expect(get(i18n.locale)).toBe('en');
        });
    });

    describe('extendTranslations (API)', () => {
        it('應能動態添加新的翻譯', () => {
            const i18n = createTestInstance();
            let t = get(i18n.t);
            expect(t('new.key')).toBe('new.key'); // 尚未存在

            const newTranslations: PartialTranslationEntryMap<'en' | 'es' | 'zh-TW'>[] = [
                {
                    'new.key': { en: 'New Key', es: 'Clave Nueva' },
                    'another.key': { 'zh-TW': '另一個' }
                }
            ];
            i18n.extendTranslations(newTranslations);

            // 應立即在當前語言 (en) 更新
            t = get(i18n.t);
            expect(t('new.key')).toBe('New Key');
            expect(t('another.key')).toBe('another.key'); // 'en' 不存在

            // 切換語言檢查
            i18n.setLocale('es');
            t = get(i18n.t);
            expect(t('new.key')).toBe('Clave Nueva');

            i18n.setLocale('zh-TW');
            t = get(i18n.t);
            expect(t('another.key')).toBe('另一個');
        });

        it('應能覆蓋現有的翻譯', () => {
            const i18n = createTestInstance();
            let t = get(i18n.t);
            expect(t('hello')).toBe('Hello');

            i18n.extendTranslations([{ hello: { en: 'Hi', es: 'Que tal' } }]);

            // 檢查 'en'
            t = get(i18n.t);
            expect(t('hello')).toBe('Hi');

            // 檢查 'es'
            i18n.setLocale('es');
            t = get(i18n.t);
            expect(t('hello')).toBe('Que tal');

            // 檢查 'zh-TW' (未被覆蓋)
            i18n.setLocale('zh-TW');
            t = get(i18n.t);
            expect(t('hello')).toBe('你好');
        });

        it('extendTranslations 應觸發 t store 更新', () => {
            const i18n = createTestInstance();
            const tStore = i18n.t;

            let tValue = get(tStore);
            expect(tValue('new.key')).toBe('new.key');

            const spy = vi.fn();
            const unsubscribe = tStore.subscribe(spy);
            spy.mockClear(); // 清除初始訂閱的呼叫

            i18n.extendTranslations([{ 'new.key': { en: 'Added' } }]);

            // 訂閱應被觸發
            expect(spy).toHaveBeenCalled();
            tValue = get(tStore);
            expect(tValue('new.key')).toBe('Added');
            unsubscribe();
        });

        it('應能為現有的 key 合併新的語言翻譯', () => {
            // 'bye' 初始只有 'en' 和 'es'
            const i18n = createTestInstance();
            i18n.setLocale('zh-TW');
            let t_zh = get(i18n.t);
            expect(t_zh('bye')).toBe('bye'); // 'zh-TW' 缺少 'bye'

            // 動態加入 'bye' 的 'zh-TW' 翻譯
            i18n.extendTranslations([{ bye: { 'zh-TW': '再見' } }]);

            t_zh = get(i18n.t);
            expect(t_zh('bye')).toBe('再見'); // 應更新

            // 不應影響 'en'
            i18n.setLocale('en');
            const t_en = get(i18n.t);
            expect(t_en('bye')).toBe('Goodbye');
        });
    });

    describe('onError (錯誤處理)', () => {
        it('當 key 找不到時，應呼叫 onError並帶有正確參數', () => {
            const onErrorSpy = vi.fn();
            const i18n = createTestInstance({ onError: onErrorSpy });
            const t = get(i18n.t);

            t('missing.key.1');

            expect(onErrorSpy).toHaveBeenCalledTimes(1);
            expect(onErrorSpy).toHaveBeenCalledWith({
                key: 'missing.key.1',
                locale: 'en',
                type: 'missing_key'
            });
        });

        it('當 setLocale 失敗時，應呼叫 onError', () => {
            const onErrorSpy = vi.fn();
            const i18n = createTestInstance({ onError: onErrorSpy });

            i18n.setLocale('fr');

            expect(onErrorSpy).toHaveBeenCalledTimes(1);
            expect(onErrorSpy).toHaveBeenCalledWith({
                key: 'fr',
                locale: 'system',
                type: 'missing_locale'
            });
        });

        it('當 setLocale 傳入空字串時，應呼叫 onError', () => {
            const onErrorSpy = vi.fn();
            const i18n = createTestInstance({ onError: onErrorSpy });

            i18n.setLocale('');

            expect(onErrorSpy).toHaveBeenCalledWith({
                key: '',
                locale: 'system',
                type: 'missing_locale'
            });
        });
    });

    describe('strict mode (嚴格模式)', () => {
        it('strict=true 時，缺少 key 應拋出錯誤', () => {
            const i18n = createTestInstance({ strict: true });
            const t = get(i18n.t);
            expect(() => t('missing.key')).toThrowError(/missing_key: missing\.key/);
        });

        it('strict=true 時，setLocale 傳入不支援語言應拋出錯誤', () => {
            const i18n = createTestInstance({ strict: true });
            expect(() => i18n.setLocale('fr')).toThrowError(/missing_locale: fr/);
        });

        it('strict=true 時，setLocale 傳入空字串應拋出錯誤', () => {
            const i18n = createTestInstance({ strict: true });
            expect(() => i18n.setLocale('')).toThrowError(/missing_locale/);
        });

        it('strict=false 時，缺少 key 應 warn 而非拋出', () => {
            const i18n = createTestInstance({ strict: false });
            const t = get(i18n.t);
            expect(() => t('missing.key')).not.toThrow();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[svelte-tiny-i18n] missing_key: missing.key')
            );
        });

        it('自訂 onError 應覆蓋 strict (永不拋出)', () => {
            const onErrorSpy = vi.fn();
            const i18n = createTestInstance({ strict: true, onError: onErrorSpy });
            const t = get(i18n.t);
            expect(() => t('missing.key')).not.toThrow();
            expect(() => i18n.setLocale('fr')).not.toThrow();
            expect(onErrorSpy).toHaveBeenCalledTimes(2);
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('預設值：測試環境 (NODE_ENV=test) 應為 strict (拋出)', () => {
            // 不傳 strict，依賴預設值；vitest 設定 NODE_ENV=test
            expect(process.env.NODE_ENV).toBe('test');
            const config = defineI18nConfig({
                supportedLocales: ['en'],
                defaultLocale: 'en',
                localStorageKey: 'strict-default',
                initialTranslations: [{ hello: { en: 'Hello' } }]
            });
            const i18n = createI18nStore(config);
            const t = get(i18n.t);
            expect(() => t('missing.key')).toThrow();
        });
    });

    describe('Nested JSON Support (巢狀 JSON)', () => {
        it('應能正確解析巢狀翻譯物件', () => {
            const i18n = createTestInstance({}, [
                {
                    home: {
                        title: { en: 'Home Title', es: 'Titulo Casa' },
                        deep: {
                            label: { en: 'Deep Label' }
                        }
                    }
                }
            ]);
            const t = get(i18n.t);
            expect(t('home.title')).toBe('Home Title');
            expect(t('home.deep.label')).toBe('Deep Label');

            i18n.setLocale('es');
            const t_es = get(i18n.t);
            expect(t_es('home.title')).toBe('Titulo Casa');
        });

        it('extendTranslations 也應支援巢狀物件', () => {
            const i18n = createTestInstance();
            i18n.extendTranslations([
                {
                    profile: {
                        user: {
                            name: { en: 'User Name' }
                        }
                    }
                }
            ]);

            const t = get(i18n.t);
            expect(t('profile.user.name')).toBe('User Name');
        });
    });

    describe('localStorage 持久化', () => {
        beforeEach(() => {
            vi.stubGlobal('localStorage', mockLocalStorage);
            vi.stubGlobal('navigator', mockNavigator);
        });

        it('CSR: setLocale 應更新 localStorage', () => {
            const i18n = createTestInstance();
            mockLocalStorage.setItem.mockClear();

            i18n.setLocale('es');

            expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-lang-key', 'es');
        });

        // SSR test moved to svelte-tiny-i18n.ssr.spec.ts
    });
});
