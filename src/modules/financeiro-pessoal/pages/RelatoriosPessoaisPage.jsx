import PersonalFinanceHeader from "../components/PersonalFinanceHeader";
import PersonalFinanceMetrics from "../components/PersonalFinanceMetrics";
import PersonalReportPanel from "../components/PersonalReportPanel";
import { DEMO_COMMISSIONS, DEMO_MONTHS } from "../services/personalFinance.demo";
import { money } from "../utils/personalFinance";

export default function RelatoriosPessoaisPage() {
  const current = DEMO_MONTHS.at(-1); const previous = DEMO_MONTHS.at(-2); const balance = current.income - current.expense;
  const reports = [
    ["◇", "Resumo financeiro", "Receitas, gastos, saldo e economia.", [money(current.income), money(current.expense), money(balance)]],
    ["⌁", "Fluxo de caixa pessoal", "Entradas, saídas e saldo acumulado.", ["Entradas demonstrativas", "Saídas demonstrativas"]],
    ["↗", "Receitas", "Salário, comissões, pró-labore e extras.", ["Previstas", "Recebidas"]],
    ["▧", "Gastos por categoria", "Valores, percentuais e ranking.", ["Moradia 30%", "Cartão 22%"]],
    ["🔁", "Contas fixas", "Totais mensais, anuais e próximas contas.", [money(4120), money(49440)]],
    ["▦", "Comparativo mensal", "Receitas, gastos, saldo e economia.", [`Atual ${money(balance)}`, `Anterior ${money(previous.income - previous.expense)}`]],
    ["%", "Comissões", "Previstas, recebidas e agrupamentos futuros.", [`${DEMO_COMMISSIONS.length} registros`, money(DEMO_COMMISSIONS.reduce((sum, item) => sum + item.expected, 0))]],
  ];
  return <main className="ops-page pf-page"><PersonalFinanceHeader title="Relatórios Pessoais" description="Central analítica preparada para consolidar a vida financeira pessoal." />
    <div className="pf-demo-badge">Relatórios demonstrativos · sem persistência ou integração empresarial</div>
    <PersonalFinanceMetrics items={[{ label: "Receitas", value: money(current.income), detail: "mês atual", icon: "↗", tone: "green" }, { label: "Gastos", value: money(current.expense), detail: "mês atual", icon: "↘", tone: "amber" }, { label: "Saldo", value: money(balance), detail: "resultado", icon: "R$", tone: "green" }, { label: "Economia", value: `${Math.round(balance / current.income * 100)}%`, detail: "da renda", icon: "%" }, { label: "Variação", value: "+14,2%", detail: "contra mês anterior", icon: "◎" }]} />
    <section className="pf-report-grid">{reports.map(([icon, title, description, metrics]) => <PersonalReportPanel key={title} icon={icon} title={title} description={description} metrics={metrics} />)}</section>
    <section className="ops-panel pf-export"><div><h2>Exportações futuras</h2><p>Os botões são somente visuais nesta etapa.</p></div><div><button onClick={() => alert("Exportação PDF será implementada futuramente.")}>Exportar PDF</button><button onClick={() => alert("Exportação Excel será implementada futuramente.")}>Exportar Excel</button><button onClick={() => alert("Impressão consolidada será implementada futuramente.")}>Imprimir</button></div></section>
  </main>;
}
