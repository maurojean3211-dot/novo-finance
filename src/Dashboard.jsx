import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  atividadesComerciais,
  estoqueCritico,
  faturamentoMensal,
  financeiroResumo,
  indicadoresExecutivos,
  mensagensIa,
  operacoesDisponiveis,
  orcamentosRecentes,
  rankingVendedores,
} from "./dashboardData";
import MarketIndicators from "./MarketIndicators";
import "./Dashboard.css";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function Icon({ name }) {
  const paths = {
    revenue: "M4 19V9m5 10V5m5 14v-7m5 7V3",
    orders: "M6 3h12l2 4-8 5-8-5 2-4Zm-2 4v10l8 4 8-4V7M12 12v9",
    quotes: "M6 2h9l4 4v16H6V2Zm8 0v5h5M9 12h6M9 16h6",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
    receive: "M3 7h18v12H3V7Zm0 4h18M7 15h3",
    pay: "M12 3v18m5-13c0-2-2-3-5-3S7 6 7 8s2 3 5 3 5 1 5 3-2 4-5 4-5-1-5-3",
    clients: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    margin: "m4 17 5-5 4 4 7-9M15 7h5v5",
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function ExecutiveCard({ item }) {
  return (
    <article className="executive-card">
      <div className={`metric-icon metric-icon--${item.tone}`}><Icon name={item.icon} /></div>
      <div>
        <p className="metric-label">{item.label}</p>
        <strong className="metric-value">{item.value}</strong>
        <span className={`metric-trend metric-trend--${item.trendType}`}>{item.trend}</span>
      </div>
    </article>
  );
}

function SectionHeader({ title, eyebrow, action }) {
  return (
    <div className="section-header">
      <div><span>{eyebrow}</span><h2>{title}</h2></div>
      {action}
    </div>
  );
}

export default function Dashboard({ nomeUsuario = "Mauro" }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const agora = useMemo(() => new Date(), []);
  const hora = agora.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = (nomeUsuario || "Mauro").split(" ")[0].split("@")[0];
  const dataAtual = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(agora);

  function informarEmDesenvolvimento(rotulo) {
    setMensagem(`${rotulo} estará disponível nas próximas etapas da reconstrução.`);
    setModalAberto(false);
  }

  return (
    <main className="dashboard-shell">
      <div className="demo-notice"><span /> Ambiente visual com dados demonstrativos</div>

      <header className="dashboard-header">
        <div>
          <p className="dashboard-date">{dataAtual}</p>
          <h1>{saudacao}, {primeiroNome}</h1>
          <p className="dashboard-company">Cunha Empreendimentos em Alumínio</p>
        </div>
        <div className="header-actions">
          <label className="company-selector">
            <span>Empresa ativa</span>
            <select aria-label="Empresa ativa" defaultValue="cunha">
              <option value="cunha">Cunha Empreendimentos</option>
            </select>
          </label>
          <button className="notification-button" aria-label="Notificações">
            <span className="notification-dot">3</span>⌁
          </button>
          <button className="profile-button" aria-label="Abrir perfil">
            <span className="profile-avatar">{primeiroNome.slice(0, 2).toUpperCase()}</span>
            <span><strong>{primeiroNome}</strong><small>Administrador</small></span>
          </button>
          <button className="new-operation" onClick={() => setModalAberto(true)}>＋ Nova operação</button>
        </div>
      </header>

      {mensagem && <div className="dashboard-feedback" role="status">{mensagem}<button onClick={() => setMensagem("")} aria-label="Fechar mensagem">×</button></div>}

      <section className="metrics-grid" aria-label="Indicadores executivos">
        {indicadoresExecutivos.map((item) => <ExecutiveCard key={item.label} item={item} />)}
      </section>

      <MarketIndicators onAction={informarEmDesenvolvimento} />

      <section className="dashboard-grid dashboard-grid--hero">
        <article className="dashboard-panel chart-panel">
          <SectionHeader title="Faturamento dos últimos 12 meses" eyebrow="Visão comercial" action={<button className="text-action">Ver relatório →</button>} />
          <div className="chart-summary"><strong>R$ 2,48 mi</strong><span>+12,8% comparado ao período anterior</span></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={faturamentoMensal} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f8cff" stopOpacity={0.38}/><stop offset="95%" stopColor="#4f8cff" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid stroke="#202c3f" strokeDasharray="4 5" vertical={false} />
                <XAxis dataKey="mes" stroke="#6f7f96" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="#6f7f96" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(value) => [moeda.format(value), "Faturamento"]} contentStyle={{ background: "#121b29", border: "1px solid #2a3a50", borderRadius: 12 }} />
                <Area type="monotone" dataKey="valor" stroke="#5b91ff" strokeWidth={3} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-panel ranking-panel">
          <SectionHeader title="Ranking de vendedores" eyebrow="Desempenho da equipe" />
          <div className="ranking-list">
            {rankingVendedores.map((vendedor) => (
              <div className="ranking-row" key={vendedor.nome}>
                <span className={`ranking-position ranking-position--${vendedor.posicao}`}>{vendedor.posicao}º</span>
                <div className="ranking-person"><strong>{vendedor.nome}</strong><small>{vendedor.comparacao}</small></div>
                <div className="ranking-result"><strong>{moeda.format(vendedor.faturamento)}</strong><small>{vendedor.meta}% da meta</small></div>
                <div className="ranking-progress"><span style={{ width: `${Math.min(vendedor.meta, 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--middle">
        <article className="dashboard-panel quotes-panel">
          <SectionHeader title="Orçamentos recentes" eyebrow="Pipeline comercial" action={<button className="text-action">Ver todos →</button>} />
          <div className="professional-table-wrap">
            <table className="professional-table">
              <thead><tr><th>Número</th><th>Cliente</th><th>Vendedor</th><th>Valor</th><th>Data</th><th>Validade</th><th>Status</th></tr></thead>
              <tbody>{orcamentosRecentes.map((orcamento) => <tr key={orcamento.numero}><td><strong>{orcamento.numero}</strong></td><td>{orcamento.cliente}</td><td>{orcamento.vendedor}</td><td>{moeda.format(orcamento.valor)}</td><td>{orcamento.data}</td><td>{orcamento.validade}</td><td><span className={`status-pill status-pill--${orcamento.statusId}`}>{orcamento.status}</span></td></tr>)}</tbody>
            </table>
          </div>
        </article>

        <article className="dashboard-panel ai-panel">
          <div className="ai-heading"><span className="ai-orb">✦</span><div><span>IA Comercial</span><h2>Seu resumo inteligente</h2></div></div>
          <div className="ai-messages">{mensagensIa.map((item) => <div key={item.texto}><span className={`ai-severity ai-severity--${item.tipo}`} /> <p>{item.texto}</p></div>)}</div>
          <button className="ai-action" onClick={() => informarEmDesenvolvimento("A análise inteligente")}>✦ Analisar pendências</button>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <article className="dashboard-panel compact-panel">
          <SectionHeader title="Financeiro resumido" eyebrow="Posição de hoje" />
          <div className="finance-list">{financeiroResumo.map((item) => <div key={item.label}><span>{item.label}</span><strong className={item.tone}>{item.valor}</strong><small>{item.detalhe}</small></div>)}</div>
        </article>
        <article className="dashboard-panel compact-panel">
          <SectionHeader title="Estoque crítico" eyebrow="Atenção necessária" />
          <div className="stock-list">{estoqueCritico.map((item) => <div key={item.produto}><div><strong>{item.produto}</strong><small>Saldo {item.saldo} · Mínimo {item.minimo}</small></div><span className={`stock-state stock-state--${item.tipo}`}>{item.situacao}</span></div>)}</div>
        </article>
        <article className="dashboard-panel compact-panel">
          <SectionHeader title="Atividades comerciais" eyebrow="Próximos compromissos" />
          <div className="activity-list">{atividadesComerciais.map((item) => <div key={item.label}><span>{item.icon}</span><div><strong>{item.quantidade}</strong><small>{item.label}</small></div><b>→</b></div>)}</div>
        </article>
      </section>

      {modalAberto && (
        <div className="operation-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setModalAberto(false)}>
          <section className="operation-modal" role="dialog" aria-modal="true" aria-labelledby="operation-title">
            <div className="operation-modal__header"><div><span>Atalho rápido</span><h2 id="operation-title">Nova operação</h2><p>Escolha o fluxo que deseja iniciar.</p></div><button onClick={() => setModalAberto(false)} aria-label="Fechar modal">×</button></div>
            <div className="operation-grid">{operacoesDisponiveis.map((operacao) => <button key={operacao.label} onClick={() => informarEmDesenvolvimento(operacao.label)}><span>{operacao.icon}</span><div><strong>{operacao.label}</strong><small>{operacao.description}</small></div><b>→</b></button>)}</div>
          </section>
        </div>
      )}
    </main>
  );
}
