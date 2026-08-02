import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ActionButtons, EmptyState, FilterBar, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import InstallmentSaleModal from "./components/operations/InstallmentSaleModal";

// 🔥 FORMATA DATA
function formatarData(data) {
  if (!data) return "-";

  const limpa = String(data).slice(0, 10);
  const [ano, mes, dia] = limpa.split("-");

  return `${dia}/${mes}/${ano}`;
}

// 🔥 FORMATA DINHEIRO
function dinheiro(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Vendas() {
  const [vendas, setVendas] = useState([]);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [kilos, setKilos] = useState("");

  const [dataVenda, setDataVenda] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [empresaId, setEmpresaId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [parceladaAberta, setParceladaAberta] = useState(false);

  // 🔥 PRODUTOS INDUSTRIAIS PERMITIDOS
  const produtosPermitidos = [
    "TARUGO",
    "PERFIL",
    "SUCATA",
    "CAVACO",
    "LINGOTE",
    "LIMALHA",
    "BORRA",
    "ALUMINIO",
    "ALUMÍNIO",
    "METAIS",
    "METAL",
  ];

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return alert("Usuário não logado");

    setUserId(user.id);

    const { data } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("email", user.email)
      .single();

    if (!data?.empresa_id) {
      return alert("Empresa não encontrada");
    }

    setEmpresaId(data.empresa_id);

    carregarVendas(data.empresa_id);
  }

  // 🔥 CARREGA SOMENTE VENDAS INDUSTRIAIS
  async function carregarVendas(empId) {
    const { data, error } = await supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empId)
      .order("data_venda", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    // 🔥 REMOVE PRODUTOS INVÁLIDOS
    const filtradas = (data || []).filter((v) => {
      const nomeProduto = String(v.produto || "").toUpperCase();

      return produtosPermitidos.some((p) =>
        nomeProduto.includes(p)
      );
    });

    setVendas(filtradas);
  }

  function calcularComissao() {
    return Number(kilos || 0) * 0.05;
  }

  async function salvarVenda() {
    if (!empresaId) {
      return alert("Empresa não carregada");
    }

    // 🔥 VALIDA PRODUTO
    const nomeProduto = String(produto || "")
      .trim()
      .toUpperCase();

    const produtoPermitido = produtosPermitidos.some((p) =>
      nomeProduto.includes(p)
    );

    if (!produtoPermitido) {
      return alert(
        "Produto não permitido em vendas industriais."
      );
    }

    // 🔥 VALIDA KILOS
    if (Number(kilos) <= 0) {
      return alert("Informe os kilos corretamente.");
    }

    // 🔥 VALIDA CLIENTE
    if (!cliente.trim()) {
      return alert("Informe o cliente.");
    }

    const payload = {
      cliente_nome: cliente.trim().toUpperCase(),
      produto: nomeProduto,
      kilos: Number(kilos),
      comissao: calcularComissao(),
      data_venda: dataVenda,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("vendas")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        console.error(error);
        return alert("Erro ao atualizar venda");
      }

      alert("Venda atualizada!");

      setEditandoId(null);
    } else {
      const { error } = await supabase
        .from("vendas")
        .insert([
          {
            ...payload,
            empresa_id: empresaId,
            user_id: userId,
          },
        ]);

      if (error) {
        console.error(error);
        return alert("Erro ao salvar venda");
      }

      alert("Venda salva!");
    }

    // 🔥 LIMPA CAMPOS
    setCliente("");
    setProduto("");
    setKilos("");
    setModalAberto(false);

    carregarVendas(empresaId);
  }

  function editarVenda(v) {
    setEditandoId(v.id);

    setCliente(v.cliente_nome || "");
    setProduto(v.produto || "");
    setKilos(v.kilos || "");
    setDataVenda(v.data_venda || "");
    setModalAberto(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirVenda(id) {
    if (!confirm("Excluir venda?")) return;

    const { error } = await supabase
      .from("vendas")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      return alert("Erro ao excluir");
    }

    carregarVendas(empresaId);
  }

  const vendasFiltradas = vendas.filter((v) =>
    String(v.cliente_nome || "").toLowerCase().includes(busca.toLowerCase()) &&
    String(v.produto || "").toLowerCase().includes(filtroProduto.toLowerCase())
  );
  const pesoTotal = vendas.reduce((total, v) => total + Number(v.kilos || 0), 0);
  const comissaoTotal = vendas.reduce((total, v) => total + Number(v.comissao || 0), 0);

  return <div className="ops-page">
    <ModuleHeader eyebrow="Operação comercial" title="Vendas" description="Gestão das vendas industriais e respectivas comissões." actionLabel="Nova Venda" onAction={() => { setEditandoId(null); setModalAberto(true); }} />
    <div className="ops-inline-actions"><button onClick={() => setParceladaAberta(true)}>Venda parcelada</button><span>Cria a venda e os títulos em Contas a Receber.</span></div>
    <MetricGrid items={[
      { label: "Vendas do mês", value: vendas.length, detail: "registros carregados", icon: "▥" },
      { label: "Peso vendido", value: `${pesoTotal.toLocaleString("pt-BR")} kg`, detail: "volume total", icon: "⚖", tone: "green" },
      { label: "Valor total", value: "—", detail: "não informado neste fluxo", icon: "R$", tone: "amber" },
      { label: "Comissão", value: `R$ ${dinheiro(comissaoTotal)}`, detail: "comissão acumulada", icon: "%", tone: "green" },
      { label: "Quantidade", value: vendas.length, detail: "vendas registradas", icon: "#" },
    ]} />
    <FilterBar><input placeholder="Buscar por cliente" value={busca} onChange={(e) => setBusca(e.target.value)} /><input placeholder="Filtrar por produto" value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)} /></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Registro de vendas</h2><span>{vendasFiltradas.length} resultado(s)</span></div>
      {vendasFiltradas.length === 0 ? <EmptyState /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Data</th><th>Cliente</th><th>Produto</th><th>Peso</th><th>Valor</th><th>Comissão</th><th>Vendedor</th><th>Ações</th></tr></thead><tbody>{vendasFiltradas.map((v) => <tr key={v.id}><td>{formatarData(v.data_venda)}</td><td><strong>{v.cliente_nome || "-"}</strong></td><td>{v.produto || "-"}</td><td>{Number(v.kilos || 0).toLocaleString("pt-BR")} kg</td><td>—</td><td>R$ {dinheiro(v.comissao)}</td><td>—</td><td><ActionButtons onEdit={() => editarVenda(v)} onDelete={() => excluirVenda(v.id)} /></td></tr>)}</tbody></table></div>}
    </section>
    {modalAberto && <OperationModal title={editandoId ? "Editar venda" : "Nova venda"} editing={Boolean(editandoId)} onClose={() => setModalAberto(false)} onSubmit={salvarVenda} submitLabel={editandoId ? "Atualizar" : "Salvar"}>
      <label className="ops-field"><span>Data</span><input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} /></label>
      <label className="ops-field"><span>Cliente</span><input placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} /></label>
      <label className="ops-field"><span>Produto</span><input placeholder="Produto" value={produto} onChange={(e) => setProduto(e.target.value)} /></label>
      <label className="ops-field"><span>Kilos</span><input type="number" placeholder="Kilos" value={kilos} onChange={(e) => setKilos(e.target.value)} /></label>
      <div className="ops-preview"><strong>Comissão:</strong> R$ {dinheiro(calcularComissao())}</div>
    </OperationModal>}
    {parceladaAberta && <InstallmentSaleModal empresaId={empresaId} commissionNote="a venda industrial mantém sua regra atual; o payload parcelado legado não grava comissão adicional." onClose={() => setParceladaAberta(false)} onSaved={() => carregarVendas(empresaId)} />}
  </div>;
}
