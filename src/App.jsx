import { useEffect, useState } from "react";
import { supabase } from "./supabase";

import "./index.css";

import Login from "./Login";
import Admin from "./Admin";
import Dashboard from "./Dashboard";
import MasterAdmin from "./MasterAdmin";
import Financeiro from "./Financeiro.jsx";
import DespesasPessoais from "./DespesasPessoais.jsx";
import Relatorio from "./Relatorio.jsx";
import Clientes from "./Clientes.jsx";
import Recebimentos from "./Recebimentos.jsx";
import Vendas from "./Vendas.jsx";
import Compras from "./Compras.jsx";
import Emprestimos from "./Emprestimos.jsx";
import Atrasos from "./Atrasos.jsx";
import EmprestimosLista from "./EmprestimosLista.jsx";
import ContasPagar from "./ContasPagar.jsx";
import ContasFixas from "./ContasFixas.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] =
    useState(true);

  const [pagina, setPagina] =
    useState("dashboard");

  const [
    subPaginaEmprestimo,
    setSubPaginaEmprestimo,
  ] = useState("cadastro");

  const [role, setRole] =
    useState(null);

  const [empresaId, setEmpresaId] =
    useState(null);

  const [permissoes, setPermissoes] =
    useState({});

  const [nomeUsuario, setNomeUsuario] =
    useState("");

  const [isMobile, setIsMobile] =
    useState(window.innerWidth < 768);

  useEffect(() => {
    carregarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      () => carregarSessao()
    );

    return () =>
      subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    function resize() {
      setIsMobile(
        window.innerWidth < 768
      );
    }

    window.addEventListener(
      "resize",
      resize
    );

    return () =>
      window.removeEventListener(
        "resize",
        resize
      );
  }, []);

  async function carregarSessao() {
    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setSession(null);
        setLoadingSession(false);
        return;
      }

      setSession({ user });

      const { data } =
        await supabase
          .from("usuarios")
          .select(
            "role,empresa_id,permissoes,nome"
          )
          .eq("email", user.email)
          .maybeSingle();

      let perms = {};

      try {
        perms =
          typeof data?.permissoes ===
          "string"
            ? JSON.parse(
                data.permissoes
              )
            : data?.permissoes ||
              {};
      } catch {
        perms = {};
      }

      setRole(data?.role || null);
      setEmpresaId(
        data?.empresa_id || null
      );
      setPermissoes(perms);
      setNomeUsuario(
        data?.nome || user.email
      );
    } catch (e) {
      console.log(e);
    }

    setLoadingSession(false);
  }

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loadingSession) {
    return (
      <div
        style={{
          color: "#fff",
          padding: 20,
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const emailLogado =
    session?.user?.email || "";

  const loginMaster =
    emailLogado ===
    "maurojean3211@gmail.com";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile
          ? "column"
          : "row",
        minHeight: "100vh",
        background: "#020617",
        color: "#fff",
      }}
    >
      {/* MENU */}
      <div
        style={{
          width: isMobile
            ? "100%"
            : 230,
          background: "#020617",
          padding: 15,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <h2>
          Cunha Finance
        </h2>

        <div
          style={{
            background: "#111827",
            padding: 10,
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          👤 {nomeUsuario}
        </div>

        {permissoes.dashboard && (
          <button
            onClick={() =>
              setPagina(
                "dashboard"
              )
            }
            style={
              pagina ===
              "dashboard"
                ? botaoAtivo
                : botaoMenu
            }
          >
            📊 Dashboard
          </button>
        )}

        {permissoes.financeiro && (
          <button
            onClick={() =>
              setPagina(
                "financeiro"
              )
            }
            style={
              pagina ===
              "financeiro"
                ? botaoAtivo
                : botaoMenu
            }
          >
            💰 Financeiro
          </button>
        )}

        {permissoes.recebimentos && (
          <button
            onClick={() =>
              setPagina(
                "recebimentos"
              )
            }
            style={
              pagina ===
              "recebimentos"
                ? botaoAtivo
                : botaoMenu
            }
          >
            💵 Recebimentos
          </button>
        )}

        {permissoes.clientes && (
          <button
            onClick={() =>
              setPagina(
                "clientes"
              )
            }
            style={
              pagina ===
              "clientes"
                ? botaoAtivo
                : botaoMenu
            }
          >
            👥 Clientes
          </button>
        )}

        {permissoes.contas_pagar && (
          <button
            onClick={() =>
              setPagina(
                "contas_pagar"
              )
            }
            style={
              pagina ===
              "contas_pagar"
                ? botaoAtivo
                : botaoMenu
            }
          >
            💸 Contas a Pagar
          </button>
        )}

        {permissoes.contas_fixas && (
          <button
            onClick={() =>
              setPagina(
                "contas_fixas"
              )
            }
            style={
              pagina ===
              "contas_fixas"
                ? botaoAtivo
                : botaoMenu
            }
          >
            🔁 Contas Fixas
          </button>
        )}

        {permissoes.emprestimos && (
          <button
            onClick={() =>
              setPagina(
                "emprestimos"
              )
            }
            style={
              pagina ===
              "emprestimos"
                ? botaoAtivo
                : botaoMenu
            }
          >
            💸 Empréstimos
          </button>
        )}

        {permissoes.vendas && (
          <button
            onClick={() =>
              setPagina(
                "vendas"
              )
            }
            style={
              pagina ===
              "vendas"
                ? botaoAtivo
                : botaoMenu
            }
          >
            📦 Vendas
          </button>
        )}

        {permissoes.compras && (
          <button
            onClick={() =>
              setPagina(
                "compras"
              )
            }
            style={
              pagina ===
              "compras"
                ? botaoAtivo
                : botaoMenu
            }
          >
            🧱 Compras
          </button>
        )}

        {permissoes.relatorio && (
          <button
            onClick={() =>
              setPagina(
                "relatorio"
              )
            }
            style={
              pagina ===
              "relatorio"
                ? botaoAtivo
                : botaoMenu
            }
          >
            📄 Relatório
          </button>
        )}

        {permissoes.pessoal && (
          <button
            onClick={() =>
              setPagina(
                "despesas"
              )
            }
            style={
              pagina ===
              "despesas"
                ? botaoAtivo
                : botaoMenu
            }
          >
            💳 Pessoal
          </button>
        )}

        {loginMaster && (
          <button
            onClick={() =>
              setPagina(
                "master"
              )
            }
            style={
              pagina ===
              "master"
                ? botaoAtivo
                : botaoMenu
            }
          >
            👑 Master Admin
          </button>
        )}

        <button
          onClick={sair}
          style={{
            ...botaoMenu,
            background:
              "#ef4444",
          }}
        >
          🚪 Sair
        </button>
      </div>

      {/* CONTEUDO */}
      <div
        style={{
          flex: 1,
          padding: 20,
        }}
      >
        {pagina ===
          "dashboard" &&
          permissoes.dashboard && (
            <Dashboard />
          )}

        {pagina ===
          "financeiro" &&
          permissoes.financeiro && (
            <Financeiro
              empresaId={
                empresaId
              }
            />
          )}

        {pagina ===
          "recebimentos" &&
          permissoes.recebimentos && (
            <Recebimentos
              empresaId={
                empresaId
              }
            />
          )}

        {pagina ===
          "clientes" &&
          permissoes.clientes && (
            <Clientes />
          )}

        {pagina ===
          "contas_pagar" &&
          permissoes.contas_pagar && (
            <ContasPagar
              empresaId={
                empresaId
              }
            />
          )}

        {pagina ===
          "contas_fixas" &&
          permissoes.contas_fixas && (
            <ContasFixas
              empresaId={
                empresaId
              }
            />
          )}

        {pagina ===
          "emprestimos" &&
          permissoes.emprestimos && (
            <EmprestimosLista
              empresaId={
                empresaId
              }
            />
          )}

        {pagina ===
          "vendas" &&
          permissoes.vendas && (
            <Vendas />
          )}

        {pagina ===
          "compras" &&
          permissoes.compras && (
            <Compras />
          )}

        {pagina ===
          "relatorio" &&
          permissoes.relatorio && (
            <Relatorio />
          )}

        {pagina ===
          "despesas" &&
          permissoes.pessoal && (
            <DespesasPessoais />
          )}

        {pagina ===
          "master" &&
          loginMaster && (
            <MasterAdmin />
          )}

        {pagina ===
          "admin" && (
          <Admin />
        )}
      </div>
    </div>
  );
}

const botaoMenu = {
  width: "100%",
  padding: 10,
  background: "#111827",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const botaoAtivo = {
  width: "100%",
  padding: 10,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};