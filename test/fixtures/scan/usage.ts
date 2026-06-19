import { i18n } from '$lib/i18n';

const { t } = i18n;

// Plain literal keys.
t('greeting.hello');
i18n.t('greeting.bye');

// Cast escape hatch: the literal must still be captured as a static key.
$t('casted.key' as Parameters<typeof $t>[0]);

// Dynamic keys: cannot be verified statically.
const name = 'dynamic.fromVar';
t(name);
t(`tmpl.${name}`);
