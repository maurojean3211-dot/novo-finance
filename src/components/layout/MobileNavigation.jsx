import { useState } from "react";
import { canAccessPage } from "../../app/auth/accessPolicy";
import { canAccessMenuItem, findMenuGroupByPage, menuGroups } from "../../app/navigation/menuConfig";

const mobileBar = { position: "fixed", bottom: 0, left: 0, right: 0, height: 65, background: "#07111f", display: "flex", justifyContent: "space-around", alignItems: "center", borderTop: "1px solid #7b652d", boxShadow: "0 -12px 30px rgba(0, 0, 0, .32)", zIndex: 999 };
const mobileBtn = { background: "transparent", border: "none", color: "#d9e0e9", fontSize: 24, cursor: "pointer" };

export default function MobileNavigation({ pagina, permissoes, loginMaster, onNavigate, onLogout }) {
  const [menuMais, setMenuMais] = useState(false);
  const activeGroupId = findMenuGroupByPage(pagina)?.id || "visao-geral";
  const [openGroupId, setOpenGroupId] = useState(activeGroupId);

  function navigate(page) {
    onNavigate(page);
    setMenuMais(false);
  }

  return (
    <>
      {menuMais && (
        <nav className="mobile-nav-menu" aria-label="Navegação móvel completa">
          <div className="mobile-nav-menu__header"><span className="mobile-nav-brand" aria-hidden="true"><img src="/cunha-c-premium.png" alt="" /></span><strong>Módulos</strong><button onClick={() => setMenuMais(false)} aria-label="Fechar menu">×</button></div>
          {menuGroups.map((group) => {
            const items = group.items.filter((item) => !item.hidden && canAccessMenuItem(item, permissoes, loginMaster));
            if (items.length === 0) return null;
            const open = openGroupId === group.id;
            return (
              <section className="mobile-nav-group" key={group.id}>
                <button className="mobile-nav-group__toggle" onClick={() => setOpenGroupId(open ? null : group.id)} aria-expanded={open}>
                  <span>{group.icon}</span><strong>{group.label}</strong><b>⌄</b>
                </button>
                {open && <div className="mobile-nav-group__items">{items.map((item) => (
                  <button className={pagina === item.page ? "is-active" : ""} onClick={() => !item.planned && navigate(item.page)} disabled={item.planned} key={item.page}>
                    <span>{item.icon}</span>{item.label}{item.planned && <small>{item.badge || "Em breve"}</small>}
                  </button>
                ))}</div>}
              </section>
            );
          })}
          <button onClick={onLogout} className="mobile-nav-logout">🚪 Sair</button>
        </nav>
      )}

      <div style={mobileBar}>
        <button onClick={() => onNavigate("dashboard")} style={mobileBtn} aria-label="Dashboard">📊</button>
        {canAccessPage("recebimentos", permissoes, loginMaster) && <button onClick={() => onNavigate("recebimentos")} style={mobileBtn} aria-label="Contas a Receber">💵</button>}
        {canAccessPage("clientes", permissoes, loginMaster) && <button onClick={() => onNavigate("clientes")} style={mobileBtn} aria-label="Empresas e Clientes">👥</button>}
        {canAccessPage("vendas", permissoes, loginMaster) && <button onClick={() => onNavigate("vendas")} style={mobileBtn} aria-label="Vendas">📦</button>}
        <button onClick={() => setMenuMais(!menuMais)} style={mobileBtn} aria-label="Abrir módulos">☰</button>
      </div>
    </>
  );
}
