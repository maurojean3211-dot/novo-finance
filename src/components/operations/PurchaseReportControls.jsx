export default function PurchaseReportControls({ filters, onChange, onDateChange, onApply, onClear, onGenerate }) {
  function update(field, value) {
    const nextFilters = { ...filters, [field]: value };
    onChange(nextFilters);
    if (field === "startDate" || field === "endDate") onDateChange(nextFilters);
  }

  return (
    <section className="purchase-report-controls" aria-label="Filtros do relatório de compras">
      <div className="purchase-report-controls__fields">
        <label><span>Data inicial</span><input type="date" value={filters.startDate} onChange={(event) => update("startDate", event.target.value)} /></label>
        <label><span>Data final</span><input type="date" value={filters.endDate} onChange={(event) => update("endDate", event.target.value)} /></label>
        <label><span>Fornecedor</span><input placeholder="Todos os fornecedores" value={filters.party} onChange={(event) => update("party", event.target.value)} /></label>
        <label><span>Material</span><input placeholder="Todos os materiais" value={filters.product} onChange={(event) => update("product", event.target.value)} /></label>
        <label><span>Unidade</span><select value={filters.unit} onChange={(event) => update("unit", event.target.value)}><option value="">Todas</option><option value="KG">kg</option><option value="TON">tonelada</option></select></label>
        <label><span>Status</span><input placeholder="Todos os status" value={filters.status} onChange={(event) => update("status", event.target.value)} /></label>
      </div>
      <div className="purchase-report-controls__actions">
        <button type="button" onClick={onApply}>Aplicar filtros</button>
        <button type="button" className="secondary" onClick={onClear}>Limpar filtros</button>
        <button type="button" className="primary" onClick={onGenerate}>Gerar Relatório PDF</button>
      </div>
    </section>
  );
}
