import { useState } from "react";
import { EMPTY_QUOTE } from "../types/orcamento";
import { EMPTY_QUOTE_ITEM } from "../types/orcamento-item";
export default function useOrcamentoEditor(initial) { const [quote, setQuote] = useState(() => initial ? { ...initial, items: initial.items.map((i) => ({ ...i })) } : { ...EMPTY_QUOTE, items: [] }); const update = (field, value) => setQuote((current) => ({ ...current, [field]: value })); const addItem = (item) => setQuote((current) => ({ ...current, items: [...current.items, { ...EMPTY_QUOTE_ITEM, ...item, id: `local-${Date.now()}` }] })); const removeItem = (id) => setQuote((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) })); return { quote, update, addItem, removeItem }; }
