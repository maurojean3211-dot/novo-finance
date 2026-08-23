import "./index.css";
import "./App.css";
import { useEffect, useRef, useState } from "react";

import Admin from "./Admin";
import Dashboard from "./Dashboard";
import PainelExecutivo from "./PainelExecutivo";
import Fornecedores from "./Fornecedores.jsx";
import Login from "./Login";
import ResetPassword from "./ResetPassword";
import MasterAdmin from "./MasterAdmin";
import Produtos from "./Produtos.jsx";
import Relatorio from "./Relatorio.jsx";
import RelatorioUsuario from "./RelatorioUsuario.jsx";
import Vendas from "./Vendas.jsx";
import VendasUsuario from "./VendasUsuario.jsx";

import useAppNavigation from "./app/navigation/useAppNavigation";
import { findMenuItem } from "./app/navigation/menuConfig";
import {
  canAccessPage,
  isMasterUser,
} from "./app/auth/accessPolicy";

import useAuth from "./app/providers/useAuth";

import Layout from "./components/layout/Layout";
import ModulePlanning from "./components/ModulePlanning";
import BrandTransition from "./components/BrandTransition";

import CatalogoInteligente from "./modules/catalogo-inteligente";
import AgendaComercial from "./modules/agenda-comercial";
import IAComercial from "./modules/ia-comercial";
import CrmComercial from "./modules/crm-comercial";
import ClientesPage from "./modules/crm-comercial/pages/ClientesPage";
import OrcamentoInteligente from "./modules/orcamento-inteligente";
import EstoqueInteligente from "./modules/estoque-inteligente";
import ComprasInteligentes from "./modules/compras-inteligentes";
import FinanceiroCorporativo from "./modules/financeiro-corporativo";
import ProducaoPcp from "./modules/producao-pcp";
import ProspeccaoComercial from "./modules/prospeccao-comercial";
import ConfiguracaoTributariaPage from "./modules/configuracao-tributaria/ConfiguracaoTributariaPage";

import {
  ContasFixasPessoaisIsoladasPage,
  ContasPagarPessoaisPage,
  DespesasPessoaisPage,
  FinanceiroPessoalDashboard,
  ReceitasPessoaisPage,
  RelatoriosPessoaisPage,
} from "./modules/financeiro-pessoal";

const ENTRY_SESSION_KEY = "cunha-finance";

function lastPageKey(userId) {
  return `cunha-finance:last-page:${userId}`;
}

export default function App() {
  const {
    session,
    loadingSession,
    empresaId,
    permissoes,
    nomeUsuario,
    nomeEmpresa,
    role,
    authIssue,
    sair,
  } = useAuth();

  const { pagina, navigate } = useAppNavigation();
  const [commercialNavigation, setCommercialNavigation] = useState(null);

  function navigateCommercial(page, context = null) {
    setCommercialNavigation(context ? { ...context, page } : null);
    navigate(page);
  }

  const [enteredUserId, setEnteredUserId] = useState(() => {
    try {
      return (
        window.sessionStorage.getItem(ENTRY_SESSION_KEY) || null
      );
    } catch {
      return null;
    }
  });

  const [isExiting, setIsExiting] = useState(false);

  const logoutStartedRef = useRef(false);

  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId || !pagina) return;

    try {
      window.localStorage.setItem(
        lastPageKey(userId),
        pagina
      );
    } catch {
      // Se o armazenamento estiver indisponível,
      // a navegação continua funcionando.
    }
  }, [pagina, session?.user?.id]);

  function completeEntry() {
    const userId = session?.user?.id || null;

    if (!userId) return;

    try {
      window.sessionStorage.setItem(
        ENTRY_SESSION_KEY,
        userId
      );
    } catch {
      // Não impede o acesso.
    }

    setEnteredUserId(userId);

    if (
      window.location.pathname ===
      "/prospeccao"
    ) {
      navigate("prospeccao");
      return;
    }

    try {
      const savedPage =
        window.localStorage.getItem(
          lastPageKey(userId)
        );

      if (savedPage) {
        navigate(savedPage);
      }
    } catch {
      // Mantém a página atual.
    }
  }

  function startLogout() {
    if (
      isExiting ||
      logoutStartedRef.current
    ) {
      return;
    }

    setIsExiting(true);
  }

  async function completeLogout() {
    if (logoutStartedRef.current) return;

    logoutStartedRef.current = true;

    try {
      window.sessionStorage.removeItem(
        ENTRY_SESSION_KEY
      );
    } catch {
      // Ignora erro de storage.
    }

    try {
      await sair();
    } finally {
      logoutStartedRef.current = false;
      setEnteredUserId(null);
      setIsExiting(false);
    }
  }

  if (
    window.location.pathname === "/reset"
  ) {
    return <ResetPassword />;
  }

  if (isExiting) {
    return (
      <BrandTransition
        key="brand-exit"
        mode="exiting"
        onComplete={completeLogout}
        onFallback={() =>
          setIsExiting(false)
        }
      />
    );
  }

  if (loadingSession) {
    return (
      <BrandTransition
        key="brand-loading"
        mode="loading"
      />
    );
  }

  if (!session) {
    return <Login />;
  }

  if (authIssue || !empresaId) {
    return (
      <main className="access-state">
        <section>
          <span>ACESSO PROTEGIDO</span>

          <h1>
            Não foi possível abrir sua
            empresa.
          </h1>

          <p>
            {authIssue ||
              "Nenhuma empresa foi vinculada a este usuário."}
          </p>

          <button
            type="button"
            onClick={startLogout}
          >
            Voltar para o login
          </button>
        </section>
      </main>
    );
  }

  if (
    enteredUserId !== session.user.id
  ) {
    return (
      <BrandTransition
        key={`brand-entry-${session.user.id}`}
        mode="entering"
        onComplete={completeEntry}
        onFallback={completeEntry}
      />
    );
  }

  const loginMaster = isMasterUser(    session.user,
    role
  );

  const menuItem = findMenuItem(pagina);

  const acessoPermitido = canAccessPage(
    pagina,
    permissoes,
    loginMaster
  );

  const paginaRelatorio = [
    "relatorio",
    "relatorio_comercial",
    "relatorio_financeiro",
    "relatorio_compras",
    "relatorio_vendas",
  ].includes(pagina);

  return (
    <Layout
      pagina={pagina}
      permissoes={permissoes}
      loginMaster={loginMaster}
      nomeEmpresa={nomeEmpresa}
      onNavigate={navigate}
      onLogout={startLogout}
    >
      {!acessoPermitido && (
        <section
          className="access-denied"
          role="alert"
        >
          <span>ACESSO RESTRITO</span>

          <h2>Módulo não autorizado</h2>

          <p>
            Seu perfil não possui permissão
            para acessar esta área.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("dashboard")
            }
          >
            Voltar ao Dashboard
          </button>
        </section>
      )}

      {acessoPermitido &&
        pagina === "dashboard" && (
          <Dashboard
            empresaId={empresaId}
            nomeEmpresa={nomeEmpresa}
            nomeUsuario={nomeUsuario}
            onNavigate={navigate}
          />
        )}

      {acessoPermitido &&
        pagina === "painel_executivo" && (
          <PainelExecutivo
            empresaId={empresaId}
            nomeEmpresa={nomeEmpresa}
            nomeUsuario={nomeUsuario}
            onNavigate={navigate}
          />
        )}

      {acessoPermitido && (
        <>
          {pagina === "recebimentos" && (
            <FinanceiroCorporativo
              empresaId={empresaId}
              userId={session.user.id}
              companyName={nomeEmpresa}
              initialTab="receivable"
            />
          )}

          {pagina === "crm" && (
            <CrmComercial
              empresaId={empresaId}
              userId={session.user.id}
              navigationContext={commercialNavigation?.page === "crm" ? commercialNavigation : null}
              onNavigationConsumed={() => setCommercialNavigation(null)}
              onNavigate={navigateCommercial}
            />
          )}

          {pagina === "clientes" && (
            <ClientesPage
              empresaId={empresaId}
              navigationContext={commercialNavigation?.page === "clientes" ? commercialNavigation : null}
              onNavigationConsumed={() => setCommercialNavigation(null)}
              onNavigate={navigateCommercial}
            />
          )}

          {pagina === "prospeccao" && (
            <ProspeccaoComercial
              onNavigate={navigateCommercial}
            />
          )}

          {pagina === "agenda_comercial" && (
            <AgendaComercial
              empresaId={empresaId}
              userId={session.user.id}
            />
          )}

          {pagina === "ia_comercial" && (
            <IAComercial
              empresaId={empresaId}
              userId={session.user.id}
              nomeEmpresa={nomeEmpresa}
              onNavigate={navigate}
            />
          )}

          {pagina === "orcamentos" && (
            <OrcamentoInteligente
              empresaId={empresaId}
              userId={session.user.id}
              onNavigate={navigate}
            />
          )}

          {pagina === "catalogo_inteligente" && (
            <CatalogoInteligente />
          )}

          {pagina === "estoque" && (
            <EstoqueInteligente
              empresaId={empresaId}
              userId={session.user.id}
            />
          )}

          {pagina === "producao" && (
            <ProducaoPcp
              empresaId={empresaId}
              userId={session.user.id}
              onNavigate={navigate}
            />
          )}

          {pagina === "produtos" && (
            <Produtos />
          )}

          {pagina === "fornecedores" && (
            <Fornecedores />
          )}

          {pagina === "financeiro" && (
            <FinanceiroCorporativo
              empresaId={empresaId}
              userId={session.user.id}
              companyName={nomeEmpresa}
              initialTab="overview"
            />
          )}

          {pagina === "financeiro_pessoal" && (
            <FinanceiroPessoalDashboard />
          )}

          {pagina === "receitas_pessoais" && (
            <ReceitasPessoaisPage
              empresaId={empresaId}
            />
          )}

          {pagina === "despesas_pessoais" && (
            <DespesasPessoaisPage
              empresaId={empresaId}
            />
          )}

          {pagina === "contas_pagar_pessoais" && (
            <ContasPagarPessoaisPage
              empresaId={empresaId}
              userId={session.user.id}
            />
          )}

          {pagina === "contas_pagar" && (
            <FinanceiroCorporativo
              empresaId={empresaId}
              userId={session.user.id}
              companyName={nomeEmpresa}
              initialTab="payable"
            />
          )}

          {pagina === "contas_fixas_pessoais" && (
            <ContasFixasPessoaisIsoladasPage
              empresaId={empresaId}
            />
          )}

          {pagina === "relatorios_pessoais" && (
            <RelatoriosPessoaisPage
              empresaId={empresaId}
              userId={session.user.id}
            />
          )}

          {pagina === "vendas" &&
            (loginMaster ? (
              <Vendas
                empresaId={empresaId}
                userId={session.user.id}
                companyName={nomeEmpresa}
                issuedBy={nomeUsuario}
              />
            ) : (
              <VendasUsuario
                empresaId={empresaId}
                userId={session.user.id}
                companyName={nomeEmpresa}
                issuedBy={nomeUsuario}
              />
            ))}

          {pagina === "compras" && (
            <ComprasInteligentes
              empresaId={empresaId}
              userId={session.user.id}
              companyName={nomeEmpresa}
              issuedBy={nomeUsuario}
            />
          )}

          {paginaRelatorio &&
            (loginMaster ? (
              <Relatorio
                empresaId={empresaId}
              />
            ) : (
              <RelatorioUsuario
                empresaId={empresaId}
              />
            ))}

          {pagina === "master" &&
            loginMaster && <MasterAdmin />}

          {pagina === "admin" && (
            <Admin />
          )}

          {pagina === "configuracoes" && (
            <ConfiguracaoTributariaPage
              empresaId={empresaId}
              userId={session.user.id}
            />
          )}

          {menuItem?.planned && (
            <ModulePlanning
              title={menuItem.label}
            />
          )}
        </>
      )}
    </Layout>
  );
}
