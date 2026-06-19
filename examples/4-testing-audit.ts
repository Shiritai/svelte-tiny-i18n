import { defineI18nConfig } from '../src/svelte-tiny-i18n';
import { auditTranslations, findMissingLocales, scanSourceKeys } from '../src/testing';

// Reuse your real app config (this is just an inline sample).
const config = defineI18nConfig({
    supportedLocales: ['en', 'zh-TW'],
    defaultLocale: 'en',
    localStorageKey: 'demo',
    initialTranslations: [
        {
            hello: { en: 'Hello', 'zh-TW': '你好' },
            bye: { en: 'Goodbye' } // 'zh-TW' missing on purpose
        }
    ]
});

// 1. Locale-completeness check (every key has every supported locale).
const incomplete = findMissingLocales(config);
// -> [{ key: 'bye', missing: ['zh-TW'] }]

// 2. Scan source for $t('...') usage, separating static from dynamic keys.
const { staticKeys, dynamic } = scanSourceKeys('./src');
// staticKeys: literal keys to verify; dynamic: call sites to review by hand.

// 3. One-call audit: scan + missing-key + missing-locale, all composed.
const report = auditTranslations({
    config,
    dir: './src',
    // Data-driven keys you build at runtime can be listed explicitly.
    extraKeys: ['notification.welcome']
});

if (!report.ok) {
    console.error('i18n audit failed', report.missingKeys, report.missingLocales);
}

// Keep the bindings referenced so this example type-checks cleanly.
void incomplete;
void staticKeys;
void dynamic;
