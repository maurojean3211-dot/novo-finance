const dateFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

export default function AgendaCard({ activity }) {
  return (
    <article className={`agenda-card agenda-card--${activity.origin.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>
      <span className="agenda-card__icon" aria-hidden="true">{activity.icon}</span>
      <div className="agenda-card__content"><span>{activity.type}</span><h3>{activity.client}</h3><p>{activity.description}</p><footer><time dateTime={activity.date}>{dateFormatter.format(new Date(`${activity.date}T12:00:00`))}</time><b>{activity.status}</b><small>{activity.origin}</small></footer></div>
    </article>
  );
}
