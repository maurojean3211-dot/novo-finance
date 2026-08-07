function greeting(date) {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function ExecutiveHeader({ nomeEmpresa, nomeUsuario, loading, onRefresh }) {
  const now = new Date();
  const firstName = String(nomeUsuario || "Usuário").split(" ")[0].split("@")[0];
  const date = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <header className="executive-header">
      <div>
        <h1>{greeting(now)}, {firstName}</h1>
        <p className="executive-header__date">Hoje é {date}</p>
        <p className="executive-header__company">{nomeEmpresa || "Empresa não informada"}</p>
      </div>
      <div className="executive-header__user">
        <button className="executive-header__notifications" type="button" disabled aria-label="Notificações em breve">◌</button>
        <span className="executive-header__avatar">{firstName.slice(0, 2).toUpperCase()}</span>
        <div><strong>{nomeUsuario || "Usuário"}</strong><small>{nomeEmpresa || "Empresa não informada"}</small></div>
        <button type="button" onClick={onRefresh} disabled={loading}>{loading ? "Atualizando…" : "↻ Atualizar"}</button>
      </div>
    </header>
  );
}
