import { useMemo, useRef, useState } from "react";
import { money } from "../utils/personalFinance";
import { canImportReconciliationItem, reconcileStatementTransactions, reconciliationTotals, RECONCILIATION_GROUPS } from "../utils/bankReconciliation";
import { extractPdfLinesLocally, parseNubankStatement } from "../utils/nubankStatementParser";
import { importPersonalReconciliationItems } from "../services/personalFinance.service";

export default function BankReconciliationPanel({ empresaId, userId, incomes, expenses, onImported }) {
  const inputRef = useRef(null);
  const [statement, setStatement] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const existing = useMemo(() => [...incomes, ...expenses], [expenses, incomes]);
  const totals = statement ? reconciliationTotals(statement, items) : null;
  const selectedCount = items.filter(canImportReconciliationItem).length;

  async function readFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf")) { setFeedback("Selecione um arquivo PDF do Nubank."); return; }
    setBusy(true); setFeedback("");
    try {
      const parsed = parseNubankStatement(await extractPdfLinesLocally(file));
      setStatement(parsed);
      setItems(reconcileStatementTransactions(parsed.transactions, existing));
      setFeedback(parsed.warnings.join(" "));
    } catch (cause) { setStatement(null); setItems([]); setFeedback(`Não foi possível ler o PDF localmente: ${cause.message}`); }
    finally { setBusy(false); }
  }

  function updateItem(id, changes) { setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item)); }
  async function importSelected() {
    const selected = items.filter(canImportReconciliationItem);
    if (!selected.length || !window.confirm(`Importar ${selected.length} lançamento(s) selecionado(s)? Nenhum lançamento existente será alterado.`)) return;
    setBusy(true); setFeedback("");
    try {
      const result = await importPersonalReconciliationItems({ empresaId, userId, items: selected });
      setFeedback(`${result.imported} lançamento(s) importado(s). ${result.skipped} item(ns) ignorado(s) por já existirem.`);
      setItems((current) => current.map((item) => result.importedIds.includes(item.id) ? { ...item, selected: false, situation: "Já conciliado / encontrado no sistema" } : item));
      await onImported?.();
    } catch (cause) { setFeedback(`A importação foi interrompida: ${cause.message}`); }
    finally { setBusy(false); }
  }

  return <section className="ops-panel pf-reconciliation"><div className="ops-panel__header"><div><h2>Conciliação bancária por extrato</h2><span>Primeira versão: Nubank PDF · processamento local no navegador</span></div><div className="pf-reconciliation__actions"><input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onChange={readFile} /><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "Processando…" : "Selecionar extrato PDF"}</button><button type="button" className="primary" onClick={importSelected} disabled={busy || !selectedCount}>Importar selecionados ({selectedCount})</button></div></div>
    <p className="pf-reconciliation__privacy">O extrato permanece neste dispositivo. Nada é enviado a serviços de leitura externos. A importação apenas cria itens confirmados; nunca modifica ou exclui lançamentos existentes.</p>
    {feedback && <div className="pf-feedback">{feedback}</div>}
    {!statement ? <div className="pf-report-empty">Selecione um extrato Nubank para iniciar a conferência.</div> : <>
      <div className="pf-reconciliation__balances"><article><span>Saldo inicial do extrato</span><strong>{statement.initialBalance == null ? "Não identificado" : money(statement.initialBalance)}</strong></article><article><span>Entradas do extrato</span><strong>{money(totals.incoming)}</strong></article><article><span>Saídas do extrato</span><strong>{money(totals.outgoing)}</strong></article><article><span>Saldo final do extrato</span><strong>{statement.finalBalance == null ? "Não identificado" : money(statement.finalBalance)}</strong></article><article><span>Encontrado no Cunha Finance</span><strong>{money(totals.found)}</strong></article><article><span>Diferença a conciliar</span><strong>{money(totals.difference)}</strong></article></div>
      <p className="pf-reconciliation__bank-note">Os saldos acima são bancários e vêm do extrato. Eles não são o “Saldo acumulado calculado” do Cunha Finance.</p>
      {RECONCILIATION_GROUPS.map((group) => { const records = items.filter((item) => item.situation === group); if (!records.length) return null; return <section key={group} className="pf-reconciliation__group"><header><h3>{group}</h3><span>{records.length} item(ns)</span></header><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Importar</th><th>Data</th><th>Descrição do extrato</th><th>Valor</th><th>Tipo sugerido</th><th>Categoria sugerida</th><th>Situação</th></tr></thead><tbody>{records.map((item) => <tr key={item.id}><td><input type="checkbox" checked={Boolean(item.selected)} disabled={!item.systemType || item.matchedIds.length > 0} onChange={(event) => updateItem(item.id, { selected: event.target.checked })} /></td><td>{item.date.split("-").reverse().join("/")}</td><td>{item.description}</td><td>{money(item.amount)}</td><td><select value={item.suggestedType} onChange={(event) => { const suggestedType = event.target.value; updateItem(item.id, { suggestedType, systemType: suggestedType === "Receita" ? "receita" : ["Despesa", "Investimento"].includes(suggestedType) ? "despesa" : null, selected: false }); }}><option>Receita</option><option>Despesa</option><option>Investimento</option><option>Transferência</option><option>Revisar</option></select></td><td><input value={item.suggestedCategory} onChange={(event) => updateItem(item.id, { suggestedCategory: event.target.value })} /></td><td><select value={item.situation} onChange={(event) => { const situation = event.target.value; updateItem(item.id, { situation, selected: false, matchedIds: ["Faltando lançar", "Investimentos"].includes(situation) ? [] : item.matchedIds }); }}>{RECONCILIATION_GROUPS.map((value) => <option key={value}>{value}</option>)}</select></td></tr>)}</tbody></table></div></section>; })}
    </>}
  </section>;
}
