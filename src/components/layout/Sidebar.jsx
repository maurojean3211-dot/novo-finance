import { useState } from "react";
import { canAccessMenuItem, findMenuGroupByPage, menuGroups } from "../../app/navigation/menuConfig";

function MenuItem({ item, pagina, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(item.page)}
      className={`app-nav-button${pagina === item.page ? " app-nav-button--active" : ""}`}
    >
      <span>{item.icon}</span>{item.label}
      {item.planned && <small>Planejado</small>}
    </button>
  );
}

export default function Sidebar({ pagina, permissoes, loginMaster, onNavigate, onLogout }) {
  const activeGroupId = findMenuGroupByPage(pagina)?.id || "visao-geral";
  const [openGroupId, setOpenGroupId] = useState(activeGroupId);

  return (
    <aside className="app-sidebar">
      <div className="app-brand">
        <div className="app-brand__mark">CF</div>
        <div><strong>Cunha Finance</strong><small>Gestão inteligente</small></div>
      </div>

      <div className="app-company-card">
        <span>Empresa ativa</span>
        <strong>Cunha Empreendimentos</strong>
        <small>Plano completo</small>
      </div>

      <nav className="app-nav-groups" aria-label="Navegação principal">
        {menuGroups.map((group) => {
          const items = group.items.filter((item) => canAccessMenuItem(item, permissoes, loginMaster));
          if (items.length === 0) return null;

          const open = openGroupId === group.id;
          return (
            <section className={`app-nav-group${open ? " app-nav-group--open" : ""}`} key={group.id}>
              <button
                className="app-nav-group__toggle"
                onClick={() => setOpenGroupId(open ? null : group.id)}
                aria-expanded={open}
              >
                <span>{group.icon}</span><strong>{group.label}</strong><b>⌄</b>
              </button>
              {open && <div className="app-nav-group__items">{items.map((item) => <MenuItem key={item.page} item={item} pagina={pagina} onNavigate={onNavigate} />)}</div>}
            </section>
          );
        })}
      </nav>

      <div className="app-ai-usage">
        <div><span>Uso da IA hoje</span><b>Tempo economizado</b></div>
        <strong>2h 48min</strong>
        <dl>
          <div><dt>Processamentos</dt><dd>18</dd></div>
          <div><dt>PDFs analisados</dt><dd>7</dd></div>
          <div><dt>Orçamentos</dt><dd>5</dd></div>
        </dl>
        <small>Dados demonstrativos</small>
      </div>

      <button onClick={onLogout} className="app-logout"><span>↪</span>Sair</button>
    </aside>
  );
}
