const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function StockState({ material }) {
  const critical = Number(material.estoqueAtual || 0) < Number(material.estoqueMinimo || 0);
  return <span className={`material-stock${critical ? " material-stock--critical" : ""}`}>{material.estoqueAtual} {material.unidade}</span>;
}

export default function MaterialsView({ materials, mode, onSelect }) {
  if (materials.length === 0) return <div className="catalog-empty"><strong>Nenhum material encontrado</strong><span>Ajuste os filtros para visualizar outros resultados.</span></div>;

  if (mode === "cards") {
    return <div className="material-cards">{materials.map((material) => (
      <button className="material-card" onClick={() => onSelect(material)} key={material.id}>
        <div className="material-card__top"><span>{material.categoria}</span><b className={`material-status material-status--${material.status.toLowerCase().replace(" ", "-")}`}>{material.status}</b></div>
        <small>{material.codigo}</small><strong>{material.descricao}</strong>
        <dl><div><dt>Liga</dt><dd>{material.liga || "—"}</dd></div><div><dt>Estoque</dt><dd><StockState material={material} /></dd></div><div><dt>Preço sugerido</dt><dd>{money.format(material.precoSugerido || 0)}</dd></div></dl>
        <span className="material-card__action">Ver detalhes →</span>
      </button>
    ))}</div>;
  }

  return (
    <div className="catalog-table-wrap">
      <table className="catalog-table">
        <thead><tr><th>Código</th><th>Material</th><th>Categoria</th><th>Liga / Têmpera</th><th>Unidade</th><th>Estoque</th><th>Preço sugerido</th><th>Status</th><th /></tr></thead>
        <tbody>{materials.map((material) => <tr key={material.id}>
          <td><strong>{material.codigo}</strong></td><td><b>{material.descricao}</b><small>{material.fornecedorPrincipal}</small></td><td>{material.categoria}</td><td>{material.liga || "—"} {material.tempera}</td><td>{material.unidade}</td><td><StockState material={material} /></td><td>{money.format(material.precoSugerido || 0)}</td><td><span className={`material-status material-status--${material.status.toLowerCase().replace(" ", "-")}`}>{material.status}</span></td><td><button onClick={() => onSelect(material)} aria-label={`Detalhes de ${material.descricao}`}>→</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
