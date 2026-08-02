import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionButtons, EmptyState, StatusPanel } from "../../../components/operations/OperationsUI";
import { supabase } from "../../../supabase";
import ExpenseModal from "../components/ExpenseModal";
import PersonalFinanceFilters from "../components/PersonalFinanceFilters";
import PersonalFinanceHeader from "../components/PersonalFinanceHeader";
import PersonalFinanceMetrics from "../components/PersonalFinanceMetrics";
import { EXPENSE_CATEGORIES } from "../types/personalFinance";
import { dateLabel, money } from "../utils/personalFinance";

const emptyForm = { fornecedor: "", descricao: "", valor: "", vencimento: "", status: "Pendente", categoria: "Outros", origem: "Pessoal", pagamento: "Não informada" };

export default function GastosPessoaisPage({ empresaId }) {
  const [dados, setDados] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editandoId, setEditandoId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", status: "Todos", category: "Todas", start: "", end: "", origin: "Todas", payment: "Todas" });

  const carregar = useCallback(async () => {
    if (!empresaId) { setLoading(false); return; }
    const { data, error } = await supabase.from("contas_pagar").select("*").eq("empresa_id", empresaId).order("vencimento", { ascending: true });
    if (error) alert(error.message); else setDados(data || []);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { const timer = window.setTimeout(() => carregar(), 0); return () => window.clearTimeout(timer); }, [carregar]);

  const converterValor = (value) => Number(value.toString().trim().replace(/\./g, "").replace(",", "."));
  const vencida = (item) => item.status !== "Pago" && item.vencimento && new Date(`${item.vencimento}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0));

  function openNew() { setEditandoId(null); setForm(emptyForm); setModalOpen(true); }
  function editar(item) { setEditandoId(item.id); setForm({ ...emptyForm, fornecedor: item.fornecedor || "", descricao: item.descricao || "", valor: String(item.valor || ""), vencimento: item.vencimento || "", status: item.status || "Pendente" }); setModalOpen(true); }

  async function salvar() {
    if (!empresaId) return alert("Empresa não identificada.");
    if (!form.fornecedor) return alert("Fornecedor obrigatório");
    if (!form.valor) return alert("Valor obrigatório");
    const valorNumero = converterValor(form.valor);
    if (Number.isNaN(valorNumero)) return alert("Valor inválido.");
    const payload = { fornecedor: form.fornecedor, descricao: form.descricao, valor: valorNumero, vencimento: form.vencimento || null, status: form.status };
    const result = editandoId
      ? await supabase.from("contas_pagar").update(payload).eq("id", editandoId).eq("empresa_id", empresaId)
      : await supabase.from("contas_pagar").insert([{ empresa_id: empresaId, ...payload }]);
    if (result.error) return alert(result.error.message);
    alert(editandoId ? "Conta alterada com sucesso!" : "Conta salva com sucesso!");
    setModalOpen(false); setEditandoId(null); setForm(emptyForm); carregar();
  }

  async function mudarStatus(id, status) {
    const { error } = await supabase.from("contas_pagar").update({ status }).eq("id", id).eq("empresa_id", empresaId);
    if (error) return alert(error.message);
    carregar();
  }

  async function excluir(id) {
    if (!window.confirm("Excluir conta?")) return;
    const { error } = await supabase.from("contas_pagar").delete().eq("id", id).eq("empresa_id", empresaId);
    if (error) return alert(error.message);
    carregar();
  }

  const filtered = useMemo(() => dados.filter((item) => {
    const term = `${item.fornecedor || ""} ${item.descricao || ""}`.toLowerCase();
    const due = String(item.vencimento || "").slice(0, 10);
    return term.includes(filters.search.toLowerCase()) && (filters.status === "Todos" || item.status === filters.status) && (!filters.start || due >= filters.start) && (!filters.end || due <= filters.end);
  }), [dados, filters]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const inSeven = new Date(today); inSeven.setDate(inSeven.getDate() + 7);
  const total = (items) => items.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const paid = dados.filter((item) => item.status === "Pago");
  const pending = dados.filter((item) => item.status !== "Pago");
  const late = pending.filter(vencida);
  const dueToday = pending.filter((item) => item.vencimento === today.toISOString().slice(0, 10));
  const dueSeven = pending.filter((item) => { const due = item.vencimento ? new Date(`${item.vencimento}T00:00:00`) : null; return due && due > today && due <= inSeven; });

  return <main className="ops-page pf-page"><PersonalFinanceHeader title="Gastos" description="Controle pessoal de compromissos, pagamentos e vencimentos." actionLabel="Novo Gasto" onAction={openNew} />
    <PersonalFinanceMetrics items={[{ label: "Total previsto", value: money(total(dados)), detail: `${dados.length} registro(s)`, icon: "R$" }, { label: "Total pago", value: money(total(paid)), detail: `${paid.length} quitado(s)`, icon: "✓", tone: "green" }, { label: "Total pendente", value: money(total(pending)), detail: `${pending.length} em aberto`, icon: "◷", tone: "amber" }, { label: "Total atrasado", value: money(total(late)), detail: `${late.length} vencido(s)`, icon: "!", tone: "rose" }, { label: "Vence hoje", value: dueToday.length, detail: "compromissos", icon: "◎" }, { label: "Próximos 7 dias", value: dueSeven.length, detail: "vencimentos", icon: "↗" }]} />
    <PersonalFinanceFilters><input placeholder="Pesquisar fornecedor ou descrição" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option>Todas</option>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option>Todos</option><option>Pendente</option><option>Pago</option></select><input type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} /><input type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} /><select value={filters.origin} onChange={(e) => setFilters({ ...filters, origin: e.target.value })}><option>Todas</option><option>Pessoal</option><option>Cartão</option><option>Recorrente</option></select><select value={filters.payment} onChange={(e) => setFilters({ ...filters, payment: e.target.value })}><option>Todas</option><option>PIX</option><option>Cartão</option><option>Débito</option><option>Dinheiro</option></select></PersonalFinanceFilters>
    <StatusPanel>Categoria, origem e forma de pagamento estão preparadas visualmente. A tabela atual não possui esses campos e nenhum payload foi ampliado.</StatusPanel>
    <section className="ops-panel pf-data-panel"><div className="ops-panel__header"><h2>Gastos cadastrados</h2><span>{filtered.length} resultado(s)</span></div>{loading ? <div className="pf-loading">Carregando gastos...</div> : filtered.length === 0 ? <EmptyState title="Nenhum gasto encontrado" /> : <><div className="ops-table-wrap pf-desktop-list"><table className="ops-table"><thead><tr><th>Fornecedor</th><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.fornecedor}</strong></td><td>{item.descricao || "—"}</td><td>{dateLabel(item.vencimento)}</td><td>{money(item.valor)}</td><td><span className={`pf-status ${item.status === "Pago" ? "paid" : vencida(item) ? "late" : "pending"}`}>{item.status}</span></td><td><div className="pf-row-actions"><ActionButtons onEdit={() => editar(item)} onDelete={() => excluir(item.id)} />{item.status === "Pago" ? <button onClick={() => mudarStatus(item.id, "Pendente")}>Reabrir</button> : <button onClick={() => mudarStatus(item.id, "Pago")}>Pagar</button>}</div></td></tr>)}</tbody></table></div><div className="pf-mobile-cards">{filtered.map((item) => <article key={item.id}><header><strong>{item.fornecedor}</strong><span className={`pf-status ${item.status === "Pago" ? "paid" : vencida(item) ? "late" : "pending"}`}>{item.status}</span></header><p>{item.descricao || "Sem descrição"}</p><div><b>{money(item.valor)}</b><small>{dateLabel(item.vencimento)}</small></div><footer><button onClick={() => editar(item)}>Editar</button><button onClick={() => mudarStatus(item.id, item.status === "Pago" ? "Pendente" : "Pago")}>{item.status === "Pago" ? "Reabrir" : "Pagar"}</button><button className="danger" onClick={() => excluir(item.id)}>Excluir</button></footer></article>)}</div></>}</section>
    {modalOpen && <ExpenseModal editing={Boolean(editandoId)} values={form} onChange={setForm} onClose={() => setModalOpen(false)} onSubmit={salvar} />}
  </main>;
}
