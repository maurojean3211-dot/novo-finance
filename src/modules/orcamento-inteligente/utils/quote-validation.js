export function getDemoValidation(quote) { return { valid: Boolean(quote.cliente && quote.items.length), warnings: quote.items.length ? [] : ["Inclua ao menos um item"] }; }
