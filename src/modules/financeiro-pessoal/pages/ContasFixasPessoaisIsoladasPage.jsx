import { useState } from "react";
import PersonalFixedExpenseModal from "../components/PersonalFixedExpenseModal";
import PersonalModulePreview from "../components/PersonalModulePreview";
import { usePersonalFixedExpensesRead } from "../hooks/usePersonalFinanceRead";
import { deletePersonalFixedExpense, savePersonalFixedExpense } from "../services/personalFinance.service";
import { money } from "../utils/personalFinance";

const emptyForm = { descricao: "", valor: "", dia_vencimento: "", frequencia: "Mensal", ativo: true };

export default function ContasFixasPessoaisIsoladasPage({ empresaId }) {
  const { records, loading, error, reload } = usePersonalFixedExpensesRead(empresaId);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const activeRecords = records.filter((item) => item.ativo !== false);
  const totalMonthly = activeRecords.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  function openNew() { setEditingId(null); setForm(emptyForm); setModalOpen(true); setFeedback(null); }
  function openEdit(item) { setEditingId(item.id); setForm({ descricao: item.descricao || "", valor: item.valor || "", dia_vencimento: item.dia_vencimento || "", frequencia: item.frequencia || "Mensal", ativo: item.ativo !== false }); setModalOpen(true); setFeedback(null); }
  async function save() {
    const dueDay = Number(form.dia_vencimento);
    if (!form.descricao.trim() || !(Number(form.valor) > 0) || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) { setFeedback({ type: "error", message: "Informe descrição, valor maior que zero e vencimento entre os dias 1 e 31." }); return; }
    setSaving(true);
    try { await savePersonalFixedExpense({ empresaId, id: editingId, values: form }); await reload(); setModalOpen(false); setFeedback({ type: "success", message: editingId ? "Conta fixa atualizada com sucesso." : "Conta fixa cadastrada com sucesso." }); }
    catch (saveError) { setFeedback({ type: "error", message: `Não foi possível salvar a conta fixa: ${saveError.message}` }); }
    finally { setSaving(false); }
  }
  async function remove(item) {
    if (!window.confirm(`Excluir a conta fixa “${item.descricao || "sem descrição"}”?`)) return;
    try { await deletePersonalFixedExpense({ empresaId, id: item.id }); await reload(); setFeedback({ type: "success", message: "Conta fixa excluída com sucesso." }); }
    catch (deleteError) { setFeedback({ type: "error", message: `Não foi possível excluir a conta fixa: ${deleteError.message}` }); }
  }
  const rows = records.map((item) => ({ id: item.id, descricao: item.descricao || "—", periodicidade: item.frequencia || "Mensal", vencimento: item.dia_vencimento ? `Dia ${item.dia_vencimento}` : "—", valor: money(item.valor), status: item.ativo === false ? "Inativa" : "Ativa", acoes: <div className="pf-row-actions"><button type="button" onClick={() => openEdit(item)}>Editar</button><button type="button" className="danger" onClick={() => remove(item)}>Excluir</button></div> }));
  const notice = error ? `Não foi possível carregar as contas fixas: ${error}` : loading ? "Carregando contas fixas pessoais existentes…" : "Dados reais de contas_fixas, isolados pela empresa ativa. Os registros existentes não são alterados automaticamente.";
  return <PersonalModulePreview title="Contas Fixas" description="Visualize e gerencie compromissos recorrentes exclusivamente pessoais." notice={notice} feedback={feedback} actionLabel="Nova Conta Fixa" onAction={openNew} metrics={[{ label: "Total mensal", value: money(totalMonthly), detail: `${records.length} conta(s)`, icon: "R$" }, { label: "Total anual", value: money(totalMonthly * 12), detail: "estimativa", icon: "↗" }, { label: "Contas ativas", value: activeRecords.length, detail: "dados existentes", icon: "✓", tone: "green" }]} columns={[{ key: "descricao", label: "Descrição" }, { key: "periodicidade", label: "Periodicidade" }, { key: "vencimento", label: "Vencimento" }, { key: "valor", label: "Valor" }, { key: "status", label: "Status" }, { key: "acoes", label: "Ações" }]} rows={rows} emptyMessage={loading ? "Carregando contas fixas pessoais" : "Nenhuma conta fixa pessoal encontrada"} modal={modalOpen ? <PersonalFixedExpenseModal editing={Boolean(editingId)} values={form} onChange={setForm} onClose={() => setModalOpen(false)} onSubmit={save} saving={saving} /> : null} />;
}
