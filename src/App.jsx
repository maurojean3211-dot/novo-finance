import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./index.css";

import Login from "./Login";
import Admin from "./Admin";
import Dashboard from "./Dashboard";
import MasterAdmin from "./MasterAdmin";
import DespesasPessoais from "./DespesasPessoais.jsx";
import Relatorio from "./Relatorio.jsx";
import RelatorioUsuario from "./RelatorioUsuario.jsx";
import Clientes from "./Clientes.jsx";
import Recebimentos from "./Recebimentos.jsx";
import Vendas from "./Vendas.jsx";
import VendasUsuario from "./VendasUsuario.jsx";
import Compras from "./Compras.jsx";
import ComprasUsuario from "./ComprasUsuario.jsx";
import EmprestimosLista from "./Emprestimos.jsx";
import ContasPagar from "./ContasPagar.jsx";
import ContasFixas from "./ContasFixas.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [pagina, setPagina] = useState("dashboard");
  const [empresaId, setEmpresaId] = useState(null);
  const [permissoes, setPermissoes] = useState({});
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuMais, setMenuMais] = useState(false);

  useEffect(() => {
    carregarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      carregarSessao();
    });

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  async function carregarSessao() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSession(null);
      setLoadingSession(false);
      return;
    }

    setSession({ user });

    const { data } = await supabase
      .from("usuarios")
      .select("empresa_id, permissoes, nome")
      .eq("email", user.email)
      .maybeSingle();

    let perms = {};

    try {
      perms =
        typeof data?.permissoes === "string"
          ? JSON.parse(data.permissoes)
          : data?.permissoes || {};
    } catch {
      perms = {};
    }

    setEmpresaId(data?.empresa_id || null);
    setPermissoes(perms);
    setNomeUsuario(data?.nome || user.email);
    setLoadingSession(false);
  }

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loadingSession) {
    return <div style={{ color: "#fff", padding: 20 }}>Carregando...</div>;
  }

  if (!session) return <Login />;

  const emailLogado = session?.user?.email || "";
  const loginMaster = emailLogado === "maurojean3211@gmail.com";

  function MenuButton({ page, icon, label }) {
    if (!permissoes[page] && page !== "dashboard") return null;

    const ativo = pagina === page;

    return (
      <button
        onClick={() => setPagina(page)}
        style={ativo ? botaoAtivo : botaoMenu}
      >
        {icon} {label}
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        minHeight: "100vh",
        background: "#020617",
      }}
    >
      {/* MENU DESKTOP */}
      {!isMobile && (
        <div
          style={{
            width: 240,
            background: "#020617",
            padding: 15,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            color: "#fff",
          }}
        >
          <h2>💰 Cunha Finance</h2>

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

          <MenuButton page="dashboard" icon="📊" label="Dashboard" />
          <MenuButton page="recebimentos" icon="💵" label="Recebimentos" />
          <MenuButton page="clientes" icon="👥" label="Clientes" />
          <MenuButton page="contas_pagar" icon="💸" label="Contas a Pagar" />
          <MenuButton page="contas_fixas" icon="🔁" label="Contas Fixas" />
          <MenuButton page="emprestimos" icon="🏦" label="Empréstimos" />
          <MenuButton page="vendas" icon="📦" label="Vendas" />
          <MenuButton page="compras" icon="🧱" label="Compras" />
          <MenuButton page="relatorio" icon="📄" label="Relatório" />
          <MenuButton page="pessoal" icon="💳" label="Pessoal" />

          {loginMaster && (
            <button
              onClick={() => setPagina("master")}
              style={pagina === "master" ? botaoAtivo : botaoMenu}
            >
              👑 Master Admin
            </button>
          )}

          <button
            onClick={sair}
            style={{
              ...botaoMenu,
              background: "#ef4444",
              marginTop: 10,
            }}
          >
            🚪 Sair
          </button>
        </div>
      )}

      {/* CONTEÚDO */}
      <div
        style={{
          flex: 1,
          padding: 20,
          paddingBottom: isMobile ? 90 : 20,
        }}
      >
        {pagina === "dashboard" && <Dashboard />}
        {pagina === "recebimentos" && <Recebimentos empresaId={empresaId} />}
        {pagina === "clientes" && <Clientes />}
        {pagina === "contas_pagar" && <ContasPagar empresaId={empresaId} />}
        {pagina === "contas_fixas" && <ContasFixas empresaId={empresaId} />}
        {pagina === "emprestimos" && <EmprestimosLista empresaId={empresaId} />}
        {pagina === "vendas" &&
          (loginMaster ? <Vendas /> : <VendasUsuario />)}
        {pagina === "compras" &&
          (loginMaster ? <Compras /> : <ComprasUsuario />)}
        {pagina === "relatorio" &&
          (loginMaster ? (
            <Relatorio empresaId={empresaId} />
          ) : (
            <RelatorioUsuario empresaId={empresaId} />
          ))}
        {pagina === "pessoal" && <DespesasPessoais />}
        {pagina === "master" && loginMaster && <MasterAdmin />}
        {pagina === "admin" && <Admin />}
      </div>

      {/* MENU MOBILE */}
      {isMobile && (
        <>
          {menuMais && (
            <div
              style={{
                position: "fixed",
                bottom: 75,
                left: 10,
                right: 10,
                background: "#111827",
                borderRadius: 12,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                zIndex: 999,
              }}
            >
              <button onClick={() => {setPagina("compras"); setMenuMais(false);}} style={botaoMenu}>🧱 Compras</button>
              <button onClick={() => {setPagina("contas_pagar"); setMenuMais(false);}} style={botaoMenu}>💸 Contas a Pagar</button>
              <button onClick={() => {setPagina("contas_fixas"); setMenuMais(false);}} style={botaoMenu}>🔁 Contas Fixas</button>
              <button onClick={() => {setPagina("emprestimos"); setMenuMais(false);}} style={botaoMenu}>🏦 Empréstimos</button>
              <button onClick={() => {setPagina("relatorio"); setMenuMais(false);}} style={botaoMenu}>📄 Relatório</button>
              <button onClick={() => {setPagina("pessoal"); setMenuMais(false);}} style={botaoMenu}>💳 Pessoal</button>

              {loginMaster && (
                <button onClick={() => {setPagina("master"); setMenuMais(false);}} style={botaoMenu}>
                  👑 Master Admin
                </button>
              )}

              <button
                onClick={sair}
                style={{
                  ...botaoMenu,
                  background: "#ef4444",
                }}
              >
                🚪 Sair
              </button>
            </div>
          )}

          <div style={mobileBar}>
            <button onClick={() => setPagina("dashboard")} style={mobileBtn}>📊</button>
            <button onClick={() => setPagina("recebimentos")} style={mobileBtn}>💵</button>
            <button onClick={() => setPagina("clientes")} style={mobileBtn}>👥</button>
            <button onClick={() => setPagina("vendas")} style={mobileBtn}>📦</button>
            <button onClick={() => setMenuMais(!menuMais)} style={mobileBtn}>☰</button>
          </div>
        </>
      )}
    </div>
  );
}

const botaoMenu = {
  width: "100%",
  padding: 10,
  background: "#111827",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const botaoAtivo = {
  ...botaoMenu,
  background: "#2563eb",
};

const mobileBar = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: 65,
  background: "#111827",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  borderTop: "1px solid #333",
  zIndex: 999,
};

const mobileBtn = {
  background: "transparent",
  border: "none",
  color: "#fff",
  fontSize: 24,
  cursor: "pointer",
};