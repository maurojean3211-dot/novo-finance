import { useMemo, useState } from "react";
import { createQuoteNumber, getDemoQuotes } from "../services/orcamento.service";
import { OPEN_QUOTE_STATUSES } from "../types/orcamento";
const initialFilters = { search: "", cliente: "", vendedor: "", status: "", inicio: "", fim: "", validade: "", origem: "" };
export default function useOrcamentos() {
  const [quotes, setQuotes] = useState(getDemoQuotes);
  const [filters, setFilters] = useState(initialFilters);
  const filtered = useMemo(() => quotes.filter((quote) => { const search = filters.search.toLowerCase(); return (!search || [quote.id, quote.cliente].some((v) => String(v).toLowerCase().includes(search))) && (!filters.cliente || quote.cliente === filters.cliente) && (!filters.vendedor || quote.vendedor === filters.vendedor) && (!filters.status || quote.status === filters.status) && (!filters.origem || quote.origem === filters.origem) && (!filters.inicio || quote.createdAt >= filters.inicio) && (!filters.fim || quote.createdAt <= filters.fim) && (!filters.validade || quote.validade === filters.validade); }), [filters, quotes]);
  const metrics = useMemo(() => ({ abertos: quotes.filter((q) => OPEN_QUOTE_STATUSES.includes(q.status)).length, analise: quotes.filter((q) => q.status === "Aguardando análise").length, aprovacao: quotes.filter((q) => q.status === "Aguardando aprovação").length, enviados: quotes.filter((q) => q.status === "Enviado ao cliente").length, aceitos: quotes.filter((q) => q.status === "Aceito").length, vencidos: quotes.filter((q) => q.status === "Vencido").length, negociacao: quotes.filter((q) => q.status === "Em negociação").reduce((sum, q) => sum + q.valor, 0), margem: quotes.reduce((sum, q) => sum + q.margem, 0) / quotes.length }), [quotes]);
  function saveQuote(data) { const quote = data.id ? data : { ...data, id: createQuoteNumber(quotes.length), valor: data.items.reduce((sum, item) => sum + Number(item.preco || 0) * Number(item.quantidade || 0), 0), margem: 24.5, createdAt: new Date().toISOString().slice(0, 10) }; setQuotes((current) => data.id ? current.map((item) => item.id === data.id ? quote : item) : [quote, ...current]); return quote; }
  function updateStatus(id, status) { setQuotes((current) => current.map((quote) => quote.id === id ? { ...quote, status } : quote)); }
  return { quotes, filtered, filters, setFilters, clearFilters: () => setFilters(initialFilters), metrics, saveQuote, updateStatus };
}
