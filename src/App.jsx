// SUBSTITUA TODO O BLOCO DO MENU LATERAL POR ESSE CÓDIGO

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
          width: 230,
          background: "#020617",
          padding: 15,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          color: "#fff",
        }}
      >
        <h2>Cunha Finance</h2>

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
          <button onClick={() => setPagina("dashboard")} style={pagina === "dashboard" ? botaoAtivo : botaoMenu}>📊 Dashboard</button>
        )}

        {permissoes.recebimentos && (
          <button onClick={() => setPagina("recebimentos")} style={pagina === "recebimentos" ? botaoAtivo : botaoMenu}>💵 Recebimentos</button>
        )}

        {permissoes.clientes && (
          <button onClick={() => setPagina("clientes")} style={pagina === "clientes" ? botaoAtivo : botaoMenu}>👥 Clientes</button>
        )}

        {permissoes.vendas && (
          <button onClick={() => setPagina("vendas")} style={pagina === "vendas" ? botaoAtivo : botaoMenu}>📦 Vendas</button>
        )}

        {permissoes.compras && (
          <button onClick={() => setPagina("compras")} style={pagina === "compras" ? botaoAtivo : botaoMenu}>🧱 Compras</button>
        )}

        {permissoes.relatorio && (
          <button onClick={() => setPagina("relatorio")} style={pagina === "relatorio" ? botaoAtivo : botaoMenu}>📄 Relatório</button>
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
      {pagina === "dashboard" && permissoes.dashboard && <Dashboard />}
      {pagina === "recebimentos" && permissoes.recebimentos && <Recebimentos empresaId={empresaId} />}
      {pagina === "clientes" && permissoes.clientes && <Clientes />}
      {pagina === "vendas" && permissoes.vendas && (loginMaster ? <Vendas /> : <VendasUsuario />)}
      {pagina === "compras" && permissoes.compras && (loginMaster ? <Compras /> : <ComprasUsuario />)}
      {pagina === "relatorio" && permissoes.relatorio && (loginMaster ? <Relatorio empresaId={empresaId} /> : <RelatorioUsuario empresaId={empresaId} />)}
    </div>

    {/* MENU MOBILE RODAPÉ */}
    {isMobile && (
      <div
        style={{
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
        }}
      >
        <button onClick={() => setPagina("dashboard")} style={mobileBtn}>📊</button>
        <button onClick={() => setPagina("recebimentos")} style={mobileBtn}>💵</button>
        <button onClick={() => setPagina("clientes")} style={mobileBtn}>👥</button>
        <button onClick={() => setPagina("vendas")} style={mobileBtn}>📦</button>
        <button onClick={() => setPagina("relatorio")} style={mobileBtn}>📄</button>
      </div>
    )}
  </div>
);

// COLE NO FINAL DO ARQUIVO

const mobileBtn = {
  background: "transparent",
  border: "none",
  color: "#fff",
  fontSize: 24,
  cursor: "pointer",
};