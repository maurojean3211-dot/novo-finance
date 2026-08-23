import { useEffect, useMemo, useState } from "react";
import FinancialDocumentPrototype from "../../documentos-financeiros/components/FinancialDocumentPrototype";
import PersonalModulePreview from "../components/PersonalModulePreview";
import PersonalPayableModal from "../components/PersonalPayableModal";
import PersonalInstallmentGroupModal from "../components/PersonalInstallmentGroupModal";
import PersonalPaymentEventModal from "../components/PersonalPaymentEventModal";
import { usePersonalDownPaymentsRead, usePersonalPayablesRead, usePersonalPaymentEventsRead } from "../hooks/usePersonalFinanceRead";
import { createPersonalInstallmentPlan, createPersonalInstallmentPlanWithDownPayment, deletePersonalPayable, loadPersonalInstallmentGroupMetadata, loadPersonalInstallmentGroupMetadataList, registerPersonalPayablePayment, reversePersonalPayablePayment, savePersonalInstallmentGroupMetadata, savePersonalPayable, updatePersonalPayableStatus } from "../services/personalFinance.service";
import { dateLabel, money } from "../utils/personalFinance";

const emptyForm = { modo: "unico", fornecedor: "", descricao: "", valor: "", valorEntrada: "", dataEntrada: "", quantidadeParcelas: "2", valorPrimeiraParcela: "", vencimento: "", status: "Pendente", categoria: "", observacoes: "" };
const newIdempotencyKey = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const emptyGroupMetadata = { nome_amigavel: "", descricao: "", fornecedor: "", categoria: "", observacoes: "", versao: 0 };
const todayValue = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };

export default function ContasPagarPessoaisPage({ empresaId, userId }) {
  const { records, loading, error, reload } = usePersonalPayablesRead(empresaId, userId);
  const paymentEvents = usePersonalPaymentEventsRead(empresaId, userId);
  const downPayments = usePersonalDownPaymentsRead(empresaId, userId);
  const [filters, setFilters] = useState({ search: "", status: "Todos" });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupMetadata, setGroupMetadata] = useState(emptyGroupMetadata);
  const [savedGroupMetadata, setSavedGroupMetadata] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupEditing, setGroupEditing] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupFeedback, setGroupFeedback] = useState(null);
  const [groupHeaders, setGroupHeaders] = useState({});
  const [paymentAction, setPaymentAction] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ paidValue: "", date: todayValue(), notes: "" });
  const [paymentKey, setPaymentKey] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState(null);
  const filtered = useMemo(() => records.filter((item) => `${item.fornecedor || ""} ${item.descricao || ""}`.toLowerCase().includes(filters.search.toLowerCase()) && (filters.status === "Todos" || item.status === filters.status)), [records, filters]);
  const paid = records.filter((item) => item.status === "Pago");
  const pending = records.filter((item) => item.status === "Pendente");
  const cancelled = records.filter((item) => item.status === "Cancelada");
  const total = records.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const pendingTotal = pending.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const nextDue = pending.filter((item) => item.vencimento).sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)))[0];
  const installmentGroups = useMemo(() => {
    const groups = new Map();
    records.filter((item) => item.grupo_parcelamento_id).forEach((item) => {
      const group = groups.get(item.grupo_parcelamento_id) || { id: item.grupo_parcelamento_id, total: Number(item.valor_total_compra || 0), installmentsTotal: 0, paid: 0, pending: 0, cancelled: 0, paidValue: 0, remaining: 0, items: [] };
      group.items.push(item);
      group.installmentsTotal += Number(item.valor || 0);
      if (item.status === "Pago") { group.paid += 1; group.paidValue += Number(item.valor || 0); }
      else if (item.status === "Cancelada") group.cancelled += 1;
      else { group.pending += 1; group.remaining += Number(item.valor || 0); }
      groups.set(item.grupo_parcelamento_id, group);
    });
    return [...groups.values()].map((group) => ({ ...group, metadata: groupHeaders[group.id] || null, downPayment: downPayments.records.find((entry) => entry.grupo_parcelamento_id === group.id) || null, items: group.items.sort((a, b) => Number(a.parcela_numero) - Number(b.parcela_numero)), firstDue: group.items.map((item) => item.vencimento).filter(Boolean).sort()[0], lastDue: group.items.map((item) => item.vencimento).filter(Boolean).sort().at(-1) }));
  }, [records, groupHeaders, downPayments.records]);
  const selectedGroup = installmentGroups.find((group) => group.id === selectedGroupId) || null;
  const reversedEventIds = useMemo(() => new Set(paymentEvents.records.filter((event) => event.tipo === "Estorno" && event.estorno_de_evento_id).map((event) => event.estorno_de_evento_id)), [paymentEvents.records]);
  function activePaymentEvent(item) { return paymentEvents.records.find((event) => event.conta_pagar_pessoal_id === item.id && ["Pagamento", "Antecipacao"].includes(event.tipo) && !reversedEventIds.has(event.id)); }
  useEffect(() => {
    let active = true;
    if (!empresaId || !userId) { setGroupHeaders({}); return () => { active = false; }; }
    void loadPersonalInstallmentGroupMetadataList({ empresaId, userId }).then((items) => {
      if (active) setGroupHeaders(Object.fromEntries(items.map((item) => [item.grupo_parcelamento_id, item])));
    }).catch(() => { if (active) setGroupHeaders({}); });
    return () => { active = false; };
  }, [empresaId, userId]);

  function openNew() { setEditingId(null); setForm({ ...emptyForm }); setIdempotencyKey(newIdempotencyKey()); setFeedback(null); setModalOpen(true); }
  async function confirmDocumentPayable(values) {
    await savePersonalPayable({ empresaId, userId, values });
    await reload();
    setFeedback({ type: "success", message: "Conta cadastrada após revisão e confirmação." });
  }
  function openEdit(item) {
    if (item.grupo_parcelamento_id) { void openGroup(item.grupo_parcelamento_id); return; }
    setEditingId(item.id); setForm({ ...emptyForm, fornecedor: item.fornecedor || "", descricao: item.descricao || "", valor: item.valor || "", vencimento: String(item.vencimento || "").slice(0, 10), status: item.status || "Pendente", categoria: item.categoria || "", observacoes: item.observacoes || "" }); setIdempotencyKey(""); setFeedback(null); setModalOpen(true);
  }
  function fallbackGroupMetadata(group) {
    const first = group?.items[0];
    return { ...emptyGroupMetadata, descricao: first?.descricao || "", fornecedor: first?.fornecedor || "", categoria: first?.categoria || "", observacoes: first?.observacoes || "" };
  }
  async function loadGroup(groupId, { preserveFeedback = false } = {}) {
    const group = installmentGroups.find((item) => item.id === groupId);
    if (!group) return;
    setGroupLoading(true);
    if (!preserveFeedback) setGroupFeedback(null);
    try {
      const metadata = await loadPersonalInstallmentGroupMetadata({ empresaId, userId, groupId });
      const next = metadata ? { nome_amigavel: metadata.nome_amigavel || "", descricao: metadata.descricao || "", fornecedor: metadata.fornecedor || "", categoria: metadata.categoria || "", observacoes: metadata.observacoes || "", versao: Number(metadata.versao) } : fallbackGroupMetadata(group);
      setSavedGroupMetadata(metadata ? next : null); setGroupMetadata(next);
    } catch (loadError) { setGroupFeedback({ type: "error", message: `Não foi possível carregar os metadados do grupo: ${loadError.message}` }); }
    finally { setGroupLoading(false); }
  }
  async function openGroup(groupId) { setSelectedGroupId(groupId); setGroupEditing(false); setSavedGroupMetadata(null); setGroupMetadata(emptyGroupMetadata); await loadGroup(groupId); }
  function cancelGroupEdit() { setGroupEditing(false); setGroupFeedback(null); setGroupMetadata(savedGroupMetadata || fallbackGroupMetadata(selectedGroup)); }
  async function saveGroup() {
    if (!groupMetadata.descricao.trim()) { setGroupFeedback({ type: "error", message: "A descrição da compra é obrigatória." }); return; }
    setGroupSaving(true); setGroupFeedback(null);
    try {
      const saved = await savePersonalInstallmentGroupMetadata({ empresaId, userId, groupId: selectedGroupId, expectedVersion: Number(groupMetadata.versao || 0), values: groupMetadata });
      const next = { nome_amigavel: saved?.nome_amigavel || "", descricao: saved?.descricao || "", fornecedor: saved?.fornecedor || "", categoria: saved?.categoria || "", observacoes: saved?.observacoes || "", versao: Number(saved?.versao || groupMetadata.versao + 1) };
      setSavedGroupMetadata(next); setGroupMetadata(next); setGroupHeaders((current) => ({ ...current, [selectedGroupId]: { ...next, grupo_parcelamento_id: selectedGroupId } })); setGroupEditing(false); setGroupFeedback({ type: "success", message: "Metadados da compra atualizados com segurança." });
    } catch (saveError) {
      const concurrent = /vers[aã]o concorrente divergente/i.test(saveError.message || "");
      if (concurrent) { setGroupFeedback({ type: "error", message: "Este grupo foi alterado em outra sessão. Os dados foram recarregados; revise antes de salvar novamente." }); setGroupEditing(false); await loadGroup(selectedGroupId, { preserveFeedback: true }); }
      else setGroupFeedback({ type: "error", message: `Não foi possível salvar os metadados: ${saveError.message}` });
    } finally { setGroupSaving(false); }
  }
  function confirmStatusChange(item, status) {
    const labels = { Pago: "marcar como paga", Pendente: "reabrir como pendente", Cancelada: "cancelar" };
    return window.confirm(`Confirma ${labels[status]} a conta “${item.descricao || item.fornecedor || "sem descrição"}”?`);
  }
  async function save() {
    if (saving) return;
    if (!form.descricao.trim() || !(Number(form.valor) > 0)) { setFeedback({ type: "error", message: "Informe descrição e valor maior que zero." }); return; }
    const parcelado = !editingId && form.modo === "parcelado";
    const entradaParcelada = !editingId && form.modo === "entrada_parcelada";
    const installmentMode = parcelado || entradaParcelada;
    const installments = Number(form.quantidadeParcelas);
    if (installmentMode && (!Number.isInteger(installments) || installments < 2 || installments > 120 || !form.vencimento)) { setFeedback({ type: "error", message: "Informe de 2 a 120 parcelas e uma data válida para o primeiro vencimento." }); return; }
    if (parcelado && form.valorPrimeiraParcela && (!(Number(form.valorPrimeiraParcela) > 0) || Number(form.valorPrimeiraParcela) >= Number(form.valor))) { setFeedback({ type: "error", message: "A primeira parcela deve ser positiva e menor que o valor total." }); return; }
    if (entradaParcelada && (!(Number(form.valorEntrada) > 0) || Number(form.valorEntrada) >= Number(form.valor) || !form.dataEntrada)) { setFeedback({ type: "error", message: "A entrada deve ser positiva, menor que o total e possuir uma data válida." }); return; }
    const original = records.find((item) => item.id === editingId);
    if (original && original.status !== form.status && !confirmStatusChange(original, form.status)) return;
    setSaving(true);
    try {
      const created = entradaParcelada ? await createPersonalInstallmentPlanWithDownPayment({ empresaId, userId, idempotencyKey, values: form }) : parcelado ? await createPersonalInstallmentPlan({ empresaId, userId, idempotencyKey, values: form }) : null;
      if (!installmentMode) await savePersonalPayable({ empresaId, userId, id: editingId, values: form });
      await Promise.all([reload(), downPayments.reload(), paymentEvents.reload()]); setModalOpen(false); setFeedback({ type: "success", message: installmentMode ? `${created.length} parcelas criadas em uma única transação${entradaParcelada ? ", com entrada registrada" : ""}.` : editingId ? "Conta atualizada com sucesso." : "Conta cadastrada com sucesso." });
    }
    catch (saveError) { if (installmentMode) await Promise.all([reload(), downPayments.reload(), paymentEvents.reload()]); setFeedback({ type: "error", message: `Não foi possível salvar a conta: ${saveError.message}. O estado foi reconciliado; revise antes de tentar novamente.` }); }
    finally { setSaving(false); }
  }
  async function remove(item) {
    if (item.grupo_parcelamento_id) { setFeedback({ type: "error", message: "A exclusão de parcela agrupada está bloqueada para preservar a consistência do lote. Use Cancelar para esta parcela." }); return; }
    if (!window.confirm(`Excluir definitivamente “${item.descricao || item.fornecedor || "esta conta"}”?`)) return;
    setActingId(item.id);
    try { await deletePersonalPayable({ empresaId, userId, id: item.id }); await reload(); setFeedback({ type: "success", message: "Conta excluída com sucesso." }); }
    catch (deleteError) { setFeedback({ type: "error", message: `Não foi possível excluir a conta: ${deleteError.message}` }); }
    finally { setActingId(null); }
  }
  async function changeStatus(item, status) {
    if (!confirmStatusChange(item, status)) return;
    setActingId(item.id);
    try { await updatePersonalPayableStatus({ empresaId, userId, id: item.id, status }); await reload(); setFeedback({ type: "success", message: `Status alterado para ${status}.` }); }
    catch (statusError) { setFeedback({ type: "error", message: `Não foi possível alterar o status: ${statusError.message}` }); }
    finally { setActingId(null); }
  }

  function openPayment(item, mode) {
    const originalEvent = mode === "Estorno" ? activePaymentEvent(item) : null;
    if (mode === "Estorno" && !originalEvent) { setFeedback({ type: "error", message: "Este pagamento é histórico e não possui evento novo que possa ser estornado." }); return; }
    setPaymentAction({ item, mode, originalEvent });
    setPaymentForm({ paidValue: mode === "Antecipacao" ? "" : String(originalEvent?.valor_pago || item.valor || ""), date: todayValue(), notes: "" });
    setPaymentKey(newIdempotencyKey()); setPaymentFeedback(null); setFeedback(null);
  }
  async function submitPayment() {
    if (!paymentAction || paymentSaving) return;
    const { item, mode, originalEvent } = paymentAction;
    const paidValue = mode === "Pagamento" ? Number(item.valor) : Number(paymentForm.paidValue);
    if (!paymentForm.date) { setPaymentFeedback({ type: "error", message: "Informe a data real da operação." }); return; }
    if (mode === "Antecipacao" && (!(paidValue > 0) || paidValue > Number(item.valor))) { setPaymentFeedback({ type: "error", message: "O valor efetivo deve ser maior que zero e não pode superar o nominal." }); return; }
    const message = mode === "Estorno" ? `Confirma o estorno do pagamento de ${money(originalEvent.valor_pago)}? O evento original será preservado.` : mode === "Antecipacao" ? `Confirma a antecipação por ${money(paidValue)}, com economia de ${money(Number(item.valor) - paidValue)}?` : `Confirma o pagamento normal de ${money(item.valor)}?`;
    if (!window.confirm(message)) return;
    setPaymentSaving(true); setPaymentFeedback(null);
    try {
      if (mode === "Estorno") await reversePersonalPayablePayment({ empresaId, userId, eventId: originalEvent.id, reversedAt: paymentForm.date, notes: paymentForm.notes, idempotencyKey: paymentKey });
      else await registerPersonalPayablePayment({ empresaId, userId, payableId: item.id, type: mode, paidValue, paidAt: paymentForm.date, notes: paymentForm.notes, idempotencyKey: paymentKey });
      await Promise.all([reload(), paymentEvents.reload()]); setPaymentAction(null); setFeedback({ type: "success", message: mode === "Estorno" ? "Pagamento estornado e obrigação reaberta com histórico preservado." : "Pagamento registrado pela trilha segura de eventos." });
    } catch (paymentError) { await Promise.all([reload(), paymentEvents.reload()]); setPaymentFeedback({ type: "error", message: `Não foi possível concluir a operação: ${paymentError.message}` }); }
    finally { setPaymentSaving(false); }
  }

  const rows = filtered.map((item) => { const header = item.grupo_parcelamento_id ? groupHeaders[item.grupo_parcelamento_id] : null; const activeEvent = activePaymentEvent(item); return { id: item.id, fornecedor: header?.fornecedor || item.fornecedor || "—", descricao: <div className="pf-payable-description"><span>{header?.nome_amigavel || header?.descricao || item.descricao || "—"}</span>{item.grupo_parcelamento_id && <small>Compra parcelada · {item.parcela_numero}/{item.parcelas_total}</small>}{item.status === "Pago" && !activeEvent && <small className="pf-legacy-payment">Pagamento histórico · sem evento detalhado</small>}</div>, vencimento: dateLabel(item.vencimento), valor: money(item.valor), status: <span className={`pf-status ${item.status === "Pago" ? "paid" : item.status === "Cancelada" ? "late" : "pending"}`}>{item.status}</span>, acoes: <div className="pf-row-actions"><button type="button" disabled={actingId === item.id} onClick={() => openEdit(item)}>{item.grupo_parcelamento_id ? "Gerenciar parcelamento" : "Editar"}</button>{item.status === "Pendente" && <><button type="button" disabled={actingId === item.id} onClick={() => openPayment(item, "Pagamento")}>Pagar valor normal</button><button type="button" disabled={actingId === item.id} onClick={() => openPayment(item, "Antecipacao")}>Antecipar com desconto</button><button type="button" disabled={actingId === item.id} onClick={() => changeStatus(item, "Cancelada")}>Cancelar</button></>}{item.status === "Pago" && activeEvent && <button type="button" disabled={actingId === item.id} onClick={() => openPayment(item, "Estorno")}>Estornar pagamento</button>}{item.status === "Cancelada" && <button type="button" disabled={actingId === item.id} onClick={() => changeStatus(item, "Pendente")}>Reabrir cancelamento</button>}<button type="button" className="danger" disabled={actingId === item.id} onClick={() => remove(item)}>{actingId === item.id ? "Aguarde…" : "Excluir"}</button></div> }; });
  const toolbar = <><div className="pf-document-actions"><FinancialDocumentPrototype context="personal" destination="Conta a Pagar Pessoal" onConfirmPayable={confirmDocumentPayable} /></div><section className="pf-payables-filters"><input aria-label="Pesquisar contas" placeholder="Pesquisar fornecedor ou descrição" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select aria-label="Filtrar por status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option>Todos</option><option>Pendente</option><option>Pago</option><option>Cancelada</option></select><span>{filtered.length} de {records.length} registro(s)</span></section>{installmentGroups.length > 0 && <section className="pf-installment-groups">{installmentGroups.map((group) => <article key={group.id}><span>{group.metadata?.nome_amigavel || group.metadata?.descricao || "Compra parcelada"}</span><strong>{money(group.remaining)} em aberto</strong><small>{group.paid} paga(s) · {group.pending} pendente(s) · {group.cancelled} cancelada(s) · total {money(group.total)}</small><button type="button" onClick={() => void openGroup(group.id)}>Gerenciar parcelamento</button></article>)}</section>}</>;
  const notice = error || paymentEvents.error || downPayments.error ? `Não foi possível carregar os dados pessoais: ${error || paymentEvents.error || downPayments.error}` : loading || paymentEvents.loading || downPayments.loading ? "Carregando contas, entradas e eventos pessoais existentes…" : "Dados reais, entradas e eventos isolados simultaneamente por empresa e proprietário autenticado.";
  return <PersonalModulePreview title="Contas a Pagar" description="Gerencie compromissos pessoais sem vínculo com o Financeiro Corporativo." notice={notice} feedback={feedback} toolbar={toolbar} actionLabel="Nova Conta a Pagar" onAction={openNew} metrics={[{ label: "Total histórico", value: money(total), detail: `${records.length} registro(s)`, icon: "R$" }, { label: "Total pendente", value: money(pendingTotal), detail: `${pending.length} pendente(s)`, icon: "◷", tone: "amber" }, { label: "Contas pagas", value: paid.length, detail: "histórico quitado", icon: "✓", tone: "green" }, { label: "Canceladas", value: cancelled.length, detail: "fora do total pendente", icon: "×", tone: "rose" }, { label: "Próximo vencimento", value: nextDue ? dateLabel(nextDue.vencimento) : "—", detail: nextDue?.fornecedor || "sem pendências", icon: "↗" }]} columns={[{ key: "fornecedor", label: "Fornecedor" }, { key: "descricao", label: "Descrição" }, { key: "vencimento", label: "Vencimento" }, { key: "valor", label: "Valor" }, { key: "status", label: "Status" }, { key: "acoes", label: "Ações" }]} rows={rows} emptyMessage={loading ? "Carregando contas pessoais" : records.length ? "Nenhum resultado para os filtros" : "Nenhuma conta pessoal cadastrada"} emptyDescription={records.length ? "Ajuste a pesquisa ou o filtro de status." : "Use o botão acima para cadastrar a primeira conta pessoal."} modal={modalOpen ? <PersonalPayableModal editing={Boolean(editingId)} values={form} onChange={setForm} onClose={() => setModalOpen(false)} onSubmit={save} saving={saving} /> : paymentAction ? <PersonalPaymentEventModal mode={paymentAction.mode} payable={paymentAction.item} originalEvent={paymentAction.originalEvent} values={paymentForm} feedback={paymentFeedback} onChange={setPaymentForm} onClose={() => !paymentSaving && setPaymentAction(null)} onSubmit={submitPayment} saving={paymentSaving} /> : selectedGroup ? <PersonalInstallmentGroupModal group={selectedGroup} events={paymentEvents.records.filter((event) => selectedGroup.items.some((item) => item.id === event.conta_pagar_pessoal_id) || (selectedGroup.downPayment && event.entrada_id === selectedGroup.downPayment.id))} values={groupMetadata} metadataExists={Boolean(savedGroupMetadata)} loading={groupLoading} editing={groupEditing} saving={groupSaving} feedback={groupFeedback} onChange={setGroupMetadata} onEdit={() => { setGroupEditing(true); setGroupFeedback(null); }} onCancelEdit={cancelGroupEdit} onClose={() => { if (!groupSaving) { setSelectedGroupId(null); setGroupEditing(false); } }} onSave={saveGroup} /> : null} />;
}
