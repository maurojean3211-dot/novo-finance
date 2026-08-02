import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ActionButtons, EmptyState, FilterBar, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import InstallmentSaleModal from "./components/operations/InstallmentSaleModal";

function formatarData(data) {
  if (!data) return "";

  const limpa = String(data).slice(0, 10);
  const [ano, mes, dia] = limpa.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default function VendasUsuario() {
  const hoje = new Date();

  const dataHoje = `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1
  ).padStart(2, "0")}-${String(
    hoje.getDate()
  ).padStart(2, "0")}`;

  const [vendas, setVendas] = useState([]);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [tipo, setTipo] = useState("UN");
  const [valor, setValor] = useState("");
  const [dataVenda, setDataVenda] =
    useState(dataHoje);

  const [empresaId, setEmpresaId] =
    useState(null);

  const [userId, setUserId] =
    useState(null);

  const [editandoId, setEditandoId] =
    useState(null);

  const [busca, setBusca] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [parceladaAberta, setParceladaAberta] = useState(false);

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return alert("Usuário não logado");

    setUserId(user.id);

    const { data, error } =
      await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("email", user.email)
        .single();

    if (error || !data?.empresa_id) {
      return alert("Empresa não encontrada");
    }

    setEmpresaId(data.empresa_id);

    carregarVendas(data.empresa_id);
  }

  async function carregarVendas(empId) {
    const { data, error } =
      await supabase
        .from("vendas")
        .select("*")
        .eq("empresa_id", empId)
        .order("data_venda", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        });

    if (!error) {
      setVendas(data || []);
    }
  }

  async function salvarVenda() {
    if (!empresaId)
      return alert(
        "Empresa não carregada"
      );

    if (!cliente.trim())
      return alert(
        "Informe o cliente"
      );

    if (!produto.trim())
      return alert(
        "Informe o produto"
      );

    if (!quantidade)
      return alert(
        "Informe a quantidade"
      );

    if (!valor)
      return alert("Informe o valor");

    const payload = {
      cliente_nome: cliente,
      produto,
      kilos: Number(quantidade),
      valor: Number(valor),
      comissao: 0,
      data_venda: dataVenda,
    };

    let error = null;

    if (editandoId) {
      const res = await supabase
        .from("vendas")
        .update(payload)
        .eq("id", editandoId)
        .eq("empresa_id", empresaId);

      error = res.error;
    } else {
      const res = await supabase
        .from("vendas")
        .insert([
          {
            ...payload,
            empresa_id: empresaId,
            user_id: userId,
          },
        ]);

      error = res.error;
    }

    if (error)
      return alert(error.message);

    alert(
      editandoId
        ? "Venda atualizada!"
        : "Venda salva!"
    );

    limpar();
    setModalAberto(false);

    carregarVendas(empresaId);
  }

  function limpar() {
    setCliente("");
    setProduto("");
    setQuantidade("");
    setTipo("UN");
    setValor("");
    setDataVenda(dataHoje);
    setEditandoId(null);
  }

  function editarVenda(v) {
    setEditandoId(v.id);
    setCliente(v.cliente_nome || "");
    setProduto(v.produto || "");
    setQuantidade(v.kilos || "");
    setTipo("UN");
    setValor(v.valor || "");
    setDataVenda(
      String(v.data_venda).slice(0, 10)
    );
    setModalAberto(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirVenda(id) {
    if (
      !window.confirm(
        "Excluir venda?"
      )
    )
      return;

    await supabase
      .from("vendas")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    carregarVendas(empresaId);
  }

  const vendasFiltradas =
    vendas.filter((v) =>
      (v.cliente_nome || "")
        .toLowerCase()
        .includes(
          busca.toLowerCase()
        )
    ).filter((v) => (v.produto || "").toLowerCase().includes(filtroProduto.toLowerCase()));

  const totalValor = vendas.reduce((total, v) => total + Number(v.valor || 0), 0);
  const totalQuantidade = vendas.reduce((total, v) => total + Number(v.kilos || 0), 0);

  return <div className="ops-page">
    <ModuleHeader eyebrow="Operação comercial" title="Vendas" description="Acompanhe registros, volumes e valores comerciais." actionLabel="Nova Venda" onAction={() => { limpar(); setModalAberto(true); }} />
    <div className="ops-inline-actions"><button onClick={() => setParceladaAberta(true)}>Venda parcelada</button><span>Cria a venda e os títulos em Contas a Receber.</span></div>
    <MetricGrid items={[{ label: "Vendas do mês", value: vendas.length, detail: "registros carregados", icon: "▥" }, { label: "Peso vendido", value: totalQuantidade.toLocaleString("pt-BR"), detail: "quantidade total", icon: "⚖", tone: "green" }, { label: "Valor total", value: `R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, detail: "valor acumulado", icon: "R$", tone: "amber" }, { label: "Comissão", value: "R$ 0,00", detail: "regra atual do usuário", icon: "%" }, { label: "Quantidade", value: vendas.length, detail: "vendas registradas", icon: "#" }]} />
    <FilterBar><input placeholder="Buscar por cliente" value={busca} onChange={(e) => setBusca(e.target.value)} /><input placeholder="Filtrar por produto" value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)} /></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Registro de vendas</h2><span>{vendasFiltradas.length} resultado(s)</span></div>{vendasFiltradas.length === 0 ? <EmptyState /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Data</th><th>Cliente</th><th>Produto</th><th>Peso/quantidade</th><th>Valor</th><th>Comissão</th><th>Vendedor</th><th>Ações</th></tr></thead><tbody>{vendasFiltradas.map((v) => <tr key={v.id}><td>{formatarData(v.data_venda)}</td><td><strong>{v.cliente_nome || "-"}</strong></td><td>{v.produto || "-"}</td><td>{v.kilos} {tipo}</td><td>R$ {Number(v.valor || 0).toFixed(2)}</td><td>R$ {Number(v.comissao || 0).toFixed(2)}</td><td>—</td><td><ActionButtons onEdit={() => editarVenda(v)} onDelete={() => excluirVenda(v.id)} /></td></tr>)}</tbody></table></div>}</section>
    {modalAberto && <OperationModal title={editandoId ? "Editar venda" : "Nova venda"} editing={Boolean(editandoId)} onClose={() => setModalAberto(false)} onSubmit={salvarVenda} submitLabel={editandoId ? "Atualizar Venda" : "Salvar Venda"}>
      <label className="ops-field"><span>Data</span><input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} /></label><label className="ops-field"><span>Cliente</span><input value={cliente} onChange={(e) => setCliente(e.target.value)} /></label><label className="ops-field"><span>Produto</span><input value={produto} onChange={(e) => setProduto(e.target.value)} /></label><label className="ops-field"><span>Quantidade</span><input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></label><label className="ops-field"><span>Unidade</span><select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="UN">Unidade</option><option value="KG">Kilo</option></select></label><label className="ops-field"><span>Valor</span><input type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></label>
    </OperationModal>}
    {parceladaAberta && <InstallmentSaleModal empresaId={empresaId} commissionNote="R$ 0,00, conforme a regra atual do fluxo de usuário." onClose={() => setParceladaAberta(false)} onSaved={() => carregarVendas(empresaId)} />}
  </div>;
}
