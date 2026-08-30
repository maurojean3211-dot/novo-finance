import { useState } from "react";
import PersonalModulePreview from "../components/PersonalModulePreview";
import PersonalTransactionModal from "../components/PersonalTransactionModal";
import { usePersonalIncomesRead } from "../hooks/usePersonalFinanceRead";
import { deletePersonalTransaction, savePersonalTransaction } from "../services/personalFinance.service";
import { dateLabel, money } from "../utils/personalFinance";

const emptyForm = { descricao: "", valor: "", data: "", categoria: "" };
const currentMonth = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
};
const shiftMonth = (month, offset) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
};

export default function ReceitasPessoaisPage({ empresaId, userId }) {
  const { records, loading, error, reload } = usePersonalIncomesRead(empresaId, userId);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const filteredRecords = selectedMonth === "all"
    ? records
    : records.filter((item) => String(item.data_lancamento || "").slice(0, 7) === selectedMonth);
  const total = filteredRecords.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const categoryTotals = filteredRecords.reduce((totals, item) => ({ ...totals, [item.categoria || "Sem categoria"]: (totals[item.categoria || "Sem categoria"] || 0) + Number(item.valor || 0) }), {});
  const largestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  function openNew() { setEditingId(null); setForm(emptyForm); setModalOpen(true); setFeedback(null); }
  function openEdit(item) { setEditingId(item.id); setForm({ descricao: item.descricao || "", valor: item.valor || "", data: String(item.data_lancamento || "").slice(0, 10), categoria: item.categoria || "" }); setModalOpen(true); setFeedback(null); }
  async function save() {
    if (!form.descricao.trim() || !(Number(form.valor) > 0) || !form.data) { setFeedback({ type: "error", message: "Informe descrição, valor maior que zero e data." }); return; }
    setSaving(true);
    try { await savePersonalTransaction({ empresaId, userId, tipo: "receita", id: editingId, values: form }); await reload(); setModalOpen(false); setFeedback({ type: "success", message: editingId ? "Receita atualizada com sucesso." : "Receita cadastrada com sucesso." }); }
    catch (saveError) { setFeedback({ type: "error", message: `Não foi possível salvar a receita: ${saveError.message}` }); }
    finally { setSaving(false); }
  }
  async function remove(item) {
    if (!window.confirm(`Excluir a receita “${item.descricao || "sem descrição"}”?`)) return;
    try { await deletePersonalTransaction({ empresaId, userId, tipo: "receita", id: item.id }); await reload(); setFeedback({ type: "success", message: "Receita excluída com sucesso." }); }
    catch (deleteError) { setFeedback({ type: "error", message: `Não foi possível excluir a receita: ${deleteError.message}` }); }
  }

  const rows = filteredRecords.map((item) => ({ id: item.id, descricao: item.descricao || "—", categoria: item.categoria || "Sem categoria", data: dateLabel(item.data_lancamento), valor: money(item.valor), status: "Recebida", acoes: <div className="pf-row-actions"><button type="button" onClick={() => openEdit(item)}>Editar</button><button type="button" className="danger" onClick={() => remove(item)}>Excluir</button></div> }));
  const notice = error ? `Não foi possível carregar as receitas: ${error}` : loading ? "Carregando receitas pessoais existentes…" : "Dados reais de despesas, isolados pela empresa ativa e pelo tipo receita.";
  const periodLabel = selectedMonth === "all" ? "Todos os meses" : monthLabel(selectedMonth);
  const periodToolbar = <nav className="pf-income-month-filter" aria-label="Período das receitas">
    <button type="button" aria-label="Mês anterior" disabled={selectedMonth === "all"} onClick={() => setSelectedMonth((month) => shiftMonth(month, -1))}>‹</button>
    <strong aria-live="polite">{periodLabel}</strong>
    <button type="button" aria-label="Próximo mês" disabled={selectedMonth === "all"} onClick={() => setSelectedMonth((month) => shiftMonth(month, 1))}>›</button>
    <button type="button" className={selectedMonth === "all" ? "active" : ""} aria-pressed={selectedMonth === "all"} onClick={() => setSelectedMonth((month) => month === "all" ? currentMonth() : "all")}>Todos os meses</button>
  </nav>;
  return <PersonalModulePreview title="Receitas" description="Consulte e gerencie entradas pessoais existentes em uma visão única." notice={notice} feedback={feedback} toolbar={periodToolbar} actionLabel="Nova Receita" onAction={openNew} metrics={[{ label: "Receitas recebidas", value: money(total), detail: `${filteredRecords.length} lançamento(s) · ${periodLabel}`, icon: "✓", tone: "green" }, { label: "Maior categoria", value: largestCategory, detail: periodLabel, icon: "▧" }, { label: "Média por lançamento", value: money(filteredRecords.length ? total / filteredRecords.length : 0), detail: periodLabel, icon: "◎" }]} columns={[{ key: "descricao", label: "Descrição" }, { key: "categoria", label: "Categoria" }, { key: "data", label: "Data" }, { key: "valor", label: "Valor" }, { key: "status", label: "Status" }, { key: "acoes", label: "Ações" }]} rows={rows} emptyMessage={loading ? "Carregando receitas pessoais" : `Nenhuma receita em ${periodLabel.toLowerCase()}`} emptyDescription={selectedMonth === "all" ? "Cadastre uma receita para iniciar o histórico pessoal." : "Navegue para outro mês ou selecione Todos os meses."} modal={modalOpen ? <PersonalTransactionModal kind="receita" editing={Boolean(editingId)} values={form} onChange={setForm} onClose={() => setModalOpen(false)} onSubmit={save} saving={saving} /> : null} />;
}
