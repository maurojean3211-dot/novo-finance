import { useEffect, useState } from "react";
import MobileNavigation from "./MobileNavigation";
import Sidebar from "./Sidebar";

export default function Layout({ children, pagina, permissoes, loginMaster, onNavigate, onLogout }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className={`app-shell${isMobile ? " app-shell--mobile" : ""}`}>
      {!isMobile && <Sidebar key={`desktop-${pagina}`} pagina={pagina} permissoes={permissoes} loginMaster={loginMaster} onNavigate={onNavigate} onLogout={onLogout} />}
      <div className="app-content" style={{ paddingBottom: isMobile ? 90 : 20 }}>{children}</div>
      {isMobile && <MobileNavigation key={`mobile-${pagina}`} pagina={pagina} permissoes={permissoes} loginMaster={loginMaster} onNavigate={onNavigate} onLogout={onLogout} />}
    </div>
  );
}
