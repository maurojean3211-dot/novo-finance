import { useState } from "react";
import { canAccessMenuItem, findMenuGroupByPage, menuGroups } from "../../app/navigation/menuConfig";

const mobileBar = { position: "fixed", bottom: 0, left: 0, right: 0, height: 65, background: "#111827", display: "flex", justifyContent: "space-around", alignItems: "center", borderTop: "1px solid #333", zIndex: 999 };
const mobileBtn = { background: "transparent", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" };

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
          <div className="mobile-nav-menu__header"><strong>Módulos</strong><button onClick={() => setMenuMais(false)} aria-label="Fechar menu">×</button></div>
          {menuGroups.map((group) => {
            const items = group.items.filter((item) => canAccessMenuItem(item, permissoes, loginMaster));
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
        <button onClick={() => onNavigate("recebimentos")} style={mobileBtn} aria-label="Contas a Receber">💵</button>
        <button onClick={() => onNavigate("clientes")} style={mobileBtn} aria-label="Empresas e Clientes">👥</button>
        <button onClick={() => onNavigate("vendas")} style={mobileBtn} aria-label="Vendas">📦</button>
        <button onClick={() => setMenuMais(!menuMais)} style={mobileBtn} aria-label="Abrir módulos">☰</button>
      </div>
    </>
  );
}
