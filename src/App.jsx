import "./index.css";
import "./App.css";

import Admin from "./Admin";
import Compras from "./Compras.jsx";
import ComprasUsuario from "./ComprasUsuario.jsx";
import ContasFixas from "./ContasFixas.jsx";
import ContasPagar from "./ContasPagar.jsx";
import Clientes from "./Clientes.jsx";
import Dashboard from "./Dashboard";
import DespesasPessoais from "./DespesasPessoais.jsx";
import EmprestimosLista from "./Emprestimos.jsx";
import Financeiro from "./Financeiro.jsx";
import Fornecedores from "./Fornecedores.jsx";
import Login from "./Login";
import MasterAdmin from "./MasterAdmin";
import Produtos from "./Produtos.jsx";
import Recebimentos from "./Recebimentos.jsx";
import Relatorio from "./Relatorio.jsx";
import RelatorioUsuario from "./RelatorioUsuario.jsx";
import Vendas from "./Vendas.jsx";
import VendasUsuario from "./VendasUsuario.jsx";
import useAppNavigation from "./app/navigation/useAppNavigation";
import { findMenuItem } from "./app/navigation/menuConfig";
import useAuth from "./app/providers/useAuth";
import Layout from "./components/layout/Layout";
import ModulePlanning from "./components/ModulePlanning";

export default function App() {
  const { session, loadingSession, empresaId, permissoes, nomeUsuario, sair } = useAuth();
  const { pagina, navigate } = useAppNavigation();

  if (loadingSession) {
    return <div style={{ color: "#fff", padding: 20 }}>Carregando...</div>;
  }

  if (!session) return <Login />;

  const emailLogado = session?.user?.email || "";
  const loginMaster = emailLogado === "maurojean3211@gmail.com";
  const menuItem = findMenuItem(pagina);
  const paginaRelatorio = ["relatorio", "relatorio_comercial", "relatorio_financeiro", "relatorio_compras", "relatorio_vendas"].includes(pagina);

  return (
    <Layout
      pagina={pagina}
      permissoes={permissoes}
      loginMaster={loginMaster}
      onNavigate={navigate}
      onLogout={sair}
    >
      {["dashboard", "painel_executivo"].includes(pagina) && <Dashboard nomeUsuario={nomeUsuario} />}
      {pagina === "recebimentos" && <Recebimentos empresaId={empresaId} />}
      {pagina === "clientes" && <Clientes />}
      {pagina === "produtos" && <Produtos />}
      {pagina === "fornecedores" && <Fornecedores />}
      {pagina === "financeiro" && <Financeiro empresaId={empresaId} />}
      {pagina === "contas_pagar" && <ContasPagar empresaId={empresaId} />}
      {pagina === "contas_fixas" && <ContasFixas empresaId={empresaId} />}
      {pagina === "emprestimos" && <EmprestimosLista empresaId={empresaId} />}
      {pagina === "vendas" && (loginMaster ? <Vendas /> : <VendasUsuario />)}
      {pagina === "compras" && (loginMaster ? <Compras /> : <ComprasUsuario />)}
      {paginaRelatorio && (loginMaster ? <Relatorio empresaId={empresaId} /> : <RelatorioUsuario empresaId={empresaId} />)}
      {pagina === "pessoal" && <DespesasPessoais />}
      {pagina === "master" && loginMaster && <MasterAdmin />}
      {pagina === "admin" && <Admin />}
      {menuItem?.planned && <ModulePlanning title={menuItem.label} />}
    </Layout>
  );
}
