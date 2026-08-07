import { useMemo } from "react";
import useAgendaActivities from "../hooks/useAgendaActivities";
import AgendaEmptyState from "./AgendaEmptyState";
import "../agenda-comercial.css";

export default function AgendaDashboardPreview({ empresaId, userId, onNavigate }) {
  const agenda = useAgendaActivities({ empresaId, userId });
  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const limit = new Date(); limit.setDate(limit.getDate() + 7);
    const limitIso = limit.toISOString().slice(0, 10);
    return agenda.activities.filter((item) => item.date >= today && item.date <= limitIso).slice(0, 4);
  }, [agenda.activities]);

  return (
    <section className="agenda-dashboard-preview">
      <header><div><span>Organização comercial</span><h2>Agenda Comercial</h2></div><button type="button" onClick={() => onNavigate("agenda_comercial")}>Abrir agenda →</button></header>
      {agenda.error && <p className="agenda-error">{agenda.error}</p>}
      {agenda.loading || upcoming.length === 0 ? <AgendaEmptyState loading={agenda.loading} /> : <div>{upcoming.map((item) => <article key={item.id}><span>{item.icon}</span><div><strong>{item.client}</strong><small>{item.type} · {item.origin}</small></div><time>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}</time></article>)}</div>}
    </section>
  );
}
