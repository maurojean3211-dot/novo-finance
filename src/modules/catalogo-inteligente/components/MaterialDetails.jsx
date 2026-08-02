import { useState } from "react";
import FutureIntelligence from "./FutureIntelligence";

const tabs = ["Geral", "Fornecedores", "Histórico", "Custos", "Observações", "Arquivos", "Integrações Futuras"];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function GeneralTab({ material }) {
  const values = [
    ["Categoria", material.categoria], ["Liga", material.liga], ["Têmpera", material.tempera], ["Formato", material.formato],
    ["Diâmetro", material.diametro], ["Largura", material.largura], ["Altura", material.altura], ["Espessura", material.espessura],
    ["Comprimento", material.comprimento], ["Peso por metro", material.pesoPorMetro], ["Peso por barra", material.pesoPorBarra], ["Peso unitário", material.pesoUnitario],
    ["Unidade", material.unidade], ["Localização", material.localizacao], ["Estoque mínimo", material.estoqueMinimo], ["Estoque atual", material.estoqueAtual],
  ];
  return <div className="material-detail-grid">{values.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value === "" || value == null ? "—" : value}</strong></div>)}</div>;
}

function DetailContent({ tab, material }) {
  if (tab === "Geral") return <GeneralTab material={material} />;
  if (tab === "Fornecedores") return <div className="detail-stack"><article><span>Fornecedor principal</span><strong>{material.fornecedorPrincipal || "Não informado"}</strong></article><article><span>Fornecedores alternativos</span><strong>{material.fornecedoresAlternativos || "Nenhum fornecedor alternativo"}</strong></article></div>;
  if (tab === "Custos") return <div className="material-detail-grid"><div><span>Preço de compra</span><strong>{money.format(material.precoCompra || 0)}</strong></div><div><span>Preço sugerido</span><strong>{money.format(material.precoSugerido || 0)}</strong></div><div><span>Margem padrão</span><strong>{material.margemPadrao || 0}%</strong></div></div>;
  if (tab === "Observações") return <div className="detail-note">{material.observacoes || "Nenhuma observação cadastrada."}</div>;
  if (tab === "Histórico") return <div className="detail-placeholder"><strong>Histórico preparado</strong><span>A trilha de alterações será conectada em uma fase futura.</span></div>;
  if (tab === "Arquivos") return <div className="detail-placeholder"><strong>Nenhum arquivo conectado</strong><span>Uploads e armazenamento não fazem parte desta fase.</span></div>;
  return <FutureIntelligence />;
}

export default function MaterialDetails({ material, onBack }) {
  const [activeTab, setActiveTab] = useState("Geral");
  return (
    <main className="catalog-page">
      <header className="catalog-subheader"><button onClick={onBack}>← Voltar</button><div><p className="catalog-eyebrow">{material.codigo}</p><h1>{material.descricao}</h1><span>{material.categoria} · {material.status}</span></div></header>
      <section className="material-details">
        <nav className="material-tabs" aria-label="Detalhes do material">{tabs.map((tab) => <button className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)} key={tab}>{tab}</button>)}</nav>
        <div className="material-tab-content"><DetailContent tab={activeTab} material={material} /></div>
      </section>
      {activeTab !== "Integrações Futuras" && <FutureIntelligence />}
    </main>
  );
}
