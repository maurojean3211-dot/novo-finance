import { useCallback, useEffect, useState } from "react";
import { ActionButtons, EmptyState, StatusPanel } from "../../../components/operations/OperationsUI";
import { supabase } from "../../../supabase";
import FixedExpenseModal from "../components/FixedExpenseModal";
import PersonalFinanceFilters from "../components/PersonalFinanceFilters";
import PersonalFinanceHeader from "../components/PersonalFinanceHeader";
import PersonalFinanceMetrics from "../components/PersonalFinanceMetrics";
import { EXPENSE_CATEGORIES } from "../types/personalFinance";
import { money } from "../utils/personalFinance";

const emptyForm = { descricao: "", valor: "", dia: "", categoria: "Moradia", periodicidade: "Mensal", statusVisual: "Ativa", inicio: "", termino: "" };

export default function ContasFixasPessoaisPage({ empresaId }) {
  const [dados, setDados] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editandoId, setEditandoId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visualStatus, setVisualStatus] = useState({});
  const [filters, setFilters] = useState({ search: "", status: "Todos", category: "Todas", frequency: "Todas" });

  const carregar = useCallback(async () => {
    if (!empresaId) { setLoading(false); return; }
    const { data, error } = await supabase.from("contas_fixas").select("*").eq("empresa_id", empresaId).order("dia_vencimento", { ascending: true });
    if (error) alert(error.message); else setDados(data || []);
    setLoading(false);
  }, [empresaId]);
  useEffect(() => { const timer = window.setTimeout(() => carregar(), 0); return () => window.clearTimeout(timer); }, [carregar]);

  function openNew() { setEditandoId(null); setForm(emptyForm); setModalOpen(true); }
  function editar(item) { setEditandoId(item.id); setForm({ ...emptyForm, descricao: item.descricao || "", valor: item.valor || "", dia: item.dia_vencimento || "", statusVisual: visualStatus[item.id] || "Ativa" }); setModalOpen(true); }

  async function salvar() {
    if (!form.descricao) return alert("Descrição obrigatória");
    if (!form.valor) return alert("Valor obrigatório");
    if (!form.dia) return alert("Dia obrigatório");
    const valorNumero = Number(form.valor.toString().trim().replace(/\./g, "").replace(",", "."));
    if (Number.isNaN(valorNumero)) return alert("Valor inválido");
    const result = editandoId
      ? await supabase.from("contas_fixas").update({ descricao: form.descricao, valor: valorNumero, dia_vencimento: Number(form.dia) }).eq("id", editandoId)
      : await supabase.from("contas_fixas").insert([{ empresa_id: empresaId, descricao: form.descricao, valor: valorNumero, dia_vencimento: Number(form.dia), frequencia: "Mensal", ativo: true }]);
    if (result.error) return alert(result.error.message);
    if (editandoId) setVisualStatus((current) => ({ ...current, [editandoId]: form.statusVisual }));
    alert(editandoId ? "Conta alterada com sucesso!" : "Conta cadastrada com sucesso!");
    setModalOpen(false); setEditandoId(null); setForm(emptyForm); carregar();
  }

  async function excluir(id) {
    if (!window.confirm("Excluir conta fixa?")) return;
    const { error } = await supabase.from("contas_fixas").delete().eq("id", id);
    if (error) return alert(error.message);
    carregar();
  }

  function imprimirRelatorio() {
    const tela = window.open("", "", "width=900,height=700");
    tela.document.write(`<html><head><title>Relatório Contas Fixas</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #000;padding:8px;text-align:left}</style></head><body><h2>Relatório Contas Fixas</h2><strong>Total Mensal:</strong> ${money(totalMensal)}<table><thead><tr><th>Descrição</th><th>Valor</th><th>Dia</th></tr></thead><tbody>${filtered.map((item) => `<tr><td>${item.descricao}</td><td>${money(item.valor)}</td><td>${item.dia_vencimento}</td></tr>`).join("")}</tbody></table></body></html>`);
    tela.document.close(); tela.print();
  }

  const filtered = dados.filter((item) => String(item.descricao || "").toLowerCase().includes(filters.search.toLowerCase()) && (filters.status === "Todos" || (visualStatus[item.id] || "Ativa") === filters.status));
  const totalMensal = filtered.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const maior = dados.reduce((current, item) => Number(item.valor || 0) > Number(current?.valor || 0) ? item : current, null);
  const day = new Date().getDate();
  const proxima = dados.filter((item) => Number(item.dia_vencimento) >= day).sort((a, b) => a.dia_vencimento - b.dia_vencimento)[0] || dados[0];

  return <main className="ops-page pf-page"><PersonalFinanceHeader title="Contas Fixas" description="Compromissos recorrentes com visão mensal compacta." actionLabel="Nova Conta Fixa" onAction={openNew} />
    <PersonalFinanceMetrics items={[{ label: "Total mensal", value: money(totalMensal), detail: `${filtered.length} conta(s)`, icon: "R$" }, { label: "Total anual", value: money(totalMensal * 12), detail: "estimativa", icon: "↗", tone: "amber" }, { label: "Próxima conta", value: proxima ? `Dia ${proxima.dia_vencimento}` : "—", detail: proxima?.descricao || "sem registro", icon: "◷" }, { label: "Contas ativas", value: dados.filter((item) => (visualStatus[item.id] || "Ativa") === "Ativa").length, detail: "status visual", icon: "✓", tone: "green" }, { label: "Maior conta", value: maior ? money(maior.valor) : "—", detail: maior?.descricao || "sem registro", icon: "!", tone: "rose" }]} />
    <PersonalFinanceFilters><input placeholder="Pesquisar conta fixa" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option>Todos</option><option>Ativa</option><option>Inativa</option></select><select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option>Todas</option>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><select value={filters.frequency} onChange={(e) => setFilters({ ...filters, frequency: e.target.value })}><option>Todas</option><option>Mensal</option><option>Trimestral</option><option>Anual</option></select><button onClick={imprimirRelatorio}>Imprimir relatório atual</button></PersonalFinanceFilters>
    <StatusPanel>Categoria, periodicidade, datas e status são preparações visuais. O relatório de impressão e o payload legado foram preservados.</StatusPanel>
    <section className="ops-panel pf-data-panel"><div className="ops-panel__header"><h2>Contas recorrentes</h2><span>{filtered.length} resultado(s)</span></div>{loading ? <div className="pf-loading">Carregando contas fixas...</div> : filtered.length === 0 ? <EmptyState title="Nenhuma conta fixa encontrada" /> : <><div className="ops-table-wrap pf-desktop-list"><table className="ops-table"><thead><tr><th>Descrição</th><th>Valor mensal</th><th>Vencimento</th><th>Periodicidade</th><th>Status visual</th><th>Ações</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.descricao}</strong></td><td>{money(item.valor)}</td><td>Dia {item.dia_vencimento}</td><td>Mensal</td><td><span className={`pf-status ${(visualStatus[item.id] || "Ativa") === "Ativa" ? "paid" : "pending"}`}>{visualStatus[item.id] || "Ativa"}</span></td><td><div className="pf-row-actions"><ActionButtons onEdit={() => editar(item)} onDelete={() => excluir(item.id)} /><button onClick={() => setVisualStatus((current) => ({ ...current, [item.id]: (current[item.id] || "Ativa") === "Ativa" ? "Inativa" : "Ativa" }))}>{(visualStatus[item.id] || "Ativa") === "Ativa" ? "Desativar" : "Ativar"}</button></div></td></tr>)}</tbody></table></div><div className="pf-mobile-cards">{filtered.map((item) => <article key={item.id}><header><strong>{item.descricao}</strong><span className="pf-status paid">{visualStatus[item.id] || "Ativa"}</span></header><div><b>{money(item.valor)}</b><small>Dia {item.dia_vencimento}</small></div><footer><button onClick={() => editar(item)}>Editar</button><button className="danger" onClick={() => excluir(item.id)}>Excluir</button></footer></article>)}</div></>}</section>
    {modalOpen && <FixedExpenseModal editing={Boolean(editandoId)} values={form} onChange={setForm} onClose={() => setModalOpen(false)} onSubmit={salvar} />}
  </main>;
}
