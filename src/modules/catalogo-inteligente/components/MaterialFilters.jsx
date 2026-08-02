import { MATERIAL_CATEGORIES, MATERIAL_STATUS } from "../types/material";

export default function MaterialFilters({ filters, viewMode, onFiltersChange, onViewModeChange }) {
  return (
    <section className="catalog-filters" aria-label="Filtros do catálogo">
      <label className="catalog-search">
        <span>⌕</span>
        <input value={filters.search} onChange={(event) => onFiltersChange({ search: event.target.value })} placeholder="Pesquisar código, material, liga ou fornecedor" />
      </label>
      <select value={filters.category} onChange={(event) => onFiltersChange({ category: event.target.value })} aria-label="Filtrar por categoria">
        <option>Todas</option>{MATERIAL_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
      </select>
      <select value={filters.status} onChange={(event) => onFiltersChange({ status: event.target.value })} aria-label="Filtrar por status">
        <option>Todos</option>{MATERIAL_STATUS.map((status) => <option key={status}>{status}</option>)}
      </select>
      <select value={filters.sortBy} onChange={(event) => onFiltersChange({ sortBy: event.target.value })} aria-label="Ordenar materiais">
        <option value="codigo">Código</option><option value="descricao">Descrição</option><option value="estoque">Menor estoque</option><option value="preco">Maior preço</option>
      </select>
      <div className="catalog-view-toggle" aria-label="Modo de visualização">
        <button className={viewMode === "table" ? "is-active" : ""} onClick={() => onViewModeChange("table")} aria-label="Visualização em tabela">▦</button>
        <button className={viewMode === "cards" ? "is-active" : ""} onClick={() => onViewModeChange("cards")} aria-label="Visualização em cards">▥</button>
      </div>
    </section>
  );
}
