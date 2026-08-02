import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ActionButtons, EmptyState, FilterBar, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";

export default function Compras() {
  const [compras, setCompras] = useState([]);

  const [fornecedor, setFornecedor] = useState("");
  const [produto, setProduto] = useState("");
  const [kilos, setKilos] = useState("");

  const [dataCompra, setDataCompra] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [empresaId, setEmpresaId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    setLoadingEmpresa(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não logado");
      setLoadingEmpresa(false);
      return;
    }

    setUserEmail(user.email);

    const { data, error } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("email", user.email)
      .single();

    if (error || !data?.empresa_id) {
      alert("Empresa não encontrada");
      setLoadingEmpresa(false);
      return;
    }

    setEmpresaId(data.empresa_id);

    await carregarCompras(data.empresa_id);

    setLoadingEmpresa(false);
  }

  if (userEmail && userEmail !== "maurojean3211@gmail.com") {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        ⛔ Acesso restrito
      </div>
    );
  }

  if (loadingEmpresa) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        Carregando empresa...
      </div>
    );
  }

  async function carregarCompras(empId) {
    if (!empId) return;

    const { data, error } = await supabase
      .from("compras")
      .select("*")
      .eq("empresa_id", empId)
      .order("id", { ascending: false });

    if (error) {
      console.log("ERRO AO BUSCAR:", error);
      return;
    }

    setCompras(data || []);
  }

  function calcularComissao() {
    const nome = (produto || "").toUpperCase();
    const kg = Number(kilos || 0);

    if (nome.includes("LIMALHA") || nome.includes("CAVACO")) {
      return kg * 0.07;
    }

    return kg * 0.05;
  }

  function formatarData(data) {
    if (!data) return "";

    const partes = data.split("-");
    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const comprasFiltradas = compras.filter((c) =>
    (c.fornecedor || "")
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  async function salvarCompra() {
    if (!empresaId) {
      alert("Empresa ainda não carregada");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não carregado");
      return;
    }

    if (!produto) return alert("Informe o produto");
    if (!kilos || Number(kilos) <= 0)
      return alert("Kilos inválido");

    const comissao = calcularComissao();

    let error;

    if (editandoId) {
      ({ error } = await supabase
        .from("compras")
        .update({
          fornecedor,
          produto,
          kilos: Number(kilos),
          comissao,
          data_compra: dataCompra,
        })
        .eq("id", editandoId));

      if (error) return alert(error.message);

      alert("Atualizado!");
      setEditandoId(null);
    } else {
      ({ error } = await supabase
        .from("compras")
        .insert([
          {
            empresa_id: empresaId,
            fornecedor,
            produto,
            kilos: Number(kilos),
            comissao,
            data_compra: dataCompra,
            user_id: user.id,
          },
        ]));

      if (error) return alert(error.message);

      alert("Compra salva!");
    }

    setFornecedor("");
    setProduto("");
    setKilos("");
    setDataCompra(
      new Date().toISOString().split("T")[0]
    );

    await carregarCompras(empresaId);
    setModalAberto(false);
  }

  function editarCompra(c) {
    setEditandoId(c.id);
    setFornecedor(c.fornecedor || "");
    setProduto(c.produto || "");
    setKilos(c.kilos || "");
    setDataCompra(c.data_compra || "");
    setModalAberto(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirCompra(id) {
    if (!confirm("Excluir?")) return;

    await supabase
      .from("compras")
      .delete()
      .eq("id", id);

    await carregarCompras(empresaId);
  }

  const comissaoPreview = calcularComissao();
  const comprasVisiveis = comprasFiltradas.filter((c) => String(c.produto || "").toLowerCase().includes(filtroProduto.toLowerCase()));
  const pesoTotal = compras.reduce((total, c) => total + Number(c.kilos || 0), 0);
  const comissaoTotal = compras.reduce((total, c) => total + Number(c.comissao || 0), 0);

  return <div className="ops-page">
    <ModuleHeader eyebrow="Materiais e operações" title="Compras" description="Controle operacional de aquisições e comissões." actionLabel="Nova Compra" onAction={() => { setEditandoId(null); setModalAberto(true); }} />
    <MetricGrid items={[
      { label: "Compras do mês", value: compras.length, detail: "registros carregados", icon: "▥" },
      { label: "Peso comprado", value: `${pesoTotal.toLocaleString("pt-BR")} kg`, detail: "volume total", icon: "⚖", tone: "green" },
      { label: "Valor total", value: "—", detail: "não informado neste fluxo", icon: "R$", tone: "amber" },
      { label: "Custo médio", value: "—", detail: "sem custo unitário", icon: "÷" },
      { label: "Quantidade", value: compras.length, detail: `R$ ${comissaoTotal.toFixed(2)} em comissões`, icon: "#" },
    ]} />
    <FilterBar><input placeholder="Buscar por fornecedor" value={busca} onChange={(e) => setBusca(e.target.value)} /><input placeholder="Filtrar por produto" value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)} /></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Registro de compras</h2><span>{comprasVisiveis.length} resultado(s)</span></div>
      {comprasVisiveis.length === 0 ? <EmptyState /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Data</th><th>Fornecedor</th><th>Produto</th><th>Peso</th><th>Valor</th><th>Custo unitário</th><th>Responsável</th><th>Ações</th></tr></thead><tbody>{comprasVisiveis.map((c) => <tr key={c.id}><td>{formatarData(c.data_compra)}</td><td><strong>{c.fornecedor || "-"}</strong></td><td>{c.produto || "-"}</td><td>{Number(c.kilos || 0).toLocaleString("pt-BR")} kg</td><td>—</td><td>—</td><td>—</td><td><ActionButtons onEdit={() => editarCompra(c)} onDelete={() => excluirCompra(c.id)} /></td></tr>)}</tbody></table></div>}
    </section>
    {modalAberto && <OperationModal title={editandoId ? "Editar compra" : "Nova compra"} editing={Boolean(editandoId)} onClose={() => setModalAberto(false)} onSubmit={salvarCompra} submitLabel={editandoId ? "Atualizar" : "Salvar"} disabled={!empresaId}>
      <label className="ops-field"><span>Data</span><input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} /></label>
      <label className="ops-field"><span>Fornecedor</span><input placeholder="Fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} /></label>
      <label className="ops-field"><span>Produto</span><input placeholder="Produto (sucata, limalha ou cavaco)" value={produto} onChange={(e) => setProduto(e.target.value)} /></label>
      <label className="ops-field"><span>Kilos</span><input type="number" placeholder="Kilos" value={kilos} onChange={(e) => setKilos(e.target.value)} /></label>
      <div className="ops-preview"><strong>Comissão:</strong> R$ {comissaoPreview.toFixed(2)}</div>
    </OperationModal>}
  </div>;
}
