import ExecutivePanel from "./ExecutivePanel";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function OperationalOverview({ data, onNavigate }) {
  const available = data.sourceAvailable("pedidos_compra");
  const open = data.pedidos_compra.filter((item) => !["Recebido", "Cancelado"].includes(item.status));
  const receivedPending = data.pedidos_compra.filter((item) => ["Comprado", "Recebido parcialmente"].includes(item.status));
  const modules = [
    ["Valor comprado", available ? currency.format(data.pedidos_compra.reduce((sum, item) => sum + Number(item.valor_total || 0), 0)) : "—"],
    ["Pedidos", available ? data.pedidos_compra.length : "—"],
    ["Em aberto", available ? open.length : "—"],
    ["Recebimentos pendentes", available ? receivedPending.length : "—"],
  ];
  return <ExecutivePanel title="Compras" eyebrow="Aquisições consolidadas" icon="▧"><div className="operation-highlight"><span>Pedidos persistentes</span><button type="button" onClick={() => onNavigate("compras")}>Abrir compras →</button></div><div className="command-kpis command-kpis--four">{modules.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>{available && !data.pedidos_compra.length && <p className="command-state">Aguardando movimentação de compras.</p>}</ExecutivePanel>;
}
