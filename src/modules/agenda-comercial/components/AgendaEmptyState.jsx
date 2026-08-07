export default function AgendaEmptyState({ loading = false }) {
  return <div className="agenda-empty"><span aria-hidden="true">{loading ? "◷" : "✓"}</span><strong>{loading ? "Carregando agenda…" : "Nenhuma atividade programada."}</strong></div>;
}
