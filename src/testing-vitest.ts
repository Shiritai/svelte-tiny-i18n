/**
 * @license MIT
 * svelte-tiny-i18n/testing/vitest
 * Copyright (c) 2025 Shiritai (Yang Tzu-Ching)
 *
 * Optional vitest matchers wrapping the pure helpers in `./testing`. Thin by
 * design: all logic lives in the framework-free module so the core toolkit
 * never depends on vitest (only the matcher type augmentation does).
 * https://github.com/Shiritai/svelte-tiny-i18n
 */

import { expect } from 'vitest';
import { findMissingLocales, findMissingKeys, type AuditableConfig } from './testing';

/**
 * Registers two matchers against a config:
 *
 * - `expect(config).toHaveCompleteLocales()` -> passes when every key covers
 *   all supported locales (delegates to {@link findMissingLocales}).
 * - `expect(config).toHaveNoMissingKeys(keys)` -> passes when none of `keys` is
 *   absent from the config (delegates to {@link findMissingKeys}).
 *
 * Call once in a setup file or at the top of a spec.
 *
 * ---
 *
 * 為設定註冊兩個 matcher：`toHaveCompleteLocales()` 檢查每個 key 是否覆蓋所有支援
 * 語言；`toHaveNoMissingKeys(keys)` 檢查 `keys` 是否皆存在於設定。皆為純函式的薄包裝，
 * 於 setup 檔或 spec 開頭呼叫一次即可。
 */
export function registerI18nMatchers(): void {
    expect.extend({
        toHaveCompleteLocales(received: AuditableConfig) {
            const missing = findMissingLocales(received);
            return {
                pass: missing.length === 0,
                message: () =>
                    missing.length === 0
                        ? 'expected some keys to be missing locales, but all are complete'
                        : `expected all keys to have complete locales, but found gaps:\n` +
                          missing
                              .map((m) => `  - ${m.key}: missing ${m.missing.join(', ')}`)
                              .join('\n')
            };
        },
        toHaveNoMissingKeys(received: AuditableConfig, keys: string[]) {
            const missing = findMissingKeys(received, keys);
            return {
                pass: missing.length === 0,
                message: () =>
                    missing.length === 0
                        ? 'expected some keys to be missing, but all are present'
                        : `expected no missing keys, but these are absent from the config:\n` +
                          missing.map((k) => `  - ${k}`).join('\n')
            };
        }
    });
}

declare module 'vitest' {
    // Default type parameter must match vitest's own `Matchers<T = any>`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface Matchers<T = any> {
        /** Asserts every key in the config covers all supported locales. */
        toHaveCompleteLocales(): T;
        /** Asserts none of the given keys is absent from the config. */
        toHaveNoMissingKeys(keys: string[]): T;
    }
}
