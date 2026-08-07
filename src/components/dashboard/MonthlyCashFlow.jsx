import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ExecutivePanel from "./ExecutivePanel";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MonthlyCashFlow({ data }) {
  return <ExecutivePanel title="Fluxo mensal" eyebrow="Receitas, despesas e resultado" icon="⌁" className="command-panel--cash-flow">
    {data.sourceAvailable("lancamentos") && data.fluxoMensal.length ? <div className="monthly-flow-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.fluxoMensal} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#24354d" vertical={false} /><XAxis dataKey="mes" stroke="#718198" fontSize={9} /><YAxis stroke="#718198" fontSize={9} width={64} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => money(value)} contentStyle={{ background: "#101c2b", border: "1px solid #30445e", borderRadius: 8, fontSize: 10 }} /><Legend wrapperStyle={{ fontSize: 9 }} /><Bar dataKey="receitas" name="Receitas" fill="#45bd88" radius={[3, 3, 0, 0]} /><Bar dataKey="despesas" name="Despesas" fill="#df6f77" radius={[3, 3, 0, 0]} /><Bar dataKey="resultado" name="Resultado" fill="#6d91e8" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="command-empty">{data.sourceAvailable("lancamentos") ? "Selecione um período completo para visualizar o fluxo." : "Fluxo indisponível por falha na consulta."}</p>}
  </ExecutivePanel>;
}
