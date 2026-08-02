export function prepareSaleDraft(quote) { return quote ? { quoteId: quote.id, status: "demonstrativo" } : null; }
