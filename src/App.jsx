import "./index.css";
import "./App.css";
import { useRef, useState } from "react";

import Admin from "./Admin";
import Dashboard from "./Dashboard";
import PainelExecutivo from "./PainelExecutivo";
import Fornecedores from "./Fornecedores.jsx";
import Login from "./Login";
import MasterAdmin from "./MasterAdmin";
import Produtos from "./Produtos.jsx";
import Relatorio from "./Relatorio.jsx";
import RelatorioUsuario from "./RelatorioUsuario.jsx";
import Vendas from "./Vendas.jsx";
import VendasUsuario from "./VendasUsuario.jsx";
import useAppNavigation from "./app/navigation/useAppNavigation";
import { findMenuItem } from "./app/navigation/menuConfig";
import useAuth from "./app/providers/useAuth";
import Layout from "./components/layout/Layout";
import ModulePlanning from "./components/ModulePlanning";
import BrandTransition from "./components/BrandTransition";
import CatalogoInteligente from "./modules/catalogo-inteligente";
import AgendaComercial from "./modules/agenda-comercial";
import IAComercial from "./modules/ia-comercial";
import CrmComercial from "./modules/crm-comercial";
import OrcamentoInteligente from "./modules/orcamento-inteligente";
import EstoqueInteligente from "./modules/estoque-inteligente";
import ComprasInteligentes from "./modules/compras-inteligentes";
import FinanceiroCorporativo from "./modules/financeiro-corporativo";
import ProspeccaoComercial from "./modules/prospeccao-comercial";
import { ContasFixasPessoaisPage, FinanceiroPessoalDashboard, ReceitasPessoaisPage, RelatoriosPessoaisPage } from "./modules/financeiro-pessoal";

export default function App() {
  const { session, loadingSession, empresaId, permissoes, nomeUsuario, sair } = useAuth();
  const { pagina, navigate } = useAppNavigation();
  const [enteredUserId, setEnteredUserId] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const logoutStartedRef = useRef(false);

  function completeEntry() {
    setEnteredUserId(session?.user?.id || null);
    navigate(window.location.pathname === "/prospeccao" ? "prospeccao" : "dashboard");
  }

  function startLogout() {
    if (isExiting || logoutStartedRef.current) return;
    setIsExiting(true);
  }

  async function completeLogout() {
    if (logoutStartedRef.current) return;

    logoutStartedRef.current = true;

    try {
      await sair();
    } finally {
      logoutStartedRef.current = false;
      setIsExiting(false);
    }
  }

  if (isExiting) {
    return (
      <BrandTransition
        key="brand-exit"
        mode="exiting"
        onComplete={completeLogout}
        onFallback={() => setIsExiting(false)}
      />
    );
  }

  if (loadingSession) {
    return <BrandTransition key="brand-loading" mode="loading" />;
  }

  if (!session) return <Login />;

  if (enteredUserId !== session.user.id) {
    return (
      <BrandTransition
        key={`brand-entry-${session.user.id}`}
        mode="entering"
        onComplete={completeEntry}
        onFallback={completeEntry}
      />
    );
  }

  const emailLogado = session?.user?.email || "";
  const nomeEmpresa = session?.user?.user_metadata?.empresa_nome || "Cunha Finance";
  const loginMaster = emailLogado === "maurojean3211@gmail.com";
  const menuItem = findMenuItem(pagina);
  const paginaRelatorio = ["relatorio", "relatorio_comercial", "relatorio_financeiro", "relatorio_compras", "relatorio_vendas"].includes(pagina);

  return (
    <Layout
      pagina={pagina}
      permissoes={permissoes}
      loginMaster={loginMaster}
      onNavigate={navigate}
      onLogout={startLogout}
    >
      {pagina === "dashboard" && <Dashboard empresaId={empresaId} nomeEmpresa={nomeEmpresa} nomeUsuario={nomeUsuario} onNavigate={navigate} />}
      {pagina === "painel_executivo" && <PainelExecutivo empresaId={empresaId} nomeEmpresa={nomeEmpresa} nomeUsuario={nomeUsuario} onNavigate={navigate} />}
      {pagina === "recebimentos" && <FinanceiroCorporativo empresaId={empresaId} userId={session.user.id} initialTab="receivable" />}
      {["crm", "clientes"].includes(pagina) && <CrmComercial empresaId={empresaId} userId={session.user.id} onNavigate={navigate} />}
      {pagina === "prospeccao" && <ProspeccaoComercial />}
      {pagina === "agenda_comercial" && <AgendaComercial empresaId={empresaId} userId={session.user.id} />}
      {pagina === "ia_comercial" && <IAComercial empresaId={empresaId} userId={session.user.id} nomeEmpresa={nomeEmpresa} onNavigate={navigate} />}
      {pagina === "orcamentos" && <OrcamentoInteligente empresaId={empresaId} userId={session.user.id} onNavigate={navigate} />}
      {pagina === "catalogo_inteligente" && <CatalogoInteligente />}
      {pagina === "estoque" && <EstoqueInteligente empresaId={empresaId} userId={session.user.id} />}
      {pagina === "produtos" && <Produtos />}
      {pagina === "fornecedores" && <Fornecedores />}
      {pagina === "financeiro" && <FinanceiroCorporativo empresaId={empresaId} userId={session.user.id} initialTab="overview" />}
      {pagina === "financeiro_pessoal" && <FinanceiroPessoalDashboard />}
      {pagina === "receitas_pessoais" && <ReceitasPessoaisPage />}
      {pagina === "contas_pagar" && <FinanceiroCorporativo empresaId={empresaId} userId={session.user.id} initialTab="payable" />}
      {pagina === "contas_fixas" && <ContasFixasPessoaisPage empresaId={empresaId} />}
      {pagina === "relatorios_pessoais" && <RelatoriosPessoaisPage />}
      {pagina === "vendas" && (loginMaster ? <Vendas empresaId={empresaId} userId={session.user.id} companyName={nomeEmpresa} issuedBy={nomeUsuario} /> : <VendasUsuario empresaId={empresaId} userId={session.user.id} companyName={nomeEmpresa} issuedBy={nomeUsuario} />)}
      {pagina === "compras" && <ComprasInteligentes empresaId={empresaId} userId={session.user.id} />}
      {paginaRelatorio && (loginMaster ? <Relatorio empresaId={empresaId} /> : <RelatorioUsuario empresaId={empresaId} />)}
      {pagina === "master" && loginMaster && <MasterAdmin />}
      {pagina === "admin" && <Admin />}
      {menuItem?.planned && <ModulePlanning title={menuItem.label} />}
    </Layout>
  );
}
