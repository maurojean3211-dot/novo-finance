export default function Header({ dataAtual, saudacao, primeiroNome, onNewOperation }) {
  return (
    <header className="dashboard-header">
      <div>
        <p className="dashboard-date">{dataAtual}</p>
        <h1>{saudacao}, {primeiroNome}</h1>
        <p className="dashboard-company">Cunha Empreendimentos em Alumínio</p>
      </div>
      <div className="header-actions">
        <label className="company-selector"><span>Empresa ativa</span><select aria-label="Empresa ativa" defaultValue="cunha"><option value="cunha">Cunha Empreendimentos</option></select></label>
        <button className="notification-button" aria-label="Notificações"><span className="notification-dot">3</span>⌁</button>
        <button className="profile-button" aria-label="Abrir perfil"><span className="profile-avatar">{primeiroNome.slice(0, 2).toUpperCase()}</span><span><strong>{primeiroNome}</strong><small>Administrador</small></span></button>
        <button className="new-operation" onClick={onNewOperation}>＋ Nova operação</button>
      </div>
    </header>
  );
}
