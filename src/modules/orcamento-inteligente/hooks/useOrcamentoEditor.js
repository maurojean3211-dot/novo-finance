import { useState } from "react";
import { createCustomerSnapshot } from "../../../services/customer.service";
import { EMPTY_QUOTE } from "../types/orcamento";
import { EMPTY_QUOTE_ITEM } from "../types/orcamento-item";

export default function useOrcamentoEditor(initial) {
  const [quote, setQuote] = useState(() => initial
    ? { ...EMPTY_QUOTE, ...initial, clienteSnapshot: initial.clienteSnapshot ? { ...initial.clienteSnapshot } : null, items: (initial.items || []).map((item) => ({ ...item })) }
    : { ...EMPTY_QUOTE, items: [] });

  const update = (field, value) => setQuote((current) => ({ ...current, [field]: value }));
  const selectCustomer = (customer) => {
    const snapshot = createCustomerSnapshot(customer);
    setQuote((current) => ({ ...current, clienteId: customer.id, cliente: snapshot.nome, contato: snapshot.contatoResponsavel || snapshot.nome, vendedor: snapshot.vendedorResponsavel || current.vendedor, clienteSnapshot: snapshot }));
  };
  const clearCustomer = () => setQuote((current) => ({ ...current, clienteId: null, cliente: "", contato: "", clienteSnapshot: null }));
  const addItem = (item) => setQuote((current) => ({ ...current, items: [...current.items, { ...EMPTY_QUOTE_ITEM, ...item, id: `local-${Date.now()}` }] }));
  const removeItem = (id) => setQuote((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));

  return { quote, update, selectCustomer, clearCustomer, addItem, removeItem };
}
