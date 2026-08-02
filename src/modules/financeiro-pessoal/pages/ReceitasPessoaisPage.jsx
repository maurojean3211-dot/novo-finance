import { useState } from "react";
import { ActionButtons, EmptyState, StatusPanel } from "../../../components/operations/OperationsUI";
import IncomeModal from "../components/IncomeModal";
import PersonalFinanceFilters from "../components/PersonalFinanceFilters";
import PersonalFinanceHeader from "../components/PersonalFinanceHeader";
import PersonalFinanceMetrics from "../components/PersonalFinanceMetrics";
import usePersonalIncomes from "../hooks/usePersonalIncomes";
import { INCOME_STATUSES, INCOME_TYPES } from "../types/personalFinance";
import { dateLabel, money, netIncome } from "../utils/personalFinance";

export default function ReceitasPessoaisPage() {
  const manager = usePersonalIncomes();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(manager.emptyIncome);
  const openNew = () => { setForm(manager.emptyIncome); setModalOpen(true); };
  const edit = (item) => { setForm({ ...item }); setModalOpen(true); };
  const save = () => { if (!form.descricao.trim() || Number(form.valorBruto) <= 0) return alert("Informe descrição e valor bruto."); manager.save(form); setModalOpen(false); };
  const expected = manager.incomes.filter((item) => item.status === "Prevista" || item.status === "Atrasada");
  const received = manager.incomes.filter((item) => item.status === "Recebida");
  const total = (items) => items.reduce((sum, item) => sum + netIncome(item), 0);
  return <main className="ops-page pf-page"><PersonalFinanceHeader title="Receitas" description="Salários, comissões e outras entradas pessoais em uma visão única." actionLabel="Nova Receita" onAction={openNew} />
    <div className="pf-demo-badge">Dados demonstrativos · mantidos somente em memória</div>
    <PersonalFinanceMetrics items={[{ label: "Receitas previstas", value: money(total(expected)), detail: `${expected.length} aguardando`, icon: "◷" }, { label: "Receitas recebidas", value: money(total(received)), detail: `${received.length} confirmada(s)`, icon: "✓", tone: "green" }, { label: "Valor bruto", value: money(manager.incomes.reduce((sum, item) => sum + Number(item.valorBruto || 0), 0)), detail: "antes dos descontos", icon: "R$" }, { label: "Descontos", value: money(manager.incomes.reduce((sum, item) => sum + Number(item.descontos || 0), 0)), detail: "total demonstrativo", icon: "%", tone: "amber" }, { label: "Atrasadas", value: manager.incomes.filter((item) => item.status === "Atrasada").length, detail: "exigem acompanhamento", icon: "!", tone: "rose" }]} />
    <PersonalFinanceFilters><input placeholder="Pesquisar receita ou fonte" value={manager.filters.search} onChange={(e) => manager.setFilters({ ...manager.filters, search: e.target.value })} /><select value={manager.filters.type} onChange={(e) => manager.setFilters({ ...manager.filters, type: e.target.value })}><option>Todos</option>{INCOME_TYPES.map((item) => <option key={item}>{item}</option>)}</select><select value={manager.filters.status} onChange={(e) => manager.setFilters({ ...manager.filters, status: e.target.value })}><option>Todos</option>{INCOME_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></PersonalFinanceFilters>
    <StatusPanel>O fluxo futuro Venda → comissão prevista → receita recebida está apenas preparado visualmente e não altera Vendas.</StatusPanel>
    <section className="ops-panel pf-data-panel"><div className="ops-panel__header"><h2>Receitas pessoais</h2><span>{manager.filtered.length} resultado(s)</span></div>{manager.filtered.length === 0 ? <EmptyState title="Nenhuma receita encontrada" /> : <><div className="ops-table-wrap pf-desktop-list"><table className="ops-table"><thead><tr><th>Receita</th><th>Fonte</th><th>Competência</th><th>Prevista</th><th>Líquido</th><th>Status</th><th>Ações</th></tr></thead><tbody>{manager.filtered.map((item) => <tr key={item.id}><td><strong>{item.descricao}</strong><small>{item.tipo}</small></td><td>{item.fontePagadora}</td><td>{item.competencia}</td><td>{dateLabel(item.dataPrevista)}</td><td>{money(netIncome(item))}</td><td><span className={`pf-status ${item.status === "Recebida" ? "paid" : item.status === "Atrasada" ? "late" : "pending"}`}>{item.status}</span></td><td><ActionButtons onEdit={() => edit(item)} onDelete={() => manager.remove(item.id)} /></td></tr>)}</tbody></table></div><div className="pf-mobile-cards">{manager.filtered.map((item) => <article key={item.id}><header><strong>{item.descricao}</strong><span className={`pf-status ${item.status === "Recebida" ? "paid" : "pending"}`}>{item.status}</span></header><p>{item.tipo} · {item.fontePagadora}</p><div><b>{money(netIncome(item))}</b><small>{dateLabel(item.dataPrevista)}</small></div><footer><button onClick={() => edit(item)}>Editar</button><button className="danger" onClick={() => manager.remove(item.id)}>Excluir</button></footer></article>)}</div></>}</section>
    {modalOpen && <IncomeModal editing={Boolean(form.id)} values={form} onChange={setForm} onClose={() => setModalOpen(false)} onSubmit={save} />}
  </main>;
}
