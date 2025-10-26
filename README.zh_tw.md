# svelte-tiny-i18n

[![NPM Version](https://img.shields.io/npm/v/svelte-tiny-i18n)](https://www.npmjs.com/package/svelte-tiny-i18n)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/svelte-tiny-i18n)](https://bundlephobia.com/package/svelte-tiny-i18n)

( [English](README.md) | 繁體中文 )

`svelte-tiny-i18n` 是一個為 [Svelte](https://svelte.dev/) 和 [SvelteKit](https://kit.svelte.dev/) 設計的輕量級、型別安全、響應式的 i18n (國際化) 函式庫，完全基於 Svelte Stores 構建。

本函式庫是「Headless」的，代表它只提供核心的邏輯和 Svelte stores，而將 UI 和組件整合完全交給開發者。

## TL;DR

`svelte-tiny-i18n` 是為那些**追求極致輕量、零依賴、零建構設定**，同時又**享受 Svelte 原生 Store 體驗和 TypeScript 即時型別推斷**的開發者設計的。

它的核心優勢是：**零設定的型別安全**。您只需在 `i18n.ts` 設定檔中定義支援的語言（例如 `['en', 'es']`），TypeScript 立刻就能為您的 `setLocale` 函式提供即時的型別檢查與自動補全（例如 `setLocale('es')` 合法，`setLocale('fr')` 會報錯）—— 完全不需執行任何程式碼產生器。

這使它成為中小型專案、或Svelte生態愛好者的理想選擇。

### 範例：最精簡的 SvelteKit 整合

假設專案的目錄結構如下：

```tree
/src
├── /lib
│   └── i18n.ts         <- 1. 設定檔
└── /routes
    └── /[lang]
        ├── +layout.ts  <- 2. SvelteKit 整合
        ├── +page.svelte  <- 3. 使用
        └── /about
            └── +page.svelte
```

1. **`src/lib/i18n.ts`** (設定檔)

    ```ts
    import { createI18nStore, defineI18nConfig } from 'svelte-tiny-i18n';

    const config = defineI18nConfig({
        supportedLocales: ['en', 'es'],
        defaultLocale: 'en',
        localStorageKey: 'lang',
        initialTranslations: [
            {
                hello: { en: 'Hello', es: 'Hola' }
            }
        ]
    });

    export const i18n = createI18nStore(config);
    export type SupportedLocale = inferSupportedLocale<typeof i18n>;
    ```

2. **`src/routes/[lang]/+layout.ts`** (SvelteKit 整合)

    ```ts
    import { i18n } from '$lib/i18n';
    import type { LayoutLoad } from './$types';

    export const load: LayoutLoad = ({ params }) => {
        // 'lang' 來自您的路由 e.g. /[lang]/
        i18n.setLocale(params.lang);
        return {};
    };
    ```

3. **`src/routes/[lang]/+page.svelte`** (使用)

    ```svelte
    <script lang="ts">
        import { i18n } from '$lib/i18n';
        const { t, setLocale } = i18n;
    </script>

    <h1>{$t('hello')}</h1>
    <button on:click={() => setLocale('es')}>Español</button>
    ```

## 安裝

```bash
npm install svelte-tiny-i18n
```

```bash
pnpm add svelte-tiny-i18n
```

```bash
yarn add svelte-tiny-i18n
```

## 快速上手

使用 `svelte-tiny-i18n` 的最佳方式是建立一個專用的單一實例。

### 1. 建立 i18n 實例

在 `/src/lib/i18n.ts` (或開發者偏好的位置) 建立一個檔案。

```ts
// /src/lib/i18n.ts
import {
    createI18nStore,
    defineI18nConfig,
    type inferSupportedLocale,
    type inferPartialTranslationEntry,
    type inferTranslationEntry
} from 'svelte-tiny-i18n';

// 1. 定義設定
const i18nConfig = defineI18nConfig({
    // 定義所有支援的語言
    supportedLocales: ['en', 'es', 'zh-TW'],

    // 預設語言
    defaultLocale: 'en',

    // 用於在 localStorage 中儲存語言的鍵
    localStorageKey: 'my-app-language',

    // (可選) 如果找不到翻譯鍵，在控制台顯示警告
    // 預設為 true
    devLogs: true,

    // 定義初始、全域翻譯
    initialTranslations: [
        {
            hello: {
                en: 'Hello, {name}!',
                es: '¡Hola, {name}!',
                'zh-TW': '你好, {name}!'
            },
            goodbye: {
                en: 'Goodbye',
                es: 'Adiós',
                'zh-TW': '再見'
            }
        }
    ]
});

// 2. 建立並導出 i18n 實例
export const i18n = createI18nStore(i18nConfig);

// 3. (可選) 導出推斷的型別，以實現全站的型別安全
export type SupportedLocale = inferSupportedLocale<typeof i18n>;
export type TranslationEntry = inferTranslationEntry<typeof i18n>;
export type PartialTranslationEntry = inferPartialTranslationEntry<typeof i18n>;
```

### 2. 在 Svelte 組件中使用

使用衍生的 store `$t` 來獲取翻譯，並使用 `locale` 來讀取、`setLocale` store 來設定語言。

```svelte
<script lang="ts">
    import { i18n } from '$lib/i18n';

    // 解構 stores 和函式
    const { t, locale, setLocale } = i18n;
</script>

<h1>{$t('hello', { name: 'World' })}</h1>

<nav>
    <p>目前語言: {$locale}</p>

    <button on:click={() => setLocale('en')}>English</button>
    <button on:click={() => setLocale('es')}>Español</button>
    <button on:click={() => setLocale('zh-TW')}>繁體中文</button>
</nav>

<p>{$t('a.missing.key')}</p>
```

### 3. 與 SvelteKit 整合 (建議)

為了讓 i18n 狀態在伺服器和客戶端都可用，並從 URL 參數 (例如 `/es/about`) 初始化，請在根 `+layout.ts` 中使用它。

```ts
// /src/routes/+layout.ts
import { i18n } from '$lib/i18n';
import type { LayoutLoad } from './$types';

// 這個 load 函式會在 SSR 和 CSR 上都運行
export const load: LayoutLoad = ({ params }) => {
    // 'lang' 必須匹配路由參數，例如 /[lang]/
    const { lang } = params;

    // setLocale 函式會驗證語言
    // 並設定 'locale' store。
    i18n.setLocale(lang);

    // 開發者可以選擇性地回傳 lang，但 store 本身已被設定
    return { lang };
};
```

**注意：** 您的 SvelteKit 路由結構必須類似 `/src/routes/[lang]/...` 才能使 `params.lang` 可用。

## 進階用法

### 動態 (非同步) 翻譯載入

您不需要在一開始就載入所有的翻譯。可以在頁面的 `+page.ts` 或 `+layout.ts` 中使用 `extendTranslations` 來按需載入。

1. 定義特定頁面的翻譯：

    ```ts
    // /src/locales/profile.ts
    import type { PartialTranslationEntry } from '$lib/i18n';

    export const profileTranslations: PartialTranslationEntry = {
        'profile.title': {
            en: 'My Profile',
            es: 'Mi Perfil',
            'zh-TW': '個人資料'
        },
        'profile.edit_button': {
            en: 'Edit'
            // 'es' 和 'zh-TW' 缺失是允許的！
        }
    };
    ```

2. 在頁面的 loader 中載入它們：

    ```ts
    // /src/routes/profile/+page.ts
    import { i18n } from '$lib/i18n';
    import { profileTranslations } from '$locales/profile';
    import type { PageLoad } from './$types';

    export const load: PageLoad = () => {
        // 動態地為此頁面添加翻譯
        i18n.extendTranslations([profileTranslations]);

        // 您也可以 await 非同步載入
        // const { jsonTranslations } = await import('$locales/profile.json');
        // i18n.extendTranslations([jsonTranslations]);
    };
    ```

新的翻譯現在已被合併到 store 中，並可透過 `$t` 函式使用。

## 核心優勢

`svelte-tiny-i18n` 旨在為 Svelte 開發者提供一個「最佳平衡點」—— 一個簡單、快速且型別安全的解決方案，而無需大型函式庫的額外開銷。

- **零設定的型別安全 (Zero-Config Type Safety)**: 您**不需**任何建構步驟 (build step)、程式碼產生器或複雜設定，就能立即獲得對語言代碼的完整型別安全。型別安全是透過 TypeScript 對單一設定檔的自動推斷 (inference) 來實現的。
- **極致輕量 (Extremely Lightweight)**: 這個函式庫非常「微小」（gzipped 後約 <1kb）。它**沒有任何外部依賴**，也不包含沉重的 ICU 訊息解析器 (message parser)，使您的應用程式啟動更快。
- **Svelte 原生 (Svelte Native)**: 完全基於 Svelte stores (`writable` 和 `derived`) 構建，使其無縫融入 Svelte 的響應式模型。
- **簡單而強大 (Simple but Powerful)**: 提供了所有基本功能：支援 SvelteKit 的 SSR/CSR、動態/非同步翻譯載入 (`extendTranslations`)，以及簡單的變數替換。
- **Headless 設計**: 函式庫只提供核心邏輯，讓您對 UI 整合擁有完全的控制權。(這也代表您需要自行更新 `<html>` 上的 `lang` 屬性。請參閱 [FAQ 中的範例](#q-如何動態更新-html-上的-lang-屬性或處理-rtl-由右至左-語言)。)

## 與其他函式庫比較

| 維度           | `svelte-tiny-i18n` (本專案)                             | `typesafe-i18n`                                   | `svelte-i18n`                                    |
| :------------- | :------------------------------------------------------ | :------------------------------------------------ | :----------------------------------------------- |
| **檔案大小**   | **極小 (<1kb)**                                         | **極小 (~1kb)**                                   | **中等 (~15kb+)**                                |
| **核心機制**   | 零依賴的 Svelte Stores + 簡單字串替換                   | **建構期 (Build-time) 產生器**                    | **執行期 (Runtime) ICU 解析器**                  |
| **型別安全**   | **高 (即時推斷)**                                       | **極高 (程式碼產生)**                             | 中 (需手動定義)                                  |
| **設定複雜度** | **非常低** (單一設定檔)                                 | 中 (需設定並執行產生器)                           | 低 (安裝即用)                                    |
| **進階格式化** | 僅支援 `{var}` 變數替換                                 | 支援 (複數、日期、數字格式化)                     | **支援 (完整 ICU 語法)**                         |
| **主要取捨**   | 捨棄 ICU 功能，換取**極致輕量**與**零設定的型別安全**。 | 需額外建構步驟，換取**最強的型別安全** (含參數)。 | 需載入 runtime 解析器，換取**最強的 ICU 功能**。 |

### 設計理念比較

- 如果您需要**進階格式化**（例如複雜的複數、日期/數字本地化），且不介意較大的檔案體積，**`svelte-i18n`** 是很好的選擇。它使用業界標準的 `formatjs` 和 ICU 語法。
- 如果您需要**絕對的型別安全**（包含翻譯函式的「參數」也需要型別檢查，例如 `$t('key', { arg: 'val' })`），並且願意設定一個程式碼產生器，**`typesafe-i18n`** 非常出色。
- 如果您最重視以下幾點，**`svelte-tiny-i18n`** 將是理想的選擇：
    1. **簡單易用**：2 分鐘內即可開始使用。
    2. **檔案體積**：極小的 bundle size 是首要考量。
    3. **毫不費力的型別安全**：您希望**不需**任何建構步驟，就能獲得強大的型別保障。

本函式庫刻意捨棄了「ICU 進階格式化」（`svelte-i18n` 的強項）和「參數級別的型別安全」（`typesafe-i18n` 的強項），以換取**極致的簡單性、最小的體積、以及零設定的型別安全**。

## API 參考

### 工廠函式

#### `createI18nStore(config)`

建立核心的 i18n 實例。回傳一個包含 stores 和函式的物件。

#### `defineI18nConfig(config)`

一個輔助函式，用於定義 `I18nConfig`，並提供完整的型別安全和推斷。

### 回傳的實例 (`i18n`)

當您呼叫 `createI18nStore` 時，您會得到一個物件：

- `t`: (唯讀的 derived store) 翻譯函式。
    - `$t('key')`
    - `$t('key', { placeholder: 'value' })`
- `locale`: (Readable store) 當前啟用的語言代碼 (例如 `en`)。此 store 是唯讀的；若要更新它，請使用 `setLocale()` 函式。
- `setLocale(lang: string | null | undefined)`: 一個用於安全設定初始語言的函式，通常在根 `+layout.ts` 中呼叫。
    - 如果 `lang` 是支援的語言，它將設定 `locale` store。
    - 如果 `lang` 是無效的 (或 `null`/`undefined`)，它將被忽略，`locale` store 會**保持其目前的值**。
- `extendTranslations(newTranslations: PartialTranslationEntry[])`: 將新的翻譯 (一個 _陣列_) 合併到主 store 中並觸發更新。
- `supportedLocales`: (唯讀 `readonly string[]`) 來自您設定檔的支援語言陣列。
- `defaultLocale`: (唯讀 `string`) 來自您設定檔的預設語言。
- `localStorageKey`: (唯讀 `string`) 來自您設定檔的 `localStorage` 鍵。

### 型別輔助工具 (Type Helpers)

為了在應用程式中實現穩健的型別安全，您可以直接從 `svelte-tiny-i18n` 導入型別輔助工具。

- `inferSupportedLocale<typeof i18n>`: 推斷出支援的語言代碼聯集 (例如 `'en' | 'es' | 'zh-TW'`)。
- `inferTranslationEntry<typeof i18n>`: 推斷出*完整*的翻譯條目型別 (例如 `{ en: string; es: string; 'zh-TW': string; }`)。
- `inferPartialTranslationEntry<typeof i18n>`: 推斷出翻譯檔案的型別 (例如 `{ [key: string]: { en?: string; es?: string; 'zh-TW'?: string; } }`)。

**範例：**

```ts
// /src/lib/i18n.ts
// ... (如「快速上手」中所示)
export type SupportedLocale = inferSupportedLocale<typeof i18n>;
```

```ts
// /src/components/SomeComponent.svelte
import { i18n } from '$lib/i18n';
import type { SupportedLocale } from '$lib/i18n';

// 'lang' 變數現在受到型別檢查
function setLanguage(lang: SupportedLocale) {
    i18n.setLocale(lang);
}

setLanguage('en'); // OK
setLanguage('fr'); // TypeScript 錯誤
```

## FAQ

### Q: 如何在**不使用 SvelteKit** 的 Svelte (Vite) 專案中使用？

A: 這樣更簡單。您不需要 `+layout.ts` 和 `i18n.setLocale()` 步驟。

Store 在瀏覽器環境中會自動透過 `localStorage` 或 `navigator.language` 來偵測並初始化語言。您可以在組件中隨時呼叫 `i18n.setLocale('new_lang')` 來切換語言。

### Q: 如何動態更新 `<html>` 上的 `lang` 屬性，或處理 RTL (由右至左) 語言？

A: 本函式庫是「Headless」設計，代表它不會主動操作 DOM。您可以輕鬆地在根佈局組件 (SvelteKit 的 `+layout.svelte` 或 Svelte/Vite 的 `App.svelte`) 中訂閱 `locale` store 來自行管理。

這是一個 SvelteKit 專案的範例，它會同時設定 `lang` 和 `dir` 屬性：

```svelte
<script lang="ts">
    import { i18n } from '$lib/i18n';
    const { locale } = i18n;

    // 定義您支援的語言中有哪些是 RTL
    // (例如阿拉伯語 'ar', 希伯來語 'he')
    const rtlLocales: string[] = ['ar', 'he'];

    $: if (typeof document !== 'undefined') {
        const direction = rtlLocales.includes($locale) ? 'rtl' : 'ltr';

        // 動態設定 <html> 上的屬性
        document.documentElement.lang = $locale;
        document.documentElement.dir = direction;
    }
</script>

<slot />
```

## 授權 (License)

[MIT](https://opensource.org/licenses/MIT)
