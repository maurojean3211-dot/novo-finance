import { useState } from "react";
import { savePersonalBudget, savePersonalCategory } from "../services/personalFinance.service";
import { money } from "../utils/personalFinance";

export default function PersonalBudgetPanel({ empresaId, userId, month, categories, rows, onSaved }) {
  const [category, setCategory] = useState({ nome: "", classificacao: "Variável essencial" });
  const [budget, setBudget] = useState({ categoria_id: "", valor_previsto: "" });
  const [feedback, setFeedback] = useState("");
  const run = async (work, message) => { try { await work(); setFeedback(message); await onSaved(); } catch (cause) { setFeedback(cause.message || "Não foi possível salvar."); } };
  return <section className="ops-panel pf-budget-panel">
    <div className="ops-panel__header"><div><h2>Orçamento x Realizado</h2><span>{month} · por categoria configurável</span></div></div>
    <div className="pf-budget-forms">
      <form onSubmit={(event) => { event.preventDefault(); void run(() => savePersonalCategory({ empresaId, userId, values: category }), "Categoria criada."); }}><input aria-label="Nome da categoria" placeholder="Nova categoria" value={category.nome} onChange={(event) => setCategory({ ...category, nome: event.target.value })}/><select value={category.classificacao} onChange={(event) => setCategory({ ...category, classificacao: event.target.value })}><option>Fixa</option><option>Variável essencial</option><option>Variável não essencial</option></select><button disabled={!category.nome.trim()}>Criar categoria</button></form>
      <form onSubmit={(event) => { event.preventDefault(); void run(() => savePersonalBudget({ empresaId, userId, values: { ...budget, competencia: month } }), "Orçamento salvo."); }}><select aria-label="Categoria do orçamento" value={budget.categoria_id} onChange={(event) => setBudget({ ...budget, categoria_id: event.target.value })}><option value="">Categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.classificacao}</option>)}</select><input aria-label="Valor do orçamento" type="number" min="0" step="0.01" placeholder="Valor mensal" value={budget.valor_previsto} onChange={(event) => setBudget({ ...budget, valor_previsto: event.target.value })}/><button disabled={!budget.categoria_id || budget.valor_previsto === ""}>Salvar orçamento</button></form>
    </div>
    {feedback && <p className="pf-budget-feedback">{feedback}</p>}
    <div className="pf-budget-list">{rows.map((row) => <article key={row.id} className={`is-${row.status}`}><header><div><strong>{row.categoria}</strong><small>{row.classificacao}</small></div><b>{row.percentage.toFixed(1)}%</b></header><div className="pf-budget-track"><i style={{ width: `${Math.min(row.percentage, 100)}%` }}/></div><footer><span>Orçamento <b>{money(row.planned)}</b></span><span>Realizado <b>{money(row.realized)}</b></span><span>{row.available >= 0 ? "Disponível" : "Excedido"} <b>{money(Math.abs(row.available))}</b></span></footer></article>)}{!rows.length && <p className="pf-report-empty">Cadastre uma categoria e seu orçamento mensal.</p>}</div>
  </section>;
}
