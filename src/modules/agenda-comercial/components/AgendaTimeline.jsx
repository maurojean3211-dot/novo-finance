import AgendaCard from "./AgendaCard";
import AgendaEmptyState from "./AgendaEmptyState";

export default function AgendaTimeline({ activities, loading }) {
  if (loading || activities.length === 0) return <AgendaEmptyState loading={loading} />;
  return <section className="agenda-timeline">{activities.map((activity) => <AgendaCard activity={activity} key={activity.id} />)}</section>;
}
