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
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

// 輔助函式：建立標準的 i18n 實例
const createTestInstance = (
    overrides: Partial<I18nConfig<['en', 'es', 'zh-TW']>> = {},
    initialTranslations: PartialTranslationEntryMap<'en' | 'es' | 'zh-TW'>[] = [
        {
            hello: { en: 'Hello', es: 'Hola', 'zh-TW': '你好' },
            welcome: { en: 'Welcome, {name}!', es: 'Bienvenido, {name}!' },
            bye: { en: 'Goodbye', es: 'Adiós' } // 'zh-TW' 故意缺失
        }
    ]
) => {
    const config = defineI18nConfig({
        supportedLocales: ['en', 'es', 'zh-TW'],
        defaultLocale: 'en',
        localStorageKey: 'test-lang-key',
        initialTranslations,
        devLogs: true,
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
            const i18n = createTestInstance(
                {},
                // @ts-expect-error 包含 'fr' (法文)，但 supportedLocales 只有 ['en', 'es', 'zh-TW']
                [{ 'unsupported.key': { en: 'Hello', fr: 'Bonjour' } }]
            );

            const t = get(i18n.t);
            expect(t('unsupported.key')).toBe('Hello'); // 'en' 應該存在

            // 即使我們手動嘗試，'fr' 也不應該被加入
            // (這個斷言比較困難，因為 'translations' 是閉包內的變數)
            // 但我們可以透過切換到一個不存在的語言來間接驗證
            i18n.locale.set('es');
            const t_es = get(i18n.t);
            expect(t_es('unsupported.key')).toBe('unsupported.key'); // 'es' 也不存在

            // 主要是為了確保 'fr' 不會污染其他語言或導致錯誤
            // 由於 'unsupported.key' 在 'es' 中缺失，*預期*會收到一個 "not found" 警告
            expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[i18n] Translation for key "unsupported.key" not found')
            );
        });

        it('即使 initialTranslations 為空陣列，也應能建立 store', () => {
            const i18n = createTestInstance({}, []); // 傳入空陣列
            const t = get(i18n.t);

            expect(t('any.key')).toBe('any.key'); // 不應拋出錯誤
            i18n.locale.set('es');
            const t_es = get(i18n.t);
            expect(t_es('any.key')).toBe('any.key'); // 切換語言也不應拋出錯誤
        });
    });

    describe('getInitLocale (初始語言邏輯)', () => {
        describe('SSR (browser: false)', () => {
            beforeEach(() => {
                vi.stubGlobal('window', undefined);
            });

            it('應永遠使用 defaultLocale', () => {
                mockLocalStorage.setItem('test-lang-key', 'es'); // 應被忽略
                vi.stubGlobal('navigator', { languages: ['zh-TW'] }); // 應被忽略

                const i18n = createTestInstance();
                expect(get(i18n.locale)).toBe('en');
            });
        });

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
            i18n.locale.set('zh-TW');
            const t = get(i18n.t);
            // 'bye' 故意缺少 'zh-TW' 翻譯
            expect(t('bye')).toBe('bye');
        });

        it('當 locale 變更時，應更新 t 函式', () => {
            const i18n = createTestInstance();
            let t = get(i18n.t);
            expect(t('hello')).toBe('Hello');

            i18n.locale.set('es');
            t = get(i18n.t);
            expect(t('hello')).toBe('Hola');

            i18n.locale.set('zh-TW');
            t = get(i18n.t);
            expect(t('hello')).toBe('你好');
        });

        it('應正確處理變數替換 (replacements)', () => {
            const i18n = createTestInstance();
            const t = get(i18n.t);
            expect(t('welcome', { name: 'Gemini' })).toBe('Welcome, Gemini!');
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
            const result = t('multi.replace', { name: 'Gemini', place: 'Taiwan' });
            expect(result).toBe('Hello Gemini, welcome to Taiwan!');
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
            // @ts-expect-error 雖然 TS 會警告 (如果 'fr' 不是 SupportedLocale)，但 JS 層面這是可能的
            i18n.locale.set('fr');

            // 4. 驗證 store 狀態

            // 4a. locale store *本身* 確實變成了 'fr'
            expect(get(i18n.locale)).toBe('fr');

            // 4b. localStorage *應該* 仍然被更新了 (因為 subscribe 執行了)
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-lang-key', 'fr');

            // 4c. [關鍵] 't' 函式 *不應該* 崩潰，且應繼續使用 *上一個* 有效的翻譯 ('en')
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
            i18n.locale.set('es');
            t = get(i18n.t);
            expect(t('new.key')).toBe('Clave Nueva');

            i18n.locale.set('zh-TW');
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
            i18n.locale.set('es');
            t = get(i18n.t);
            expect(t('hello')).toBe('Que tal');

            // 檢查 'zh-TW' (未被覆蓋)
            i18n.locale.set('zh-TW');
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

        it('傳入包含空物件的陣列時應能正常處理', () => {
            const i18n = createTestInstance({ devLogs: true });

            // 確保呼叫 extendTranslations([{}]) 不會拋出錯誤
            expect(() => i18n.extendTranslations([{}])).not.toThrow();

            // 並且應記錄 "No new translations"
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('No new translations were added.')
            );
        });

        it('應能為現有的 key 合併新的語言翻譯', () => {
            // 'bye' 初始只有 'en' 和 'es'
            const i18n = createTestInstance();
            i18n.locale.set('zh-TW');
            let t_zh = get(i18n.t);
            expect(t_zh('bye')).toBe('bye'); // 'zh-TW' 缺少 'bye'

            // 動態加入 'bye' 的 'zh-TW' 翻譯
            i18n.extendTranslations([{ bye: { 'zh-TW': '再見' } }]);

            t_zh = get(i18n.t);
            expect(t_zh('bye')).toBe('再見'); // 應更新

            // 不應影響 'en'
            i18n.locale.set('en');
            const t_en = get(i18n.t);
            expect(t_en('bye')).toBe('Goodbye');
        });

        it('傳入空陣列時應能正常處理 (不應出錯)', () => {
            const i18n = createTestInstance({ devLogs: true });

            // 確保呼叫 extendTranslations([]) 不會拋出錯誤
            expect(() => i18n.extendTranslations([])).not.toThrow();

            // 並且應記錄 "No new translations"
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('No new translations were added.')
            );
        });
    });

    describe('devLogs (日誌功能)', () => {
        it('當 devLogs: true 時，應對找不到的 key 發出警告', () => {
            const i18n = createTestInstance({ devLogs: true });
            const t = get(i18n.t);
            t('missing.key.1');
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[i18n] Translation for key "missing.key.1" not found')
            );
        });

        it('當 devLogs: false 時，不應發出警告', () => {
            const i18n = createTestInstance({ devLogs: false });
            const t = get(i18n.t);
            t('missing.key.2');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('當 devLogs: true 時，應對無效的 setLocale 呼叫發出警告', () => {
            const i18n = createTestInstance({ devLogs: true });
            i18n.setLocale('fr');
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    '[i18n] Initialization failed: Language "fr" is not in supportedLocales'
                )
            );
        });

        it('當 devLogs: false 時，不應對無效的 setLocale 呼叫發出警告', () => {
            const i18n = createTestInstance({ devLogs: false });
            i18n.setLocale('fr');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('當 devLogs: true 時，extendTranslations 應輸出日誌', () => {
            const i18n = createTestInstance({ devLogs: true });
            i18n.extendTranslations([{ 'log.key': { en: 'Log' } }]);
            expect(consoleGroupSpy).toHaveBeenCalledWith(
                expect.stringContaining('[i18n] Extended translations')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("1 keys added/updated for lang 'en'")
            );
            expect(consoleGroupEndSpy).toHaveBeenCalled();
        });

        it('當 devLogs: false 時，extendTranslations 不應輸出日誌', () => {
            const i18n = createTestInstance({ devLogs: false });
            i18n.extendTranslations([{ 'log.key': { en: 'Log' } }]);
            expect(consoleGroupSpy).not.toHaveBeenCalled();
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('當 devLogs 未設定時，應預設為 true', () => {
            // 建立一個 *不* 包含 devLogs 的 config
            const config = defineI18nConfig({
                supportedLocales: ['en'],
                defaultLocale: 'en',
                localStorageKey: 'test-key',
                initialTranslations: []
                // devLogs is omitted
            });
            const i18n = createI18nStore(config);

            const t = get(i18n.t);
            t('missing.key.default');

            // 預設應為 true，所以應該要發出警告
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    '[i18n] Translation for key "missing.key.default" not found'
                )
            );
        });

        it('當 devLogs: true 且 setLocale 傳入空字串時，應發出警告', () => {
            const i18n = createTestInstance({ devLogs: true });
            i18n.setLocale('');

            // 檢查 I18nConfig 中針對 '' 的特定警告
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[i18n] Initialization failed:  is not a lang.')
            );
        });
    });

    describe('localStorage 持久化', () => {
        beforeEach(() => {
            vi.stubGlobal('localStorage', mockLocalStorage);
            vi.stubGlobal('navigator', mockNavigator);
        });

        it('CSR: locale.set 應更新 localStorage', () => {
            const i18n = createTestInstance();
            mockLocalStorage.setItem.mockClear();

            i18n.locale.set('es');

            expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-lang-key', 'es');
        });

        it('SSR: locale.set 不應呼叫 localStorage', () => {
            // 撤銷這個 describe 區塊的 beforeEach 建立的 browser globals
            vi.unstubAllGlobals();

            // 像其他 SSR 測試一樣，偽造 window 為 undefined
            vi.stubGlobal('window', undefined);

            const i18n = createTestInstance();

            i18n.locale.set('zh-TW');

            expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
        });
    });
});
