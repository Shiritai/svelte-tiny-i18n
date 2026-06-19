# 範例 (Examples)

此目錄包含可執行的 TypeScript 檔案，展示了 `svelte-tiny-i18n` 支援的三種主要型別安全策略。這些範例可作為您整合 i18n 及其型別系統的食譜。

您可以使用以下指令來執行型別驗證：

```bash
npm run test:types
```

## 1. 基礎靜態型別安全 (Basic Static Safety)

([`1-basic-type-safety.ts`](./1-basic-type-safety.ts))

這是預設且最常見的模式。當您使用 `initialTranslations` 陣列初始化 `createI18nStore` 時，TypeScript 會自動推斷翻譯物件的結構。像是 `home.title` 或 `errors.req` 這樣的 Key，會立即在 `$t` 函式中獲得自動補全支援。這種方法非常適合小型應用程式，或是一次性載入所有翻譯的專案，能開箱即用地享受零設定的型別安全。

## 2. 全域擴充 (Global Augmentation) - **推薦**

([`2-global-augmentation.ts`](./2-global-augmentation.ts))

對於動態載入翻譯（例如路由懶加載）的大型應用程式，我們強烈推薦這種「寫一次就好」的方法。只需在 `.d.ts` 檔案中加入一個簡單的 `declare module` 區塊，就能讓 `svelte-tiny-i18n` 識別您所有的翻譯模組——甚至是尚未載入的模組。

這項功能依賴於 TypeScript 的 `typeof import(...)`。您只需精確指向您的翻譯檔案，函式庫就會全域更新 `$t` 的型別定義。這確保了應用程式中的每個組件都能獲得所有 Key 的 IntelliSense，讓您的代碼保持整潔且型別安全，而無需到處傳遞泛型。

## 3. 零設定局部作用域 (Zero-Config Scope)

([`3-zero-config.ts`](./3-zero-config.ts))

如果您不想觸碰全域型別定義 (`.d.ts`)，或者希望將翻譯嚴格定義在組件旁邊 (Colocation)，這是最簡單的方法。當您呼叫 `extendTranslations` 時，函式庫會回傳一個特殊的、具備局部型別的 `t` store。

這個回傳的 store 同時擁有了既有的全域 Key _以及_ 您剛剛加入的新 Key。它完全不需要任何型別設定，非常適合獨立的功能模組或快速原型開發，讓您在不需要架構承諾的情況下也能享受型別安全。

## 4. 測試稽核 (Testing Audit)

([`4-testing-audit.ts`](./4-testing-audit.ts))

`svelte-tiny-i18n/testing` 子路徑是一套零依賴的 Node 工具，用於在型別系統之外稽核翻譯覆蓋率。本範例會檢查缺少語言的 key、掃描 `src` 中的 `$t(...)` 用法（區分靜態字面值與動態呼叫點），並執行單次組合的 `auditTranslations`。將它接到 vitest 測試或 CI 腳本，即可在出現未翻譯的 key 時讓建置失敗。

---

## 策略比較表

| 策略                | 所需設定 (Setup) | 作用域 (Scope) | 適用情境 (Best For)                       |
| :------------------ | :--------------- | :------------- | :---------------------------------------- |
| **1. 基礎靜態安全** | 無               | 全域           | 中小型應用，或單體式翻譯檔。              |
| **2. 全域擴充**     | 低 (`d.ts` 檔)   | 全域           | 大型應用、Lazy-load、確保全站型別一致性。 |
| **3. 零設定**       | 無               | 局部           | 組件級別翻譯、避免污染全域命名空間。      |
