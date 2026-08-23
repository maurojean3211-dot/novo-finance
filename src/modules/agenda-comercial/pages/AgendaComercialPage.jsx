import { useMemo, useState } from "react";
import AgendaFilters from "../components/AgendaFilters";
import AgendaTimeline from "../components/AgendaTimeline";
import useAgendaActivities from "../hooks/useAgendaActivities";
import "../agenda-comercial.css";

const initialFilters = { search: "", origin: "", status: "" };

function periodLimit(mode) {
  const today = new Date();
  if (mode === "today") return [today.toISOString().slice(0, 10), today.toISOString().slice(0, 10)];
  if (mode === "week") { const limit = new Date(today); limit.setDate(limit.getDate() + 7); return [today.toISOString().slice(0, 10), limit.toISOString().slice(0, 10)]; }
  return ["", ""];
}

export default function AgendaComercialPage({ empresaId, userId }) {
  const agenda = useAgendaActivities({ empresaId, userId });
  const [mode, setMode] = useState("today");
  const [filters, setFilters] = useState(initialFilters);
  const origins = useMemo(() => [...new Set(agenda.activities.map((item) => item.origin))].sort(), [agenda.activities]);
  const statuses = useMemo(() => [...new Set(agenda.activities.map((item) => item.status))].sort(), [agenda.activities]);
  const filtered = useMemo(() => {
    const [start, end] = periodLimit(mode);
    const search = filters.search.trim().toLocaleLowerCase("pt-BR");
    return agenda.activities.filter((item) => (!start || item.date >= start) && (!end || item.date <= end) && (!filters.origin || item.origin === filters.origin) && (!filters.status || item.status === filters.status) && (!search || [item.client, item.type, item.description].some((value) => String(value).toLocaleLowerCase("pt-BR").includes(search))));
  }, [agenda.activities, filters, mode]);

  return (
    <main className="agenda-page">
      <header className="agenda-header"><div><span>Central de organização</span><h1>Agenda Comercial Inteligente</h1><p>Retornos e novos relacionamentos consolidados a partir dos dados existentes.</p></div><button type="button" onClick={agenda.refresh} disabled={agenda.loading}>↻ Atualizar</button></header>
      <nav className="agenda-modes" aria-label="Período da agenda">{[["today", "Hoje"], ["week", "Próximos 7 dias"], ["all", "Todos"]].map(([value, label]) => <button type="button" className={mode === value ? "is-active" : ""} onClick={() => setMode(value)} key={value}>{label}</button>)}</nav>
      <AgendaFilters filters={filters} origins={origins} statuses={statuses} onChange={setFilters} onClear={() => setFilters(initialFilters)} />
      {agenda.error && <p className="agenda-error" role="alert">{agenda.error}</p>}
      <div className="agenda-results"><header><h2>Atividades</h2><span>{filtered.length} resultado(s)</span></header><AgendaTimeline activities={filtered} loading={agenda.loading} /></div>
    </main>
  );
}
