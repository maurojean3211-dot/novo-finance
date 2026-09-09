import { useState } from "react";
import { canAccessPage } from "../../app/auth/accessPolicy";
import { canAccessMenuItem, findMenuGroupByPage, menuGroups } from "../../app/navigation/menuConfig";
import useAuth from "../../app/providers/useAuth";

export default function MobileNavigation({ pagina, permissoes, loginMaster, platformAdmin, contextoMaster, onMasterContextChange, onNavigate, onAccount, onLogout }) {
  const { empresaId } = useAuth();
  const [menuMais, setMenuMais] = useState(false);
  const activeGroupId = findMenuGroupByPage(pagina)?.id || "visao-geral";
  const [openGroupId, setOpenGroupId] = useState(activeGroupId);

  function navigate(page) {
    onNavigate(page);
    setMenuMais(false);
  }

  function changeMasterContext(context) {
    onMasterContextChange(context);
    setMenuMais(false);
  }

  return (
    <div className="mobile-navigation">
      {menuMais && (
        <nav className="mobile-nav-menu" aria-label="Navegação móvel completa">
          <div className="mobile-nav-menu__header"><span className="mobile-nav-brand" aria-hidden="true"><img src="/cunha-c-premium.png" alt="" /></span><strong>Módulos</strong><button onClick={() => setMenuMais(false)} aria-label="Fechar menu">×</button></div>
          {platformAdmin && <div className="app-context-switch mobile-nav-context-switch" aria-label="Contexto do Master">
            <button className={contextoMaster === "administracao" ? "active" : ""} onClick={() => changeMasterContext("administracao")}>Administração Global</button>
            {empresaId && <button className={contextoMaster === "empresa" ? "active" : ""} onClick={() => changeMasterContext("empresa")}>Minha Empresa</button>}
          </div>}
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
          <button onClick={() => { setMenuMais(false); onAccount(); }} className="mobile-nav-account">👤 Minha Conta</button>
          <button onClick={onLogout} className="mobile-nav-logout">🚪 Sair</button>
        </nav>
      )}

      <div className="mobile-navigation__bar">
        <button onClick={() => onNavigate("dashboard")} aria-label="Dashboard">📊</button>
        {canAccessPage("recebimentos", permissoes, loginMaster) && <button onClick={() => onNavigate("recebimentos")} aria-label="Contas a Receber">💵</button>}
        {canAccessPage("clientes", permissoes, loginMaster) && <button onClick={() => onNavigate("clientes")} aria-label="Empresas e Clientes">👥</button>}
        {canAccessPage("vendas", permissoes, loginMaster) && <button onClick={() => onNavigate("vendas")} aria-label="Vendas">📦</button>}
        <button onClick={() => setMenuMais(!menuMais)} aria-label="Abrir módulos">☰</button>
      </div>
    </div>
  );
}
