import { FilterBar } from "../../../components/operations/OperationsUI";
import { FUNNEL_STAGES, PRIORITIES } from "../types/crm";

export default function CrmFilters({ filters, onChange, onClear, opportunities }) {
  const unique = (key) => [...new Set(opportunities.map((item) => item[key]).filter(Boolean))];
  return <FilterBar>
    <input placeholder="Pesquisar empresa, contato ou interesse" value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} />
    <select value={filters.vendedor} onChange={(event) => onChange({ ...filters, vendedor: event.target.value })}><option value="">Todos os vendedores</option>{unique("vendedorResponsavel").map((value) => <option key={value}>{value}</option>)}</select>
    <select value={filters.etapa} onChange={(event) => onChange({ ...filters, etapa: event.target.value })}><option value="">Todas as etapas</option>{FUNNEL_STAGES.map((value) => <option key={value}>{value}</option>)}</select>
    <select value={filters.prioridade} onChange={(event) => onChange({ ...filters, prioridade: event.target.value })}><option value="">Todas as prioridades</option>{PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select>
    <select value={filters.segmento} onChange={(event) => onChange({ ...filters, segmento: event.target.value })}><option value="">Todos os segmentos</option>{unique("segmento").map((value) => <option key={value}>{value}</option>)}</select>
    <input type="date" aria-label="Período inicial" value={filters.inicio} onChange={(event) => onChange({ ...filters, inicio: event.target.value })} />
    <input type="date" aria-label="Período final" value={filters.fim} onChange={(event) => onChange({ ...filters, fim: event.target.value })} />
    <button className="crm-filter-clear" onClick={onClear}>Limpar</button>
  </FilterBar>;
}
