# svelte-tiny-i18n

[![NPM Version](https://img.shields.io/npm/v/svelte-tiny-i18n)](https://www.npmjs.com/package/svelte-tiny-i18n)
[![CI](https://github.com/Shiritai/svelte-tiny-i18n/actions/workflows/ci.yml/badge.svg)](https://github.com/Shiritai/svelte-tiny-i18n/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/svelte-tiny-i18n)](https://bundlephobia.com/package/svelte-tiny-i18n)

( [English](./README.md) | 繁體中文 )

`svelte-tiny-i18n` 是一個為 [Svelte](https://svelte.dev/) 和 [SvelteKit](https://kit.svelte.dev/) 設計的輕量級、型別安全且響應式的 i18n 函式庫，完全基於 Svelte Stores 構建。

> **💡 請查看 [範例目錄 (Examples)](./examples/README.zh_tw.md) 以查看所有型別安全模式的用法！**

## 核心價值 (TL;DR)

`svelte-tiny-i18n` 專為那些重視 **極致輕量、零依賴且零建構設定**，同時仍希望享受 **Svelte store 響應式體驗與 TypeScript 即時推斷** 的開發者所設計。

我們最大的優勢：**混合型別安全**。

1. **設定即推斷**: 對於靜態翻譯，Key 會自動推斷。
2. **全域擴充**: 對於動態載入，只需在 `d.ts` 中指向您的檔案，全域即可獲得型別提示。
3. **零設定作用域**: 或者，直接從 `extendTranslations` 取得一個已具備型別的 Store。

## 快速上手

### 1. 建立 i18n 實例

```ts
// /src/lib/i18n.ts
import { createI18nStore, defineI18nConfig } from 'svelte-tiny-i18n';

const i18nConfig = defineI18nConfig({
    supportedLocales: ['en', 'es', 'zh-TW'],
    defaultLocale: 'en',
    localStorageKey: 'my-app-language',

    // (可選) 自訂錯誤處理
    // 例如：在生產環境發送至 Sentry
    onError: (err) => {
        console.error('i18n error:', err.type, err.key);
    },

    // 1. 完全支援巢狀 JSON
    // 2. TypeScript 會自動推斷這些 Keys！
    initialTranslations: [
        {
            hello: { en: 'Hello', 'zh-TW': '你好' },
            home: {
                title: { en: 'Home Page' },
                btn: { en: 'Click Me' }
            }
        }
    ]
});

export const i18n = createI18nStore(i18nConfig);
```

### 2. 在 Svelte 組件中使用

```svelte
<script lang="ts">
    import { i18n } from '$lib/i18n';
    const { t, locale, setLocale } = i18n;
</script>

<h1>{$t('hello')}</h1>
<p>{$t('home.title')}</p>

<button on:click={() => setLocale('zh-TW')}> 中文 </button>
```

## 進階用法：動態載入與型別

當您需要動態載入翻譯（使用 `extendTranslations`）時，`svelte-tiny-i18n` 提供了兩種強大的型別策略。

### 策略 A：全域擴充 (Global Augmentation) - 推薦

讓您的 `$t` 保持全域可用，但透過 TypeScript 的 `typeof import` 自動化型別定義。

1. 建立 `src/i18n.d.ts`:

    ```ts
    import 'svelte-tiny-i18n';

    declare module 'svelte-tiny-i18n' {
        export interface TinyI18nTranslations {
            // 只需要指向您的翻譯檔案！
            profile: typeof import('./locales/profile.json');
            dashboard: typeof import('./features/dashboard/locales').default;
        }
    }
    ```

2. 現在 `$t('profile.name')` 在整個應用程式中都能獲得型別檢查，即便該檔案尚未載入！

### 策略 B：零設定 (Local Scope)

不想碰 `d.ts`？沒問題。`extendTranslations` 會回傳一個專為新內容設定好型別的 Store。

```ts
// /src/routes/profile/+page.svelte
import { profileTranslations } from './locales';

// 回傳的 't' 已經立即知道 'profile.*' 的 key
const { t } = i18n.extendTranslations([profileTranslations]);

$t('profile.title'); // ✅ Typed!
```

完整程式碼請參閱 [**範例 2: 全域擴充**](./examples/2-global-augmentation.ts) 與 [**範例 3: 零設定**](./examples/3-zero-config.ts)。

## 護欄工具 (Guardrail Tooling)

型別推斷能在呼叫點攔下缺漏的 key，但資料驅動的 key、動態語言，以及型別斷言逃生口仍可能漏網。v1.2.0 新增三項 opt-in 護欄來補上這個缺口。

### 嚴格模式 (Strict Mode)

在設定中設定 `strict: true`，且當您 **未** 提供自訂 `onError` 時，預設處理器會在缺少 key 或不支援語言時直接 **拋出錯誤** 而非僅 warn，讓沉默的缺漏在測試中變成硬失敗。

```ts
const i18n = createI18nStore(
    defineI18nConfig({
        supportedLocales: ['en', 'zh-TW'],
        defaultLocale: 'en',
        localStorageKey: 'lang',
        strict: true, // 缺 key / locale 時拋錯 (僅作用於預設處理器)
        initialTranslations: [{ hello: { en: 'Hello', 'zh-TW': '你好' } }]
    })
);
```

- **預設值**：僅在測試環境 (`process.env.NODE_ENV === 'test'`) 啟用。dev 仍 warn、prod 仍靜默，故既有行為不變。
- 自訂 `onError` **一律優先**，且絕不會被代為改成拋錯。

### `svelte-tiny-i18n/testing` — 覆蓋率稽核

零依賴的 Node 工具（不 import Svelte/瀏覽器），讓任何 app 都能自動化缺漏 key 檢查。可組合純函式，或直接使用可選的 vitest matcher：

```ts
// i18n.audit.spec.ts
import { describe, it } from 'vitest';
import { registerI18nMatchers } from 'svelte-tiny-i18n/testing/vitest';
import { auditTranslations } from 'svelte-tiny-i18n/testing';
import { i18nConfig } from './i18n'; // 您的 defineI18nConfig(...) 物件

registerI18nMatchers();

describe('i18n', () => {
    it('語言覆蓋完整且無缺漏 key', () => {
        // Matcher (純函式的薄包裝)：
        expect(i18nConfig).toHaveCompleteLocales();
        expect(i18nConfig).toHaveNoMissingKeys(['notification.welcome']);

        // 或單次組合稽核，並一併掃描原始碼中的 $t('...') 用法：
        const report = auditTranslations({ config: i18nConfig, dir: './src' });
        expect(report.ok).toBe(true);
    });
});
```

匯出函式：`flattenConfig`、`findMissingLocales`、`findMissingKeys`、`scanSourceKeys`（區分靜態字面值 key 與動態呼叫點；可理解 `as` 斷言形式），以及 `auditTranslations`。詳見 [**範例 4: 測試稽核**](./examples/4-testing-audit.ts)。

### `svelte-tiny-i18n/eslint` — Lint 規則

flat config 外掛，其 `no-key-assertion` 規則會禁止用型別斷言逃生口 `$t('key' as Parameters<typeof $t>[0])` 來矇騙 key 型別守衛。它僅在 **靜態 key**（字串字面值或無內插的 template）上觸發 —— 因為唯有這種情況編譯器原本就攔得下來 —— 並附帶 fixer 解開該斷言，讓真正的型別錯誤重新浮現。動態 key 的斷言（`$t(key as ...)`、``$t(`a.${x}` as ...)``）刻意不攔，因為型別守衛本就無從檢查；這類情況請改用 `/testing` 工具稽核。

```js
// eslint.config.js
import i18n from 'svelte-tiny-i18n/eslint';

export default [
    i18n.configs.recommended // 啟用 svelte-tiny-i18n/no-key-assertion
];
```

`eslint` 為（可選的）peer dependency，絕不打包進產物。`callees` 預設為 `['$t', 't', 'i18n.t']`，可自訂。

## 與其他函式庫比較

| 維度 (Dimension) | `svelte-tiny-i18n` (本專案)                                 | `typesafe-i18n`                                   | `svelte-i18n`                                    |
| :--------------- | :---------------------------------------------------------- | :------------------------------------------------ | :----------------------------------------------- |
| **檔案大小**     | **極小 (<1kb)**                                             | **極小 (~1kb)**                                   | **中等 (~15kb+)**                                |
| **核心機制**     | 零依賴的 Svelte Stores + 簡單字串替換                       | **建構期 (Build-time) 產生器**                    | **執行期 (Runtime) ICU 解析器**                  |
| **型別安全**     | **混合式 (推斷 + 擴充)**                                    | **極高 (程式碼產生)**                             | 中 (需手動定義)                                  |
| **設定複雜度**   | **非常低** (單一設定檔)                                     | 中 (需設定並執行產生器)                           | 低 (安裝即用)                                    |
| **進階格式化**   | 僅支援 `{var}` 變數替換                                     | 支援 (複數、日期、數字格式化)                     | **支援 (完整 ICU 語法)**                         |
| **主要取捨**     | 捨棄 ICU 功能，換取**極致輕量**與**零設定**的型別安全體驗。 | 需額外建構步驟，換取**最強的型別安全** (含參數)。 | 需載入 runtime 解析器，換取**最強的 ICU 功能**。 |

### 設計理念比較

- 如果您需要**進階格式化**（例如複雜的複數、日期/數字本地化），且不介意較大的檔案體積，**`svelte-i18n`** 是很好的選擇。
- 如果您需要**絕對的型別安全**（包含翻譯函式的「參數」也需要型別檢查），並且願意設定一個程式碼產生器，**`typesafe-i18n`** 非常出色。
- **`svelte-tiny-i18n`** 是 **極簡主義者** 的理想選擇，專注於 **簡單性**、**最小體積** 與 **毫不費力的型別安全** (無需 Build Step)。

## 常見問答 (FAQ)

### Q: 如何在**不使用 SvelteKit** 的 Svelte (Vite) 專案中使用？

A: 這樣更簡單。您不需要 `+layout.ts` 和 `i18n.setLocale()` 步驟。
Store 在瀏覽器環境中會自動透過 `localStorage` 或 `navigator.language` 來偵測並初始化語言。您可以在組件中隨時呼叫 `i18n.setLocale('new_lang')` 來切換語言。

### Q: 如何動態更新 `<html>` 上的 `lang` 屬性，或處理 RTL (由右至左) 語言？

A: 本函式庫是「Headless」設計，代表它不會主動操作 DOM。您可以輕鬆地在根佈局組件中自行管理。

```svelte
<script lang="ts">
    import { i18n } from '$lib/i18n';
    const { locale } = i18n;

    const rtlLocales: string[] = ['ar', 'he'];

    $: if (typeof document !== 'undefined') {
        const direction = rtlLocales.includes($locale) ? 'rtl' : 'ltr';
        document.documentElement.lang = $locale;
        document.documentElement.dir = direction;
    }
</script>

<slot />
```

## API 參考

### `defineI18nConfig(config)`

定義設定檔的輔助函式，提供型別推斷。

### `createI18nStore(config)`

建立實例。回傳：

- `t`: 翻譯用的 Derived store。
- `locale`: 目前語言的 Writable store。
- `setLocale(lang)`: 安全切換語言。
- `extendTranslations(modules)`:
    - 合併新的翻譯。
    - 回傳 `{ t }`: 一個新的 store 實例，其型別為「既有 keys + 新 keys」的聯集。

### `onError: (error) => void`

`config` 中的回呼函式，用於處理遺失的 key 或語言。一律優先於 `strict`。

- `error.type`: `'missing_key' | 'missing_locale'`
- `error.key`: 失敗的 key 或語言代碼。

### `strict: boolean`

為 `true` 且未提供自訂 `onError` 時，預設處理器會拋錯而非 warn。僅在測試環境 (`NODE_ENV === 'test'`) 預設為 `true`。詳見 [嚴格模式](#嚴格模式-strict-mode)。

## 開發與發版 (Contributing & Releasing)

每次 push 與 pull request 都會跑 CI：lint、型別檢查、build，以及在 Node 20/22/24 與 Svelte 4/5 上的測試，外加 coverage 門檻把關（門檻設於 `vitest.config.ts`）。

發版由 tag 驅動。bump 版號並推送 tag：

```sh
npm version patch        # 或 minor / major -> commit 並建立 vX.Y.Z tag
git push --follow-tags
```

推送 `v*` tag 會觸發 **Release** workflow：驗證 tag 與 `package.json` 一致、重跑檢查、以 provenance 發佈到 npm（Trusted Publishing via OIDC，免 token），並建立附自動產生 release notes 的 GitHub Release。

## License

[MIT](https://opensource.org/licenses/MIT)
