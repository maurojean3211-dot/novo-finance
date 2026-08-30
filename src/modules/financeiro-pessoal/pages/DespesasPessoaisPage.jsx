import { useState } from "react";
import FinancialDocumentPrototype from "../../documentos-financeiros/components/FinancialDocumentPrototype";
import PersonalModulePreview from "../components/PersonalModulePreview";
import PersonalTransactionModal from "../components/PersonalTransactionModal";
import { usePersonalExpensesRead } from "../hooks/usePersonalFinanceRead";
import { deletePersonalTransaction, savePersonalTransaction } from "../services/personalFinance.service";
import { dateLabel, money } from "../utils/personalFinance";
import { manualPersonalExpenses } from "../utils/personalFinanceCalculations";

const emptyForm = { descricao: "", valor: "", data: "", categoria: "" };

export default function DespesasPessoaisPage({ empresaId, userId }) {
  const source = usePersonalExpensesRead(empresaId, userId);
  const { loading, error, reload } = source;
  const records = manualPersonalExpenses(source.records);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const total = records.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const categoryTotals = records.reduce((totals, item) => ({ ...totals, [item.categoria || "Sem categoria"]: (totals[item.categoria || "Sem categoria"] || 0) + Number(item.valor || 0) }), {});
  const largestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  function openNew() { setEditingId(null); setForm(emptyForm); setModalOpen(true); setFeedback(null); }
  function openEdit(item) { setEditingId(item.id); setForm({ descricao: item.descricao || "", valor: item.valor || "", data: String(item.data_lancamento || "").slice(0, 10), categoria: item.categoria || "" }); setModalOpen(true); setFeedback(null); }
  async function confirmDocumentExpense(values) {
    await savePersonalTransaction({ empresaId, userId, tipo: "despesa", values });
    await reload();
    setFeedback({ type: "success", message: "Despesa cadastrada após revisão e confirmação." });
  }
  async function save() {
    if (!form.descricao.trim() || !(Number(form.valor) > 0) || !form.data) { setFeedback({ type: "error", message: "Informe descrição, valor maior que zero e data." }); return; }
    setSaving(true);
    try { await savePersonalTransaction({ empresaId, userId, tipo: "despesa", id: editingId, values: form }); await reload(); setModalOpen(false); setFeedback({ type: "success", message: editingId ? "Despesa atualizada com sucesso." : "Despesa cadastrada com sucesso." }); }
    catch (saveError) { setFeedback({ type: "error", message: `Não foi possível salvar a despesa: ${saveError.message}` }); }
    finally { setSaving(false); }
  }
  async function remove(item) {
    if (!window.confirm(`Excluir a despesa “${item.descricao || "sem descrição"}”?`)) return;
    try { await deletePersonalTransaction({ empresaId, userId, tipo: "despesa", id: item.id }); await reload(); setFeedback({ type: "success", message: "Despesa excluída com sucesso." }); }
    catch (deleteError) { setFeedback({ type: "error", message: `Não foi possível excluir a despesa: ${deleteError.message}` }); }
  }

  const rows = records.map((item) => ({ id: item.id, descricao: item.descricao || "—", categoria: item.categoria || "Sem categoria", data: dateLabel(item.data_lancamento), valor: money(item.valor), status: "Realizada", acoes: <div className="pf-row-actions"><button type="button" onClick={() => openEdit(item)}>Editar</button><button type="button" className="danger" onClick={() => remove(item)}>Excluir</button></div> }));
  const notice = error ? `Não foi possível carregar as despesas: ${error}` : loading ? "Carregando despesas pessoais existentes…" : "Dados reais de despesas, isolados pela empresa ativa e pelo tipo despesa. A tabela contas_pagar não é consultada.";
  return <PersonalModulePreview title="Despesas" description="Acompanhe e gerencie gastos pessoais realizados, sem vínculo empresarial." notice={notice} feedback={feedback} toolbar={<div className="pf-document-actions"><FinancialDocumentPrototype context="personal" destination="Despesa Pessoal" onConfirmExpense={confirmDocumentExpense} /></div>} actionLabel="Nova Despesa" onAction={openNew} metrics={[{ label: "Despesas", value: money(total), detail: `${records.length} lançamento(s)`, icon: "↘", tone: "amber" }, { label: "Maior categoria", value: largestCategory, detail: "dados existentes", icon: "▧" }, { label: "Média por lançamento", value: money(records.length ? total / records.length : 0), detail: "dados existentes", icon: "◎" }]} columns={[{ key: "descricao", label: "Descrição" }, { key: "categoria", label: "Categoria" }, { key: "data", label: "Data" }, { key: "valor", label: "Valor" }, { key: "status", label: "Status" }, { key: "acoes", label: "Ações" }]} rows={rows} emptyMessage={loading ? "Carregando despesas pessoais" : "Nenhuma despesa pessoal encontrada"} modal={modalOpen ? <PersonalTransactionModal kind="despesa" editing={Boolean(editingId)} values={form} onChange={setForm} onClose={() => setModalOpen(false)} onSubmit={save} saving={saving} /> : null} />;
}
