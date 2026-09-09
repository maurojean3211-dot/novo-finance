import { useEffect, useState } from "react";
import MobileNavigation from "./MobileNavigation";
import Sidebar from "./Sidebar";
import AccountSecurity from "../account/AccountSecurity";

export default function Layout({ children, pagina, permissoes, loginMaster, platformAdmin, contextoMaster, onMasterContextChange, nomeEmpresa, plano, statusAssinatura, tipoCliente, onNavigate, onLogout }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className={`app-shell${isMobile ? " app-shell--mobile" : ""}`}>
      {!isMobile && <Sidebar pagina={pagina} permissoes={permissoes} loginMaster={loginMaster} platformAdmin={platformAdmin} contextoMaster={contextoMaster} onMasterContextChange={onMasterContextChange} nomeEmpresa={nomeEmpresa} plano={plano} statusAssinatura={statusAssinatura} tipoCliente={tipoCliente} onNavigate={onNavigate} onAccount={() => setAccountOpen(true)} onLogout={onLogout} />}
      <main className={`app-content${pagina === "relatorios_pessoais" ? " app-content--page-scroll" : ""}`} id="main-content">
        <div className="app-content__inner">{children}</div>
      </main>
      {isMobile && <MobileNavigation pagina={pagina} permissoes={permissoes} loginMaster={loginMaster} platformAdmin={platformAdmin} contextoMaster={contextoMaster} onMasterContextChange={onMasterContextChange} onNavigate={onNavigate} onAccount={() => setAccountOpen(true)} onLogout={onLogout} />}
      {accountOpen && <AccountSecurity onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
