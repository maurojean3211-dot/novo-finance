import ExecutivePanel from "./ExecutivePanel";

export default function OperationalOverview({ data, onNavigate }) {
  const purchasedWeight = data.compras.reduce((sum, item) => sum + Number(item.kilos || 0), 0);
  const modules = [
    { label: "Compras", value: data.compras.length ? `${data.compras.length} registro(s)` : null, page: "compras" },
    { label: "Catálogo", value: null, page: "catalogo_inteligente" },
    { label: "Estoque", value: null, page: "estoque", disabled: true },
    { label: "Produtos", value: null, page: "produtos" },
    { label: "Movimentações", value: data.lancamentos.length ? `${data.lancamentos.length} registro(s)` : null, page: "financeiro" },
  ];
  return <ExecutivePanel title="Operação" eyebrow="Materiais e movimentação" icon="▧"><div className="operation-highlight"><span>Volume comprado</span><strong>{purchasedWeight ? `${purchasedWeight.toLocaleString("pt-BR")} kg` : "Sem dados disponíveis"}</strong></div><div className="command-module-list">{modules.map((item) => <button type="button" onClick={() => !item.disabled && onNavigate(item.page)} disabled={item.disabled} key={item.label}><span>{item.label}</span><strong>{item.value ?? "Sem dados disponíveis"}</strong><b>→</b></button>)}</div></ExecutivePanel>;
}
