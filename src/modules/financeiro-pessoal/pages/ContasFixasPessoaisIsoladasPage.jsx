import { useState } from "react";
import PersonalFixedExpenseModal from "../components/PersonalFixedExpenseModal";
import PersonalModulePreview from "../components/PersonalModulePreview";
import { usePersonalFixedExpensesRead } from "../hooks/usePersonalFinanceRead";
import { deletePersonalFixedExpense, generatePersonalRecurringTitles, savePersonalFixedExpense } from "../services/personalFinance.service";
import { money } from "../utils/personalFinance";
import { fixedExpensesForMonth } from "../utils/personalFinanceCalculations";

const emptyForm = { descricao: "", contraparte: "", valor: "", dia_vencimento: "", frequencia: "Mensal", data_base: "", data_fim: "", ativo: true, classificacao: "Fixa", observacoes: "", forma_pagamento: "", conta_financeira: "", gerar_automaticamente: true };

export default function ContasFixasPessoaisIsoladasPage({ empresaId, userId }) {
  const { records, loading, error, reload } = usePersonalFixedExpensesRead(empresaId, userId);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const currentMonth = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).slice(0, 7);
  const activeRecords = fixedExpensesForMonth(records, currentMonth);
  const totalMonthly = activeRecords.reduce((sum, item) => sum + Number(item.valor_previsto || item.valor || 0), 0);
  function openNew() { setEditingId(null); setForm(emptyForm); setModalOpen(true); setFeedback(null); }
  function openEdit(item) { setEditingId(item.id); setForm({ ...emptyForm, descricao: item.descricao || "", contraparte: item.contraparte || "", valor: item.valor_previsto || item.valor || "", dia_vencimento: item.dia_vencimento || "", frequencia: item.frequencia || "Mensal", data_base: String(item.data_inicio || item.data_base || "").slice(0, 10), data_fim: String(item.data_fim || "").slice(0, 10), ativo: item.ativo !== false, classificacao: item.classificacao || "Fixa", observacoes: item.observacoes || "", forma_pagamento: item.forma_pagamento || "", conta_financeira: item.conta_financeira || "", gerar_automaticamente: item.gerar_automaticamente !== false }); setModalOpen(true); setFeedback(null); }
  async function save() {
    const dueDay = Number(form.dia_vencimento);
    if (!form.descricao.trim() || !(Number(form.valor) > 0) || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31 || !form.data_base) { setFeedback({ type: "error", message: "Informe descrição, valor maior que zero, vencimento entre os dias 1 e 31 e data-base." }); return; }
    setSaving(true);
    try { await savePersonalFixedExpense({ empresaId, userId, id: editingId, values: form }); await reload(); setModalOpen(false); setFeedback({ type: "success", message: editingId ? "Conta fixa atualizada com sucesso." : "Conta fixa cadastrada com sucesso." }); }
    catch (saveError) { setFeedback({ type: "error", message: `Não foi possível salvar a conta fixa: ${saveError.message}` }); }
    finally { setSaving(false); }
  }
  async function remove(item) {
    if (!window.confirm(`Excluir a conta fixa “${item.descricao || "sem descrição"}”?`)) return;
    try { await deletePersonalFixedExpense({ empresaId, userId, id: item.id }); await reload(); setFeedback({ type: "success", message: "Conta fixa excluída com sucesso." }); }
    catch (deleteError) { setFeedback({ type: "error", message: `Não foi possível excluir a conta fixa: ${deleteError.message}` }); }
  }
  const rows = records.map((item) => ({ id: item.id, descricao: item.descricao || "—", periodicidade: item.frequencia || "Mensal", vencimento: item.dia_vencimento ? `Dia ${item.dia_vencimento}` : "—", valor: money(item.valor_previsto || item.valor), status: item.ativo === false ? "Inativa" : "Ativa", acoes: <div className="pf-row-actions"><button type="button" onClick={() => openEdit(item)}>Editar</button><button type="button" onClick={async () => { try { const result = await generatePersonalRecurringTitles({ competencia: currentMonth, recurrenceId: item.id }); await reload(); setFeedback({ type: "success", message: result.some((entry) => entry.criado) ? "Conta a pagar do mês gerada." : "A conta do mês já existia; nenhuma duplicidade foi criada." }); } catch (cause) { setFeedback({ type: "error", message: cause.message }); } }}>Gerar mês</button><button type="button" className="danger" onClick={() => remove(item)}>Desativar</button></div> }));
  const notice = error ? `Não foi possível carregar as contas fixas: ${error}` : loading ? "Carregando recorrências pessoais…" : "A recorrência é uma regra geradora. Cada competência cria no máximo uma Conta a Pagar; a baixa continua no fluxo existente.";
  return <PersonalModulePreview title="Contas Fixas" description="Visualize e gerencie compromissos recorrentes exclusivamente pessoais." notice={notice} feedback={feedback} actionLabel="Nova Conta Fixa" onAction={openNew} metrics={[{ label: "Total mensal", value: money(totalMonthly), detail: `${records.length} conta(s)`, icon: "R$" }, { label: "Total anual", value: money(totalMonthly * 12), detail: "estimativa", icon: "↗" }, { label: "Contas ativas", value: activeRecords.length, detail: "dados existentes", icon: "✓", tone: "green" }]} columns={[{ key: "descricao", label: "Descrição" }, { key: "periodicidade", label: "Periodicidade" }, { key: "vencimento", label: "Vencimento" }, { key: "valor", label: "Valor" }, { key: "status", label: "Status" }, { key: "acoes", label: "Ações" }]} rows={rows} emptyMessage={loading ? "Carregando contas fixas pessoais" : "Nenhuma conta fixa pessoal encontrada"} modal={modalOpen ? <PersonalFixedExpenseModal editing={Boolean(editingId)} values={form} onChange={setForm} onClose={() => setModalOpen(false)} onSubmit={save} saving={saving} /> : null} />;
}
