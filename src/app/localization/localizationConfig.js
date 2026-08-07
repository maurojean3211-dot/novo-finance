export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_CURRENCY = "BRL";
export const SUPPORTED_LOCALES = Object.freeze([{ code: "pt-BR", label: "Português (Brasil)" }, { code: "en", label: "English" }, { code: "es", label: "Español" }, { code: "fr", label: "Français" }]);
export const SUPPORTED_CURRENCIES = Object.freeze(["BRL", "USD", "EUR", "GBP", "CAD", "MXN"]);
export const LOCALIZATION_FIELDS = Object.freeze({ country: "countryCode", region: "region", city: "city", postalCode: "postalCode", locale: "preferredLocale", currency: "preferredCurrency", timeZone: "timeZone" });
export const DASHBOARD_GLOBAL_DIMENSIONS = Object.freeze(["countryCode", "region", "preferredCurrency", "preferredLocale", "representative", "segment", "conversionStatus"]);
export const CORE_MESSAGES = Object.freeze({
  "pt-BR": { save: "Salvar", cancel: "Cancelar", search: "Buscar", country: "País", currency: "Moeda", language: "Idioma" },
  en: { save: "Save", cancel: "Cancel", search: "Search", country: "Country", currency: "Currency", language: "Language" },
  es: { save: "Guardar", cancel: "Cancelar", search: "Buscar", country: "País", currency: "Moneda", language: "Idioma" },
  fr: { save: "Enregistrer", cancel: "Annuler", search: "Rechercher", country: "Pays", currency: "Devise", language: "Langue" },
});
export function resolveLocale(locale) { return SUPPORTED_LOCALES.some((item) => item.code === locale) ? locale : DEFAULT_LOCALE; }
export function translate(key, locale = DEFAULT_LOCALE) { return CORE_MESSAGES[resolveLocale(locale)]?.[key] || CORE_MESSAGES[DEFAULT_LOCALE][key] || key; }
export function normalizeCurrency(currency) { return String(currency || DEFAULT_CURRENCY).trim().toUpperCase(); }
export function createCurrencyFormatter({ locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY, ...options } = {}) { return new Intl.NumberFormat(resolveLocale(locale), { style: "currency", currency: normalizeCurrency(currency), ...options }); }
export function createDateFormatter({ locale = DEFAULT_LOCALE, timeZone, ...options } = {}) { return new Intl.DateTimeFormat(resolveLocale(locale), { ...(timeZone ? { timeZone } : {}), ...options }); }
