export default function CatalogHeader({ total, onCreate }) {
  return (
    <header className="catalog-header">
      <div>
        <p className="catalog-eyebrow">Materiais e Operações</p>
        <h1>Catálogo Inteligente</h1>
        <p>Base técnica preparada para produtos, estoque, compras, vendas e orçamentos.</p>
      </div>
      <div className="catalog-header__actions">
        <span><strong>{total}</strong> materiais cadastrados</span>
        <button onClick={onCreate}>＋ Cadastrar material</button>
      </div>
    </header>
  );
}
