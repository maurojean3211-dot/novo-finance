import { useState } from "react";
import MobileNavigation from "./MobileNavigation";
import Sidebar from "./Sidebar";
import AccountSecurity from "../account/AccountSecurity";

export default function Layout({ children, pagina, permissoes, loginMaster, platformAdmin, contextoMaster, onMasterContextChange, nomeEmpresa, plano, statusAssinatura, tipoCliente, onNavigate, onLogout }) {
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar pagina={pagina} permissoes={permissoes} loginMaster={loginMaster} platformAdmin={platformAdmin} contextoMaster={contextoMaster} onMasterContextChange={onMasterContextChange} nomeEmpresa={nomeEmpresa} plano={plano} statusAssinatura={statusAssinatura} tipoCliente={tipoCliente} onNavigate={onNavigate} onAccount={() => setAccountOpen(true)} onLogout={onLogout} />
      <main className={`app-content${pagina === "relatorios_pessoais" ? " app-content--page-scroll" : ""}`} id="main-content">
        <div className="app-content__inner">{children}</div>
      </main>
      <MobileNavigation pagina={pagina} permissoes={permissoes} loginMaster={loginMaster} platformAdmin={platformAdmin} contextoMaster={contextoMaster} onMasterContextChange={onMasterContextChange} onNavigate={onNavigate} onAccount={() => setAccountOpen(true)} onLogout={onLogout} />
      {accountOpen && <AccountSecurity onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
