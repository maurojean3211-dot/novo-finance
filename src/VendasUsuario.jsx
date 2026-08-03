import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ActionButtons, EmptyState, FilterBar, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import { formatarData } from "./utils";
import { calculateCommission, COMMISSION_TYPES, DEFAULT_PROFILE_COMMISSION_PERCENT, getSaleCommissionPercentage } from "./services/commissionEngine";
import { describePeriod, filterSalesRecords, generateSalesReport } from "./services/reportPdf.service";

export default function VendasUsuario({ empresaId, userId, companyName = "Cunha Finance", issuedBy = "Não informado" }) {
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
  const [tipo, setTipo] = useState("KG");
  const [valor, setValor] = useState("");
  const [percentualComissao, setPercentualComissao] = useState(String(DEFAULT_PROFILE_COMMISSION_PERCENT));
  const [dataVenda, setDataVenda] =
    useState(dataHoje);

  const [editandoId, setEditandoId] =
    useState(null);

  const [busca, setBusca] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState("");
  const [filtroComissao, setFiltroComissao] = useState("");
  const [modalAberto, setModalAberto] = useState(false);

  const calculoComissao = calculateCommission({
    product: produto,
    quantity: quantidade,
    unit: tipo,
    pricePerKg: valor,
    percentage: percentualComissao,
    fallbackPerKgRate: 0,
  });

  useEffect(() => {
    if (!empresaId) return undefined;
    // A carga é adiada para preservar o ciclo de montagem do componente legado.
    // eslint-disable-next-line react-hooks/immutability
    const timer = window.setTimeout(() => carregarVendas(empresaId), 0);
    return () => window.clearTimeout(timer);
  }, [empresaId]);

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

    if (calculoComissao.kilograms <= 0)
      return alert(
        "Informe a quantidade"
      );

    if (calculoComissao.unitPrice <= 0)
      return alert("Informe o valor por kg");

    if (calculoComissao.rule.type === COMMISSION_TYPES.PERCENT_SALE && calculoComissao.percentage <= 0)
      return alert("Informe o percentual da comissão");

    const payload = {
      cliente_nome: cliente,
      produto,
      kilos: calculoComissao.kilograms,
      valor: calculoComissao.totalSale,
      comissao: calculoComissao.commission,
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
    setTipo("KG");
    setValor("");
    setPercentualComissao(String(DEFAULT_PROFILE_COMMISSION_PERCENT));
    setDataVenda(dataHoje);
    setEditandoId(null);
  }

  function editarVenda(v) {
    setEditandoId(v.id);
    setCliente(v.cliente_nome || "");
    setProduto(v.produto || "");
    setQuantidade(v.kilos || "");
    setTipo("KG");
    const precoUnitario = Number(v.kilos) > 0 ? Number(v.valor || 0) / Number(v.kilos) : 0;
    setValor(precoUnitario || "");
    setPercentualComissao(String(getSaleCommissionPercentage(v)));
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

  const filtrosRelatorio = { party: busca, product: filtroProduto, responsible: filtroVendedor, status: filtroStatus, unit: filtroUnidade, commissionType: filtroComissao, startDate: dataInicio, endDate: dataFim };
  const vendasFiltradas = filterSalesRecords(vendas, filtrosRelatorio).filter((item) => String(item.empresa_id) === String(empresaId));

  const totalValor = vendas.reduce((total, v) => total + Number(v.valor || 0), 0);
  const totalQuantidade = vendas.reduce((total, v) => total + Number(v.kilos || 0), 0);
  const totalComissao = vendas.reduce((total, v) => total + Number(v.comissao || 0), 0);

  return <div className="ops-page">
    <ModuleHeader eyebrow="Operação comercial" title="Vendas" description="Acompanhe registros, volumes e valores comerciais." actionLabel="Nova Venda" onAction={() => { limpar(); setModalAberto(true); }} />
    <MetricGrid items={[{ label: "Vendas do mês", value: vendas.length, detail: "registros carregados", icon: "▥" }, { label: "Peso vendido", value: `${totalQuantidade.toLocaleString("pt-BR")} kg`, detail: "quantidade total", icon: "⚖", tone: "green" }, { label: "Valor total", value: `R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, detail: "valor acumulado", icon: "R$", tone: "amber" }, { label: "Comissão", value: `R$ ${totalComissao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, detail: "comissão acumulada", icon: "%" }, { label: "Quantidade", value: vendas.length, detail: "vendas registradas", icon: "#" }]} />
    <FilterBar><input placeholder="Buscar por cliente" value={busca} onChange={(e) => setBusca(e.target.value)} /><input placeholder="Filtrar por produto" value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)} /><input type="date" aria-label="Data inicial" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /><input type="date" aria-label="Data final" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /><input placeholder="Vendedor" value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} /><input placeholder="Status" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} /><select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)}><option value="">Todas as unidades</option><option value="KG">kg</option><option value="TON">tonelada</option></select><select value={filtroComissao} onChange={(e) => setFiltroComissao(e.target.value)}><option value="">Todos os tipos</option><option value="PER_KG">Por kg</option><option value="PERCENT_SALE">Percentual</option></select><button type="button" onClick={() => generateSalesReport({ records: vendasFiltradas, companyName, issuedBy, period: describePeriod(dataInicio, dataFim) })}>Gerar Relatório PDF</button></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Registro de vendas</h2><span>{vendasFiltradas.length} resultado(s)</span></div>{vendasFiltradas.length === 0 ? <EmptyState /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Data</th><th>Cliente</th><th>Produto</th><th>Peso</th><th>Valor</th><th>Comissão</th><th>Vendedor</th><th>Ações</th></tr></thead><tbody>{vendasFiltradas.map((v) => <tr key={v.id}><td>{formatarData(v.data_venda)}</td><td><strong>{v.cliente_nome || "-"}</strong></td><td>{v.produto || "-"}</td><td>{Number(v.kilos || 0).toLocaleString("pt-BR")} kg</td><td>R$ {Number(v.valor || 0).toFixed(2)}</td><td>R$ {Number(v.comissao || 0).toFixed(2)}</td><td>—</td><td><ActionButtons onEdit={() => editarVenda(v)} onDelete={() => excluirVenda(v.id)} /></td></tr>)}</tbody></table></div>}</section>
    {modalAberto && <OperationModal title={editandoId ? "Editar venda" : "Nova venda"} editing={Boolean(editandoId)} onClose={() => setModalAberto(false)} onSubmit={salvarVenda} submitLabel={editandoId ? "Atualizar Venda" : "Salvar Venda"}>
      <label className="ops-field"><span>Data</span><input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} /></label><label className="ops-field"><span>Cliente</span><input value={cliente} onChange={(e) => setCliente(e.target.value)} /></label><label className="ops-field"><span>Produto</span><input value={produto} onChange={(e) => setProduto(e.target.value)} /></label><label className="ops-field"><span>Quantidade</span><input type="number" step="any" min="0" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></label><label className="ops-field"><span>Unidade</span><select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="KG">Quilograma</option><option value="TON">Tonelada</option></select></label><label className="ops-field"><span>Valor por kg</span><input type="number" step="any" min="0" value={valor} onChange={(e) => setValor(e.target.value)} /></label>{calculoComissao.rule.type === COMMISSION_TYPES.PERCENT_SALE && <label className="ops-field"><span>Percentual da comissão (%)</span><input type="number" step="any" min="0" value={percentualComissao} onChange={(e) => setPercentualComissao(e.target.value)} /></label>}<div className="ops-preview"><strong>Peso:</strong> {calculoComissao.kilograms.toLocaleString("pt-BR")} kg · <strong>Valor da venda:</strong> R$ {calculoComissao.totalSale.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · <strong>Comissão:</strong> R$ {calculoComissao.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
    </OperationModal>}
  </div>;
}
