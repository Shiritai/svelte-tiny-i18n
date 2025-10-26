/**
 * @license MIT
 * svelte-tiny-i18n
 * Copyright (c) 2025 Shiritai (Yang Tzu-Ching)
 *
 * A tiny, type-safe i18n library for Svelte and SvelteKit.
 * https://github.com/Shiritai/svelte-tiny-i18n
 */

import { derived, Readable, writable } from 'svelte/store';

// --- Generic Type Definitions (抽象泛型定義) ---

/**
 * Interface for the i18n configuration object.
 * i18n 設定物件的介面。
 */
export interface I18nConfig<Locales extends readonly string[]> {
    /**
     * An array of supported language codes, e.g., ['en', 'es'].
     * 支援的語言代碼陣列, e.g., ['en', 'es']
     */
    supportedLocales: Locales;
    /**
     * The default language, which must be one of the supportedLocales.
     * 預設語言，必須是 supportedLocales 中的一個。
     */
    defaultLocale: Locales[number];
    /**
     * An array of *partial* translation entry maps to load initially.
     * 初始化的基礎翻譯內容。
     */
    initialTranslations: PartialTranslationEntryMap<Locales[number]>[];
    /**
     * The key used to store the current language in localStorage.
     * 儲存在 localStorage 中的語言鍵值。
     */
    localStorageKey: string;
    /**
     * If true, logs errors to the console when a translation key is not found.
     * Defaults to true.
     * ---
     * 如果為 true, 會在找不到翻譯鍵時在控制台記錄錯誤。
     * 預設為 true。
     */
    devLogs?: boolean;
}

/**
 * A *full* translation entry object, mapping all supported languages to a string.
 * e.g., { en: "Hello", es: "Hola" }
 *
 * ---
 *
 * 一個 *完整* 的翻譯條目物件，映射所有支援的語言到一個字串。
 * e.g., { en: "Hello", es: "Hola" }
 */
export type TranslationEntryMap<Locales extends string> = {
    [key in Locales]: string;
};

/**
 * A translation map where keys are translation keys and values are *partial* translation entries.
 * This is crucial for `extendTranslations` to support loading single-language content (e.g., from .json files).
 * e.g., { my_key: { en: "Hello" } } or { full_key: { en: "Hi", es: "Hola" } }
 *
 * ---
 *
 * 一個翻譯地圖，其鍵值為翻譯鍵，值為 *部分* 的翻譯條目。
 * 這對於 `extendTranslations` 支援載入單一語言內容 (例如 .json 檔案) 至關重要。
 * e.g., { my_key: { en: "Hello" } } 或 { full_key: { en: "Hi", es: "Hola" } }
 */
export type PartialTranslationEntryMap<Locales extends string> = {
    [key: string]: Partial<TranslationEntryMap<Locales>>;
};

// --- Core i18n Factory Function (核心 i18n 工廠函式) ---

/**
 * # `createI18nStore`
 * Creates an abstract, type-safe i18n store and associated utilities.
 *
 * - param: `config` The configuration object containing languages, defaults, and initial translations.
 * - returns: An object containing Svelte stores and management functions.
 *
 * ## Example
 *
 * ### How to create the i18n instance
 * ```ts
 * // 1. Define config in (e.g., /src/lib/i18n.ts)
 * import { createI18nStore, defineI18nConfig } from '$lib/i18n'; // Assuming this file is i18n.ts
 *
 * const i18nConfig = defineI18nConfig({
 * supportedLocales: ['en', 'es'],
 *     defaultLocale: 'en',
 *     localStorageKey: 'my-app-lang',
 *     initialTranslations: [
 *         { "hello": { en: "Hello", es: "Hola" } }
 *     ]
 * });
 *
 * // 2. Create and export the i18n instance
 * export const i18n = createI18nStore(i18nConfig);
 *
 * // 3. Export types (optional, for type-safety in your app)
 * export type SupportedLocale = inferSupportedLocale<typeof i18n>;
 * export type TranslationEntry = inferTranslationEntry<typeof i18n>;
 * ```
 *
 * ### How to use the returned object in Svelte
 * ```svelte
 * <script lang="ts">
 * import { i18n } from '$lib/i18n'; // Import the instance from step 1
 *
 * // Destructure the stores and functions
 * const { t, locale, setLocale } = i18n;
 *
 * function changeLang() {
 *     const nextLang = $locale === 'en' ? 'es' : 'en';
 *     setLocale(nextLang);
 * }
 * </script>
 *
 * <h1>{$t('hello')}</h1>
 *
 * <button on:click={changeLang}>
 *     Switch Language (Current: {$locale})
 * </button>
 * ```
 *
 * ---
 *
 * # `createI18nStore`
 * 建立一個抽象的、型別安全的 i18n 儲存和相關工具。
 *
 * - 參數: `config` 包含語言、預設值和初始翻譯的設定物件。
 * - 返回值: 一個包含 Svelte stores 和管理函式的物件。
 *
 * ## 範例
 * ### 如何建立 i18n 實例
 * ```ts
 * // 1. 定義設定檔 (例如: /src/lib/i18n.ts)
 * import { createI18nStore, defineI18nConfig } from '$lib/i18n'; // 假設此檔案為 i18n.ts
 *
 * const i18nConfig = defineI18nConfig({
 * supportedLocales: ['en', 'es'],
 *     defaultLocale: 'en',
 *     localStorageKey: 'my-app-lang',
 *     initialTranslations: [
 *         { "hello": { en: "Hello", es: "Hola" } }
 *     ]
 * });
 *
 * // 2. 建立並導出 i18n 實例
 * export const i18n = createI18nStore(i18nConfig);
 *
 * // 3. 導出型別 (可選, 用於整個 App 的型別安全)
 * export type SupportedLocale = inferSupportedLocale<typeof i18n>;
 * export type TranslationEntry = inferTranslationEntry<typeof i18n>;
 * ```
 *
 * ### 如何在 Svelte 中使用回傳的物件
 * ```svelte
 * <script lang="ts">
 * import { i18n } from '$lib/i18n'; // 導入步驟 1 建立的實例
 *
 * // 解構 Svelte stores 和函式
 * const { t, locale, setLocale } = i18n;
 *
 * function changeLang() {
 * 	const nextLang = $locale === 'en' ? 'es' : 'en';
 * 	setLocale(nextLang);
 * }
 * </script>
 *
 * <h1>{$t('hello')}</h1>
 *
 * <button on:click={changeLang}>
 *     切換語言 (目前: {$locale})
 * </button>
 * ```
 */
export function createI18nStore<const Locales extends readonly string[]>(
    config: I18nConfig<Locales>
) {
    // --- Type Inference (型別推斷) ---
    type SupportedLocale = Locales[number];
    type FullTranslationMap = Map<SupportedLocale, Map<string, string>>;

    const {
        supportedLocales,
        defaultLocale,
        initialTranslations,
        localStorageKey,
        devLogs = true // Set default value
    } = config;

    /**
     * Gets the initial language for the store.
     * - On SSR (server), always returns `defaultLocale`.
     * - On CSR (browser), checks in order: localStorage -> navigator.language -> `defaultLocale`.
     *
     * ---
     *
     * 獲取 store 的初始語言。
     * - 在 SSR (server) 上，永遠回傳 `defaultLocale`。
     * - 在 CSR (browser) 上，依序檢查 localStorage -> navigator.language -> `defaultLocale`。
     */
    const getInitLocale = (): SupportedLocale => {
        const browser = typeof window !== 'undefined';
        if (!browser) {
            return defaultLocale;
        }

        // 1. 優先從 localStorage 讀取
        const storedLang = localStorage.getItem(localStorageKey);
        if (storedLang && supportedLocales.includes(storedLang as SupportedLocale)) {
            return storedLang as SupportedLocale;
        }

        // 2. 嘗試偵測瀏覽器偏好
        const preferredLangs = navigator.languages
            ? [...navigator.languages]
            : navigator.language
              ? [navigator.language]
              : [];

        if (preferredLangs.length > 0) {
            for (const lang of preferredLangs) {
                // 2a. 嘗試完整匹配 (e.g., 'zh-TW')
                if (supportedLocales.includes(lang as SupportedLocale)) {
                    return lang as SupportedLocale;
                }
                // 2b. 嘗試基礎語言匹配 (e.g., 'zh')
                const baseLang = lang.split('-')[0];
                if (supportedLocales.includes(baseLang as SupportedLocale)) {
                    return baseLang as SupportedLocale;
                }
            }
        }

        // 3. 回退到預設值
        return defaultLocale;
    };

    /**
     * Converts an array of partial translation entries into the full, nested Map structure.
     * (e.g., [ { "key": { en: "Hi" } } ] -> Map<'en', Map<'key', 'Hi'>>)
     *
     * ---
     *
     * 將部分翻譯條目的陣列轉換為完整的、巢狀的 Map 結構。
     * (例如: [ { "key": { en: "Hi" } } ] -> Map<'en', Map<'key', 'Hi'>>)
     */
    const makeTranslation = (
        kv_pair: PartialTranslationEntryMap<SupportedLocale>[]
    ): FullTranslationMap => {
        const result = new Map<SupportedLocale, Map<string, string>>();
        supportedLocales.forEach((lang) => {
            result.set(lang, new Map());
        });

        kv_pair.forEach((entry) => {
            // entry = { "my_key": { en: "Hello", es: "Hola" } }
            Object.entries(entry).forEach(([key, partialEntry]) => {
                // key = "my_key"
                // partialEntry = { en: "Hello", es: "Hola" }

                // 只遍歷 *實際存在* 的語言 (e.g., 'en', 'es')
                Object.entries(partialEntry).forEach(([lang, value]) => {
                    // lang = 'en', value = "Hello"
                    // lang = 'es', value = "Hola"

                    // 確保這個 lang 確實是我們支援的
                    if (result.has(lang as SupportedLocale)) {
                        result.get(lang as SupportedLocale)!.set(key, value as string);
                    }
                });
            });
        });
        return result;
    };

    // --- Svelte Stores ---

    /**
     * The complete, internal "database" of all translations.
     * (Map<Lang, Map<Key, Value>>)
     *
     * ---
     *
     * 儲存所有翻譯的完整內部「資料庫」。
     * (Map<語言, Map<鍵, 值>>)
     */
    const translations = makeTranslation(initialTranslations);

    /**
     * The language to initialize the store with, based on browser/SSR context.
     * This is executed once when the store is created.
     *
     * ---
     *
     * 用於初始化 store 的語言，基於瀏覽器/SSR 環境決定。
     * 這會在 store 被建立時執行一次。
     */
    const initialLanguage = getInitLocale();

    /**
     * The writable store holding the currently active language code (e.g., 'en').
     * This store acts as the "trigger" for updates.
     *
     * ---
     *
     * 儲存當前啟動語言代碼 (例如: 'en') 的 Writable store。
     * 此 store 作為更新的「觸發器」。
     */
    const locale = writable<SupportedLocale>(initialLanguage);

    /**
     * Internal store holding only the translation map for the *current* language.
     * This is what the derived 't' store directly reads from for performance.
     *
     * ---
     *
     * 僅儲存*當前*語言翻譯地圖的內部 store。
     * 衍生的 't' store 會直接讀取它以提高效能。
     */
    const _t = writable<Map<string, string>>(translations.get(initialLanguage)!);

    // --- Store Subscription Logic (Store 訂閱邏輯) ---
    locale.subscribe((lang) => {
        if (translations.has(lang)) {
            // Update the internal '_t' store to the map of the new language.
            // 將內部的 '_t' store 更新為新語言的地圖。
            _t.set(translations.get(lang)!);
        }
        // Persist language change to localStorage in the browser.
        // 在瀏覽器中，將語言變更持久化到 localStorage。
        const browser = typeof window !== 'undefined';
        if (browser) {
            localStorage.setItem(localStorageKey, lang);
        }
    });

    // --- Derived Store (t function) (衍生 Store) ---

    const t = derived(_t, ($_t) => {
        return (key: string, replacements?: Record<string, string | number>): string => {
            let translation = $_t.get(key);
            if (translation === undefined) {
                // For easier debugging, return the key itself if the translation is missing.
                // 為了方便除錯，如果找不到翻譯，直接回傳 key 本身。
                translation = key;
                if (devLogs) {
                    console.warn(
                        `[i18n] Translation for key "${key}" not found. Using key as fallback.`
                    );
                }
            }
            if (replacements) {
                translation = translation.replace(
                    // 匹配 {key}
                    /{([^{}]+)}/g,
                    (match, key) => {
                        // 從 replacements 物件中查找 key
                        // (e.g., key 會是 "name", 而不是 "{name}")
                        const value = replacements[key];

                        // 檢查 undefined 或 null
                        // Check for undefined or null
                        return value !== undefined && value !== null ? String(value) : match;
                    }
                );
            }
            return translation;
        };
    });

    // --- API Functions (API 函式) ---

    function setLocale(lang: string | undefined | null) {
        // If lang is null, undefined, or an empty string, do nothing.
        // The store will keep its current (or initial) value.
        // 如果 lang 是 null、undefined 或空字串，則不執行任何操作。
        // store 將保持其目前 (或初始) 的值。
        if (!lang) {
            if (devLogs && lang === '') {
                console.warn(`[i18n] Initialization failed: ${lang} is not a lang.`);
            }
            return;
        }

        // Validate if the incoming lang is one of the supported languages.
        // 驗證傳入的 lang 是否受支援。
        if (supportedLocales.includes(lang)) {
            locale.set(lang);
        } else {
            // If not supported, does nothing.
            // 如果不支援，不做任何事。
            if (devLogs) {
                console.warn(
                    `[i18n] Initialization failed: Language "${lang}" is not in supportedLocales [${supportedLocales.join(
                        ', '
                    )}].`
                );
            }
        }
    }

    function extendTranslations(newTranslations: PartialTranslationEntryMap<SupportedLocale>[]) {
        const newTranslationMap = makeTranslation(newTranslations);
        newTranslationMap.forEach((valueMap, lang) => {
            const existingMap = translations.get(lang)!;
            // Merge new translations into the existing map.
            // 將新的翻譯合併到現有的地圖中。
            valueMap.forEach((value, key) => {
                existingMap.set(key, value);
            });
        });

        if (devLogs) {
            console.group('[i18n] Extended translations...');
            let totalCount = 0;
            newTranslationMap.forEach((valueMap, lang) => {
                const count = valueMap.size;
                if (count > 0) {
                    console.log(`${count} keys added/updated for lang '${lang}'.`);
                    totalCount += count;
                }
            });
            if (totalCount === 0) {
                console.log(`No new translations were added.`);
            }
            console.groupEnd();
        }

        // Trigger an update to the _t store to refresh the derived 't' function.
        // 觸發 _t store 更新，以確保 't' 衍生 store 拿到最新資料。
        locale.update((lang) => {
            _t.set(translations.get(lang)!);
            return lang;
        });
    }

    // --- Type Helpers (型別輔助) ---

    /**
     * A type-only export used for inferring the instance's types.
     *
     * ---
     *
     * 僅供型別導出的佔位符，用於推斷 i18n 實例的型別。
     */
    const _types = null as unknown as {
        LangCode: SupportedLocale;
        TranslationEntry: TranslationEntryMap<SupportedLocale>;
        PartialTranslationEntry: PartialTranslationEntryMap<SupportedLocale>;
    };

    return {
        /**
         * An array of all supported language codes.
         * (e.g., ['en', 'es'])
         *
         * ---
         *
         * 所有支援的語言代碼陣列。
         * (例如: ['en', 'es'])
         */
        supportedLocales,

        /**
         * The default language code.
         *
         * ---
         *
         * 預設的語言代碼。
         */
        defaultLocale,

        /**
         * The key used to store the current language in localStorage.
         *
         * ---
         *
         * 用於在 localStorage 中儲存目前語言的鍵。
         */
        localStorageKey,

        /**
         * A readable Svelte store holding the current language code.
         * (e.g., 'en')
         *
         * ---
         *
         * 一個 Svelte Readable store，儲存當前的語言代碼。
         * (例如: 'en')
         */
        locale: locale as Readable<SupportedLocale>,

        /**
         * The translation function.
         *
         * ## Param
         * - key The translation key.
         * - replacements An optional object of values to replace placeholders.
         * (e.g., { "user.name": "World" } for "Hello {user.name}")
         * ## Return
         * The translated string. If not found, returns the key itself for debugging.
         *
         * ---
         *
         * 翻譯函式。
         *
         * ## 參數
         * - key 翻譯鍵。
         * - replacements (可選) 用於替換預留位置的值物件。
         * (例如 { "user.name": "World" } 對應 "Hello {user.name}")
         * ## 返回值
         * 翻譯後的字串。如果找不到，將回傳 key 本身以方便除錯。
         */
        t,

        /**
         * Initializes or updates the language, typically called from a root layout.
         *
         * ## Example: Usage in SvelteKit's root layout
         * ```ts
         * // In /src/routes/+layout.ts
         * import { i18n } from '$lib/i18n';
         * import type { LayoutLoad } from './$types';
         *
         * export const load: LayoutLoad = ({ params }) => {
         *     const { lang } = params;
         *
         *     // Initialize the store with the language
         *     // This validates the lang and sets the store.
         *     i18n.setLocale(lang);
         *
         *     return {}; // Return data if needed
         * };
         * ```
         *
         * ## Param
         * - lang The language code.
         *
         * ---
         *
         * 由根 `+layout.ts` 呼叫，用來初始化或更新語言。
         *
         * ## 範例: 在 SvelteKit 根佈局中的應用
         * ```ts
         * // 在 /src/routes/+layout.ts
         * import { i18n } from '$lib/i18n';
         * import type { LayoutLoad } from './$types';
         *
         * export const load: LayoutLoad = ({ params }) => {
         *     const { lang } = params;
         *
         *     // 初始化 store
         *     // 此函式會驗證 lang 並設定 store
         *     i18n.setLocale(lang);
         *
         *     return {}; // 可選，回傳頁面 data
         * };
         * ```
         *
         * ## 參數
         * - lang 語言代碼。
         */
        setLocale,

        /**
         * Dynamically extends the existing translations with new ones.
         *
         * ## Example: Usage for page-specific translations
         * ```ts
         * // 1. Define page translations (e.g., /src/locales/profile.ts)
         * // Note: We assume you've exported this type from your main i18n.ts file:
         * // export type PartialTranslationEntry = inferPartialTranslationEntry<typeof i18n>;
         * import type { PartialTranslationEntry } from '$lib/i18n';
         *
         * export const profileTranslations: PartialTranslationEntry = {
         *     "profile.title": { en: "My Profile", es: "Mi Perfil" },
         *     "profile.edit": { en: "Edit" }
         * };
         *
         * // 2. Load them in the page's loader (e.g., /src/routes/profile/+page.ts)
         * import { i18n } from '$lib/i18n';
         * import { profileTranslations } from '$locales/profile';
         * import type { PageLoad } from './$types';
         *
         * export const load: PageLoad = () => {
         *     // Dynamically add the translations for this page
         *     i18n.extendTranslations([profileTranslations]);
         * };
         * ```
         *
         * ## Param
         * - newTranslations An array of partial translation entries to add.
         *
         * ---
         *
         * 動態擴展現有的翻譯 (例如: 載入頁面特定的 .json 內容)。
         *
         * ## 範例: 用於載入特定頁面的翻譯
         * ```ts
         * // 1. 定義頁面翻譯 (例如: /src/locales/profile.ts)
         * // 注意: 我們假設開發者在主要的 i18n.ts 檔案中導出了此型別:
         * // export type PartialTranslationEntry = inferPartialTranslationEntry<typeof i18n>;
         * import type { PartialTranslationEntry } from '$lib/i18n';
         *
         * export const profileTranslations: PartialTranslationEntry = {
         *     "profile.title": { en: "My Profile", es: "Mi Perfil" },
         *     "profile.edit": { en: "Edit" }
         * };
         *
         * // 2. 在頁面的 loader 中載入 (例如: /src/routes/profile/+page.ts)
         * import { i18n } from '$lib/i18n';
         * import { profileTranslations } from '$locales/profile';
         * import type { PageLoad } from './$types';
         *
         * export const load: PageLoad = () => {
         *     // 動態地為此頁面添加翻譯
         *     i18n.extendTranslations([profileTranslations]);
         * };
         * ```
         *
         * ## 參數
         * - newTranslations 要添加的新翻譯條目陣列。
         */
        extendTranslations,

        /**
         * A type-only export used for inferring the instance's types.
         * **Do not access this property at runtime.**
         *
         * ---
         *
         * 僅供型別導出的佔位符，用於推斷 i18n 實例的型別。
         * **請勿在執行時期存取此屬性。**
         */
        _types
    };
}

// --- Utility Functions (輔助函式) ---

/**
 * A helper function for defining your i18n configuration.
 * This provides strong type inference and validates that
 * `defaultLocale` is one of the `supportedLocales`.
 *
 * @param `config` The i18n configuration object.
 * @returns The typed configuration object.
 *
 * ---
 *
 * 定義 i18n 設定的輔助函式。
 * 這會自動推斷型別，並提供完整的型別檢查，例如 `defaultLocale`
 * 應該是 `supportedLocales` 陣列的成員之一。
 *
 * @param `config` i18n 設定物件。
 * @returns 型別化的設定物件。
 */
export function defineI18nConfig<
    const Locales extends readonly string[],
    const Config extends I18nConfig<Locales>
>(
    // This check ensures `defaultLocale` is a member of `supportedLocales`.
    // 這裡的 'Config & { defaultLocale: Locales[number] }'
    // 提供了 'satisfies' 的檢查功能，確保 defaultLocale 是
    // supportedLocales 的成員之一。
    config: Config & { defaultLocale: Locales[number] }
): Config {
    return config;
}

/**
 * (Internal) Base type for inferring i18n instance types.
 *
 * ---
 *
 * (內部) 用於推斷 i18n 實例型別的基礎型別。
 */
type AnyI18nStore = {
    _types: {
        LangCode: unknown;
        TranslationEntry: unknown;
        PartialTranslationEntry: unknown;
    };
};

/**
 * Infers the `SupportedLocale` type (e.g., 'en' | 'es') from your i18n instance.
 *
 * @example
 * ```ts
 * // 1. Utilization (in i18n.ts or app.d.ts):
 * export type SupportedLocale = inferSupportedLocale<typeof i18n>;
 *
 * // 2. Application (in a Svelte component or .ts file):
 * import type { SupportedLocale } from './i18n';
 *
 * function setLanguage(lang: SupportedLocale) {
 *     // The 'lang' variable is now type-checked
 *     // (e.g., only 'en' | 'es' are allowed)
 *     i18n.setLocale(lang);
 * }
 *
 * setLanguage('en'); // OK
 * setLanguage('fr'); // TS Error
 * ```
 *
 * ---
 *
 * 從 i18n 實例中推導出 `SupportedLocale` 型別 (例如: 'en' | 'es')。
 *
 * @example
 * ```ts
 * // 1. 利用 (在 i18n.ts 或 app.d.ts):
 * export type SupportedLocale = inferSupportedLocale<typeof i18n>;
 *
 * // 2. 應用 (在 Svelte 組件或 .ts 檔案中):
 * import type { SupportedLocale } from './i18n';
 *
 * function setLanguage(lang: SupportedLocale) {
 *     // lang 變數現在會被 TypeScript 檢查
 *     // (例如: 只接受 'en' | 'es')
 *     i18n.setLocale(lang);
 * }
 *
 * setLanguage('en'); // OK
 * setLanguage('fr'); // TS 錯誤
 * ```
 */
export type inferSupportedLocale<T extends AnyI18nStore> = T['_types']['LangCode'];

/**
 * Infers the full `TranslationEntry` type (e.g., { en: string; es: string; }) from your i18n instance.
 *
 * @example
 * ```ts
 * // 1. Utilization (in i18n.ts or app.d.ts):
 * export type TranslationEntry = inferTranslationEntry<typeof i18n>;
 *
 * // 2. Application (e.g., for type-checking a complete entry):
 * import type { TranslationEntry } from './i18n';
 *
 * // This type ensures an object has ALL supported languages.
 * const completeEntry: TranslationEntry = {
 *     en: "OK",
 *     es: "Vale"
 *     // If 'jp' was a supported lang, TS would error here
 *     // because it's missing.
 * };
 * ```
 *
 * ---
 *
 * 從 i18n 實例中推導出 *完整* 的 `TranslationEntry` 型別 (例如: { en: string; es: string; })。
 *
 * @example
 * ```ts
 * // 1. 利用 (在 i18n.ts 或 app.d.ts):
 * export type TranslationEntry = inferTranslationEntry<typeof i18n>;
 *
 * // 2. 應用 (例如: 用於型別檢查一個 *完整* 的條目):
 * import type { TranslationEntry } from './i18n';
 *
 * // 此型別確保一個物件包含 *所有* 支援的語言
 * const completeEntry: TranslationEntry = {
 *     en: "OK",
 *     es: "Vale"
 *     // 如果 'jp' 也是支援語言, TS 會在此報錯 (因為缺少 'jp')
 * };
 * ```
 */
export type inferTranslationEntry<T extends AnyI18nStore> = T['_types']['TranslationEntry'];

/**
 * Infers the `PartialTranslationEntry` type from your i18n instance.
 * This is the main type used for defining translation files.
 *
 * @example
 * ```ts
 * // 1. Utilization (in i18n.ts or app.d.ts):
 * export type PartialTranslationEntry = inferPartialTranslationEntry<typeof i18n>;
 *
 * // 2. Application (e.g., in /locales/page.ts):
 * import type { PartialTranslationEntry } from '../i18n';
 *
 * const pageTranslations: PartialTranslationEntry = {
 *     "page.title": {
 *         en: "My Page",
 *         es: "Mi Página"
 *     },
 *     "page.welcome": {
 *         en: "Welcome!" // Partially defined (missing 'es') is OK
 *     }
 * };
 *
 * // Use it to load translations
 * // i18n.extendTranslations([pageTranslations]);
 * ```
 *
 * ---
 *
 * 從 i18n 實例中推導出 `PartialTranslationEntry` 型別。
 * 這是定義翻譯檔案時最主要的型別。
 *
 * @example
 * ```ts
 * // 1. 利用 (在 i18n.ts 或 app.d.ts):
 * export type PartialTranslationEntry = inferPartialTranslationEntry<typeof i18n>;
 *
 * // 2. 應用 (例如: 在 /locales/page.ts 中):
 * import type { PartialTranslationEntry } from '../i18n';
 *
 * const pageTranslations: PartialTranslationEntry = {
 * "page.title": {
 *         en: "My Page",
 *         es: "Mi Página"
 *     },
 *     "page.welcome": {
 *         en: "Welcome!" // 部分定義 (缺少 'es') 是允許的
 *     }
 * };
 *
 * // 用於載入翻譯
 * // i18n.extendTranslations([pageTranslations]);
 * ```
 */
export type inferPartialTranslationEntry<T extends AnyI18nStore> =
    T['_types']['PartialTranslationEntry'];
