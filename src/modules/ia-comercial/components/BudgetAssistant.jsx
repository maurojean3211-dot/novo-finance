import { useMemo, useState } from "react";
import { findCatalogMatches } from "../services/commercialAssistantRules.service";

const emptyForm = { contact: "", need: "", product: "", quantity: "", notes: "" };

export default function BudgetAssistant({ context }) {
  const [form, setForm] = useState(emptyForm);
  const [prepared, setPrepared] = useState(false);
  const [copied, setCopied] = useState(false);
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setPrepared(false); setCopied(false); };
  const matches = useMemo(() => findCatalogMatches(`${form.need} ${form.product}`, context.products), [context.products, form.need, form.product]);
  const missing = [["cliente ou prospect", form.contact], ["necessidade", form.need], ["produto/material", form.product], ["quantidade", form.quantity]].filter(([, value]) => !String(value).trim()).map(([label]) => label);
  const summary = `Resumo preliminar\nCliente ou prospect: ${form.contact || "não informado"}\nNecessidade: ${form.need || "não informada"}\nProduto/material: ${form.product || "não informado"}\nQuantidade: ${form.quantity || "não informada"}\nObservações: ${form.notes || "nenhuma"}\nCorrespondências no catálogo: ${matches.map((item) => item.name || item.description || item.supplierCode).join(", ") || "nenhuma"}\nDados faltantes: ${missing.join(", ") || "nenhum"}\nResumo preliminar sujeito à conferência humana.`;
  async function copySummary() { await navigator.clipboard.writeText(summary); setCopied(true); }
  return <section className="budget-assistant"><header><span>Apoio local</span><h2>Assistente de Orçamento</h2><p>Organiza informações sem definir preço, margem ou gravar orçamento.</p></header><div className="budget-assistant__form"><label><span>Cliente ou prospect</span><input value={form.contact} onChange={(event) => update("contact", event.target.value)} /></label><label><span>Necessidade informada</span><input value={form.need} onChange={(event) => update("need", event.target.value)} /></label><label><span>Produto/material</span><input value={form.product} onChange={(event) => update("product", event.target.value)} /></label><label><span>Quantidade</span><input value={form.quantity} onChange={(event) => update("quantity", event.target.value)} /></label><label className="wide"><span>Observações</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label></div><button type="button" onClick={() => setPrepared(true)}>Preparar resumo preliminar</button>{prepared && <div className="budget-assistant__result"><strong>Resumo preliminar sujeito à conferência humana.</strong>{matches.length ? <p>{matches.length} correspondência(s) possível(is) no Catálogo.</p> : <p>Nenhuma correspondência comprovável localizada no Catálogo.</p>}{missing.length > 0 && <p>Dados faltantes: {missing.join(", ")}.</p>}<pre>{summary}</pre><button type="button" onClick={copySummary}>{copied ? "Resumo copiado" : "Copiar resumo"}</button></div>}</section>;
}
