export default function AgendaFilters({ filters, origins, statuses, onChange, onClear }) {
  const update = (field, value) => onChange({ ...filters, [field]: value });
  return (
    <section className="agenda-filters" aria-label="Filtros da agenda">
      <input aria-label="Buscar atividade" placeholder="Buscar cliente ou atividade" value={filters.search} onChange={(event) => update("search", event.target.value)} />
      <select aria-label="Filtrar por origem" value={filters.origin} onChange={(event) => update("origin", event.target.value)}><option value="">Todas as origens</option>{origins.map((value) => <option key={value}>{value}</option>)}</select>
      <select aria-label="Filtrar por status" value={filters.status} onChange={(event) => update("status", event.target.value)}><option value="">Todos os status</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select>
      <button type="button" onClick={onClear}>Limpar filtros</button>
    </section>
  );
}
