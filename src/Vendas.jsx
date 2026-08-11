import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ActionButtons, EmptyState, FilterBar, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import { formatarData, formatarNumero } from "./utils";
import { calculateCommission, COMMISSION_TYPES, DEFAULT_PROFILE_COMMISSION_PERCENT, getSaleCommissionPercentage, getStoredOrCalculatedCommission } from "./services/commissionEngine";
import { describePeriod, filterSalesRecords, generateSalesReport } from "./services/reportPdf.service";

export default function Vendas({ empresaId, userId, companyName = "Cunha Finance", issuedBy = "Não informado" }) {
  const [vendas, setVendas] = useState([]);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [kilos, setKilos] = useState("");
  const [unidade, setUnidade] = useState("KG");
  const [valorPorKg, setValorPorKg] = useState("");
  const [percentualComissao, setPercentualComissao] = useState(String(DEFAULT_PROFILE_COMMISSION_PERCENT));

  const [dataVenda, setDataVenda] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState("");
  const [filtroComissao, setFiltroComissao] = useState("");

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
    if (!empresaId) return undefined;
    const timer = window.setTimeout(() => carregarVendas(empresaId), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  // 🔥 CARREGA SOMENTE VENDAS INDUSTRIAIS
  async function carregarVendas(empId) {
    const { data, error } = await supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empId)
      .order("data_venda", { ascending: false })
      .order("id", { ascending: false });

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

  const calculoComissao = calculateCommission({
    product: produto,
    quantity: kilos,
    unit: unidade,
    pricePerKg: valorPorKg,
    percentage: percentualComissao,
  });

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
    if (calculoComissao.kilograms <= 0) {
      return alert("Informe os kilos corretamente.");
    }

    if (calculoComissao.unitPrice <= 0) {
      return alert("Informe o valor por kg.");
    }

    if (calculoComissao.rule.type === COMMISSION_TYPES.PERCENT_SALE && calculoComissao.percentage <= 0) {
      return alert("Informe o percentual da comissão.");
    }

    // 🔥 VALIDA CLIENTE
    if (!cliente.trim()) {
      return alert("Informe o cliente.");
    }

    const payload = {
      cliente_nome: cliente.trim().toUpperCase(),
      produto: nomeProduto,
      kilos: calculoComissao.kilograms,
      valor: calculoComissao.totalSale,
      comissao: calculoComissao.commission,
      data_venda: dataVenda,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("vendas")
        .update(payload)
        .eq("id", editandoId)
        .eq("empresa_id", empresaId);

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
    setUnidade("KG");
    setValorPorKg("");
    setPercentualComissao(String(DEFAULT_PROFILE_COMMISSION_PERCENT));
    setModalAberto(false);

    carregarVendas(empresaId);
  }

  function editarVenda(v) {
    setEditandoId(v.id);

    setCliente(v.cliente_nome || "");
    setProduto(v.produto || "");
    setKilos(v.kilos || "");
    setUnidade("KG");
    const precoUnitario = Number(v.kilos) > 0 ? Number(v.valor || 0) / Number(v.kilos) : 0;
    setValorPorKg(precoUnitario || "");
    setPercentualComissao(String(getSaleCommissionPercentage(v)));
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
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      console.error(error);
      return alert("Erro ao excluir");
    }

    carregarVendas(empresaId);
  }

  function novaVenda() {
    setEditandoId(null);
    setCliente("");
    setProduto("");
    setKilos("");
    setUnidade("KG");
    setValorPorKg("");
    setPercentualComissao(String(DEFAULT_PROFILE_COMMISSION_PERCENT));
    setDataVenda(new Date().toISOString().split("T")[0]);
    setModalAberto(true);
  }

  const filtrosRelatorio = { party: busca, product: filtroProduto, responsible: filtroVendedor, status: filtroStatus, unit: filtroUnidade, commissionType: filtroComissao, startDate: dataInicio, endDate: dataFim };
  const vendasFiltradas = filterSalesRecords(vendas, filtrosRelatorio).filter((item) => String(item.empresa_id) === String(empresaId));
  const pesoTotal = vendasFiltradas.reduce((total, v) => total + Number(v.kilos || 0), 0);
  const comissaoTotal = vendasFiltradas.reduce((total, v) => total + getStoredOrCalculatedCommission(v), 0);
  const valorTotal = vendasFiltradas.reduce((total, v) => total + Number(v.valor || 0), 0);

  function limparFiltros() {
    setBusca(""); setFiltroProduto(""); setDataInicio(""); setDataFim("");
    setFiltroVendedor(""); setFiltroStatus(""); setFiltroUnidade(""); setFiltroComissao("");
  }

  return <div className="ops-page">
    <ModuleHeader eyebrow="Operação comercial" title="Vendas" description="Gestão das vendas industriais e respectivas comissões." actionLabel="Nova Venda" onAction={novaVenda} />
    <MetricGrid items={[
      { label: "Vendas do período", value: vendasFiltradas.length, detail: "registros filtrados", icon: "▥" },
      { label: "Peso vendido", value: `${pesoTotal.toLocaleString("pt-BR")} kg`, detail: "volume total", icon: "⚖", tone: "green" },
      { label: "Valor total", value: `R$ ${formatarNumero(valorTotal)}`, detail: "valor acumulado", icon: "R$", tone: "amber" },
      { label: "Comissão", value: `R$ ${formatarNumero(comissaoTotal)}`, detail: "comissão acumulada", icon: "%", tone: "green" },
      { label: "Quantidade", value: vendasFiltradas.length, detail: "vendas exibidas", icon: "#" },
    ]} />
    <FilterBar><input placeholder="Buscar por cliente" value={busca} onChange={(e) => setBusca(e.target.value)} /><input placeholder="Filtrar por produto" value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)} /><input type="date" aria-label="Data inicial" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /><input type="date" aria-label="Data final" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /><input placeholder="Vendedor" value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} /><input placeholder="Status" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} /><select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)}><option value="">Todas as unidades</option><option value="KG">kg</option><option value="TON">tonelada</option></select><select value={filtroComissao} onChange={(e) => setFiltroComissao(e.target.value)}><option value="">Todos os tipos</option><option value="PER_KG">Por kg</option><option value="PERCENT_SALE">Percentual</option></select><button type="button" onClick={limparFiltros}>Limpar filtros</button><button type="button" onClick={() => generateSalesReport({ records: vendasFiltradas, companyName, issuedBy, period: describePeriod(dataInicio, dataFim) })}>Gerar Relatório PDF</button></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Registro de vendas</h2><span>{vendasFiltradas.length} resultado(s)</span></div>
      {vendasFiltradas.length === 0 ? <EmptyState /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Data</th><th>Cliente</th><th>Produto</th><th>Peso</th><th>Valor</th><th>Comissão</th><th>Vendedor</th><th>Ações</th></tr></thead><tbody>{vendasFiltradas.map((v) => <tr key={v.id}><td>{formatarData(v.data_venda)}</td><td><strong>{v.cliente_nome || "-"}</strong></td><td>{v.produto || "-"}</td><td>{Number(v.kilos || 0).toLocaleString("pt-BR")} kg</td><td>R$ {formatarNumero(v.valor)}</td><td>R$ {formatarNumero(getStoredOrCalculatedCommission(v))}</td><td>{v.vendedor_nome || v.vendedor || "—"}</td><td><ActionButtons onEdit={() => editarVenda(v)} onDelete={() => excluirVenda(v.id)} /></td></tr>)}</tbody></table></div>}
    </section>
    {modalAberto && <OperationModal title={editandoId ? "Editar venda" : "Nova venda"} editing={Boolean(editandoId)} onClose={() => setModalAberto(false)} onSubmit={salvarVenda} submitLabel={editandoId ? "Atualizar" : "Salvar"}>
      <label className="ops-field"><span>Data</span><input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} /></label>
      <label className="ops-field"><span>Cliente</span><input placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} /></label>
      <label className="ops-field"><span>Produto</span><input placeholder="Produto" value={produto} onChange={(e) => setProduto(e.target.value)} /></label>
      <label className="ops-field"><span>Quantidade</span><input type="number" step="any" min="0" placeholder="Quantidade" value={kilos} onChange={(e) => setKilos(e.target.value)} /></label>
      <label className="ops-field"><span>Unidade</span><select value={unidade} onChange={(e) => setUnidade(e.target.value)}><option value="KG">Quilograma</option><option value="TON">Tonelada</option></select></label>
      <label className="ops-field"><span>Valor por kg</span><input type="number" step="any" min="0" value={valorPorKg} onChange={(e) => setValorPorKg(e.target.value)} /></label>
      {calculoComissao.rule.type === COMMISSION_TYPES.PERCENT_SALE && <label className="ops-field"><span>Percentual da comissão (%)</span><input type="number" step="any" min="0" value={percentualComissao} onChange={(e) => setPercentualComissao(e.target.value)} /></label>}
      <div className="ops-preview"><strong>Peso:</strong> {formatarNumero(calculoComissao.kilograms)} kg · <strong>Valor da venda:</strong> R$ {formatarNumero(calculoComissao.totalSale)} · <strong>Comissão:</strong> R$ {formatarNumero(calculoComissao.commission)}</div>
    </OperationModal>}
  </div>;
}
