import { useEffect, useState } from "react";
import MobileNavigation from "./MobileNavigation";
import Sidebar from "./Sidebar";

export default function Layout({ children, pagina, permissoes, loginMaster, nomeEmpresa, onNavigate, onLogout }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className={`app-shell${isMobile ? " app-shell--mobile" : ""}`}>
      {!isMobile && <Sidebar pagina={pagina} permissoes={permissoes} loginMaster={loginMaster} nomeEmpresa={nomeEmpresa} onNavigate={onNavigate} onLogout={onLogout} />}
      <main className="app-content" id="main-content">
        <div className="app-content__inner">{children}</div>
      </main>
      {isMobile && <MobileNavigation pagina={pagina} permissoes={permissoes} loginMaster={loginMaster} onNavigate={onNavigate} onLogout={onLogout} />}
    </div>
  );
}
