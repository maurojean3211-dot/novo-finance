import { useMemo, useState } from "react";
import "../credito-pessoal.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const INITIAL_CLIENTS = [
  { id: "cli-1", nome: "Mariana Costa", documento: "***.482.***-**", telefone: "(11) 98842-2107", status: "Ativo" },
  { id: "cli-2", nome: "Rafael Mendes", documento: "***.731.***-**", telefone: "(11) 97615-8834", status: "Ativo" },
  { id: "cli-3", nome: "Luciana Alves", documento: "***.095.***-**", telefone: "(19) 99128-4502", status: "Em análise" },
];

const INITIAL_LOANS = [
  { id: "CP-00124", clienteId: "cli-1", cliente: "Mariana Costa", principal: 8000, parcelas: 10, taxa: 2.2, parcela: 900.72, saldo: 6305.04, status: "Em dia" },
  { id: "CP-00125", clienteId: "cli-2", cliente: "Rafael Mendes", principal: 4500, parcelas: 8, taxa: 2.5, parcela: 627.09, saldo: 3762.54, status: "Atenção" },
];

const INITIAL_INSTALLMENTS = [
  { id: "par-1", loanId: "CP-00124", cliente: "Mariana Costa", numero: 4, total: 10, vencimento: "10/09/2026", valor: 900.72, status: "Aberta" },
  { id: "par-2", loanId: "CP-00125", cliente: "Rafael Mendes", numero: 3, total: 8, vencimento: "28/08/2026", valor: 627.09, status: "Vencida" },
  { id: "par-3", loanId: "CP-00124", cliente: "Mariana Costa", numero: 3, total: 10, vencimento: "10/08/2026", valor: 900.72, status: "Paga" },
];

const TABS = [
  ["dashboard", "Dashboard", "▦"],
  ["clientes", "Clientes", "◎"],
  ["novo", "Novo empréstimo", "+"],
  ["parcelas", "Parcelas", "▤"],
  ["cobrancas", "Cobranças", "↗"],
  ["saldo", "Saldo devedor", "$"],
];

function Status({ children }) {
  return <span className={`credit-status credit-status--${String(children).toLowerCase().replace(" ", "-")}`}>{children}</span>;
}

export default function CreditoPessoalPage() {
  const [tab, setTab] = useState("dashboard");
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [loans, setLoans] = useState(INITIAL_LOANS);
  const [installments, setInstallments] = useState(INITIAL_INSTALLMENTS);
  const [notice, setNotice] = useState("");
  const [newClient, setNewClient] = useState({ nome: "", documento: "", telefone: "" });
  const [loanDraft, setLoanDraft] = useState({ clienteId: "cli-1", valor: "6000", parcelas: "12", taxa: "2.1" });

  const totals = useMemo(() => ({
    carteira: loans.reduce((sum, loan) => sum + loan.principal, 0),
    saldo: loans.reduce((sum, loan) => sum + loan.saldo, 0),
    aberto: installments.filter((item) => item.status === "Aberta").reduce((sum, item) => sum + item.valor, 0),
    vencido: installments.filter((item) => item.status === "Vencida").reduce((sum, item) => sum + item.valor, 0),
  }), [installments, loans]);

  function addClient(event) {
    event.preventDefault();
    if (!newClient.nome.trim()) return;
    setClients((current) => [...current, { id: `cli-${Date.now()}`, ...newClient, status: "Ativo" }]);
    setNewClient({ nome: "", documento: "", telefone: "" });
    setNotice("Cliente incluído nesta demonstração.");
  }

  function createLoan(event) {
    event.preventDefault();
    const client = clients.find((item) => item.id === loanDraft.clienteId);
    const principal = Number(loanDraft.valor);
    const count = Number(loanDraft.parcelas);
    const rate = Number(loanDraft.taxa) / 100;
    if (!client || principal <= 0 || count <= 0 || rate < 0) return;
    const payment = rate === 0 ? principal / count : principal * (rate * ((1 + rate) ** count)) / (((1 + rate) ** count) - 1);
    const id = `CP-${String(126 + loans.length).padStart(5, "0")}`;
    setLoans((current) => [...current, { id, clienteId: client.id, cliente: client.nome, principal, parcelas: count, taxa: Number(loanDraft.taxa), parcela: payment, saldo: payment * count, status: "Em dia" }]);
    setInstallments((current) => [...current, { id: `par-${Date.now()}`, loanId: id, cliente: client.nome, numero: 1, total: count, vencimento: "05/10/2026", valor: payment, status: "Aberta" }]);
    setNotice(`${id} simulado com sucesso. Nenhum dado foi gravado.`);
    setTab("parcelas");
  }

  function receive(installment) {
    setInstallments((current) => current.map((item) => item.id === installment.id ? { ...item, status: "Paga" } : item));
    setLoans((current) => current.map((loan) => loan.id === installment.loanId ? { ...loan, saldo: Math.max(0, loan.saldo - installment.valor), status: "Em dia" } : loan));
    setNotice(`Recebimento demonstrativo de ${money.format(installment.valor)} registrado.`);
  }

  return <section className="credit-page">
    <header className="credit-hero">
      <div><span>CRÉDITO PESSOAL · PILOTO</span><h1>Carteira de empréstimos</h1><p>Uma visão simples da operação, da concessão ao recebimento.</p></div>
      <button type="button" onClick={() => setTab("novo")}>+ Novo empréstimo</button>
    </header>

    <nav className="credit-tabs" aria-label="Áreas de Crédito Pessoal">
      {TABS.map(([id, label, icon]) => <button type="button" className={tab === id ? "active" : ""} onClick={() => { setTab(id); setNotice(""); }} key={id}><span>{icon}</span>{label}</button>)}
    </nav>

    <div className="credit-demo-note"><b>DEMO</b> Dados ilustrativos armazenados somente nesta tela.</div>
    {notice && <p className="credit-notice" role="status">{notice}</p>}

    {tab === "dashboard" && <>
      <div className="credit-metrics">
        <article><span>Carteira concedida</span><strong>{money.format(totals.carteira)}</strong><small>{loans.length} contratos</small></article>
        <article><span>Saldo devedor</span><strong>{money.format(totals.saldo)}</strong><small>posição atual</small></article>
        <article><span>A receber</span><strong>{money.format(totals.aberto)}</strong><small>parcelas abertas</small></article>
        <article className="danger"><span>Em atraso</span><strong>{money.format(totals.vencido)}</strong><small>requer cobrança</small></article>
      </div>
      <div className="credit-dashboard-grid">
        <section className="credit-panel"><header><div><span>CARTEIRA ATIVA</span><h2>Contratos recentes</h2></div><button onClick={() => setTab("saldo")}>Ver saldos →</button></header><div className="credit-loan-list">{loans.map((loan) => <article key={loan.id}><div><small>{loan.id}</small><strong>{loan.cliente}</strong></div><div><small>Saldo</small><b>{money.format(loan.saldo)}</b></div><Status>{loan.status}</Status></article>)}</div></section>
        <section className="credit-panel credit-attention"><header><div><span>PRÓXIMAS AÇÕES</span><h2>Cobranças prioritárias</h2></div></header>{installments.filter((item) => item.status !== "Paga").map((item) => <button key={item.id} onClick={() => setTab("cobrancas")}><span>{item.status === "Vencida" ? "!" : "◷"}</span><div><strong>{item.cliente}</strong><small>{item.loanId} · vence {item.vencimento}</small></div><b>{money.format(item.valor)}</b></button>)}</section>
      </div>
    </>}

    {tab === "clientes" && <div className="credit-split">
      <section className="credit-panel"><header><div><span>BASE DE CLIENTES</span><h2>{clients.length} clientes</h2></div></header><div className="credit-client-grid">{clients.map((client) => <article key={client.id}><div className="credit-avatar">{client.nome.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div><strong>{client.nome}</strong><small>{client.documento || "Documento não informado"}</small><span>{client.telefone || "Telefone não informado"}</span></div><Status>{client.status}</Status></article>)}</div></section>
      <form className="credit-panel credit-form" onSubmit={addClient}><header><div><span>CADASTRO RÁPIDO</span><h2>Novo cliente</h2></div></header><label>Nome completo<input value={newClient.nome} onChange={(event) => setNewClient({ ...newClient, nome: event.target.value })} required /></label><label>CPF<input value={newClient.documento} onChange={(event) => setNewClient({ ...newClient, documento: event.target.value })} placeholder="000.000.000-00" /></label><label>Telefone<input value={newClient.telefone} onChange={(event) => setNewClient({ ...newClient, telefone: event.target.value })} placeholder="(00) 00000-0000" /></label><button type="submit">Adicionar cliente</button></form>
    </div>}

    {tab === "novo" && <form className="credit-panel credit-loan-form" onSubmit={createLoan}>
      <header><div><span>SIMULAÇÃO PRICE</span><h2>Novo empréstimo</h2><p>Preencha as condições para gerar uma demonstração do contrato.</p></div></header>
      <div className="credit-form-grid"><label>Cliente<select value={loanDraft.clienteId} onChange={(event) => setLoanDraft({ ...loanDraft, clienteId: event.target.value })}>{clients.map((client) => <option value={client.id} key={client.id}>{client.nome}</option>)}</select></label><label>Valor solicitado<input type="number" min="100" step="100" value={loanDraft.valor} onChange={(event) => setLoanDraft({ ...loanDraft, valor: event.target.value })} /></label><label>Número de parcelas<input type="number" min="1" max="48" value={loanDraft.parcelas} onChange={(event) => setLoanDraft({ ...loanDraft, parcelas: event.target.value })} /></label><label>Taxa mensal (%)<input type="number" min="0" step="0.1" value={loanDraft.taxa} onChange={(event) => setLoanDraft({ ...loanDraft, taxa: event.target.value })} /></label></div>
      <div className="credit-simulation"><span>Parcela estimada</span><strong>{money.format((() => { const p = Number(loanDraft.valor); const n = Number(loanDraft.parcelas); const r = Number(loanDraft.taxa) / 100; return p > 0 && n > 0 ? (r === 0 ? p / n : p * (r * ((1 + r) ** n)) / (((1 + r) ** n) - 1)) : 0; })())}</strong><small>Simulação ilustrativa, sujeita à análise.</small></div>
      <footer><button type="button" className="secondary" onClick={() => setTab("dashboard")}>Cancelar</button><button type="submit">Gerar empréstimo demonstrativo</button></footer>
    </form>}

    {(tab === "parcelas" || tab === "cobrancas") && <section className="credit-panel"><header><div><span>{tab === "parcelas" ? "CRONOGRAMA" : "RECEBIMENTOS"}</span><h2>{tab === "parcelas" ? "Parcelas da carteira" : "Cobranças em aberto"}</h2></div></header><div className="credit-table-wrap"><table><thead><tr><th>Contrato</th><th>Cliente</th><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th>{tab === "cobrancas" && <th>Ação</th>}</tr></thead><tbody>{installments.filter((item) => tab === "parcelas" || item.status !== "Paga").map((item) => <tr key={item.id}><td>{item.loanId}</td><td><strong>{item.cliente}</strong></td><td>{item.numero}/{item.total}</td><td>{item.vencimento}</td><td>{money.format(item.valor)}</td><td><Status>{item.status}</Status></td>{tab === "cobrancas" && <td><button onClick={() => receive(item)}>Registrar recebimento</button></td>}</tr>)}</tbody></table></div></section>}

    {tab === "saldo" && <section className="credit-panel"><header><div><span>POSIÇÃO DA CARTEIRA</span><h2>Saldo devedor por contrato</h2></div><strong className="credit-total">{money.format(totals.saldo)}</strong></header><div className="credit-balance-list">{loans.map((loan) => { const paid = Math.max(0, loan.principal - loan.saldo); const progress = Math.min(100, Math.round((paid / loan.principal) * 100)); return <article key={loan.id}><div><small>{loan.id}</small><strong>{loan.cliente}</strong><span>Principal {money.format(loan.principal)} · {loan.parcelas}x de {money.format(loan.parcela)}</span></div><div className="credit-balance"><small>Saldo devedor</small><b>{money.format(loan.saldo)}</b><div><span style={{ width: `${progress}%` }} /></div></div></article>; })}</div></section>}
  </section>;
}
