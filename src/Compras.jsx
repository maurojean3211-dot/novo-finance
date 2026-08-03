import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { ActionButtons, EmptyState, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import PurchaseReportControls from "./components/operations/PurchaseReportControls";
import { calculatePurchaseCommission, formatPurchaseCommissionRate, getDefaultPurchaseCommissionRate, getPurchaseCommissionData } from "./services/commissionEngine";
import { describePeriod, EMPTY_PURCHASE_FILTERS, filterPurchaseRecords, generatePurchasesReport } from "./services/reportPdf.service";

export default function Compras({ empresaId, userId, userEmail, companyName = "Cunha Finance", issuedBy = "Não informado" }) {
  const [compras, setCompras] = useState([]);

  const [fornecedor, setFornecedor] = useState("");
  const [produto, setProduto] = useState("");
  const [kilos, setKilos] = useState("");
  const [comissaoPorKg, setComissaoPorKg] = useState("");
  const comissaoAlteradaManualmente = useRef(false);

  const [dataCompra, setDataCompra] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [editandoId, setEditandoId] = useState(null);
  const [filterDraft, setFilterDraft] = useState(EMPTY_PURCHASE_FILTERS);
  const [activeFilters, setActiveFilters] = useState(EMPTY_PURCHASE_FILTERS);
  const [reportMessage, setReportMessage] = useState("");
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    if (!empresaId) return undefined;
    // A carga é adiada para preservar o ciclo de montagem do componente legado.
    // eslint-disable-next-line react-hooks/immutability
    const timer = window.setTimeout(() => carregarCompras(empresaId), 0);
    return () => window.clearTimeout(timer);
  }, [empresaId]);

  if (userEmail && userEmail !== "maurojean3211@gmail.com") {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        ⛔ Acesso restrito
      </div>
    );
  }

  if (!empresaId) {
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

  function alterarProduto(value) {
    const novaRegra = getDefaultPurchaseCommissionRate(value);
    setProduto(value);
    if (!comissaoAlteradaManualmente.current) setComissaoPorKg(formatPurchaseCommissionRate(novaRegra));
  }

  function usarComissaoPadrao() {
    comissaoAlteradaManualmente.current = false;
    setComissaoPorKg(formatPurchaseCommissionRate(getDefaultPurchaseCommissionRate(produto)));
  }

  function formatarData(data) {
    if (!data) return "";

    const partes = data.split("-");
    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  async function salvarCompra() {
    if (!empresaId) {
      alert("Empresa ainda não carregada");
      return;
    }

    if (!userId) {
      alert("Usuário não carregado");
      return;
    }

    if (!produto) return alert("Informe o produto");
    if (!kilos || Number(kilos) <= 0)
      return alert("Kilos inválido");

    const comissao = calculoComissao.commission;

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
        .eq("id", editandoId)
        .eq("empresa_id", empresaId));

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
            user_id: userId,
          },
        ]));

      if (error) return alert(error.message);

      alert("Compra salva!");
    }

    setFornecedor("");
    setProduto("");
    setKilos("");
    setComissaoPorKg("");
    comissaoAlteradaManualmente.current = false;
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
    const commissionData = getPurchaseCommissionData(c);
    setComissaoPorKg(formatPurchaseCommissionRate(commissionData.rate));
    comissaoAlteradaManualmente.current = commissionData.rate > 0 && commissionData.rate !== getDefaultPurchaseCommissionRate(c.produto);
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
      .eq("id", id)
      .eq("empresa_id", empresaId);

    await carregarCompras(empresaId);
  }

  const calculoComissao = calculatePurchaseCommission({ product: produto, quantity: kilos, rate: comissaoPorKg });
  const filtrosAplicados = { ...activeFilters, startDate: filterDraft.startDate, endDate: filterDraft.endDate };
  const comprasVisiveis = filterPurchaseRecords(compras, filtrosAplicados).filter((item) => String(item.empresa_id) === String(empresaId));
  const pesoTotal = comprasVisiveis.reduce((total, c) => total + Number(c.kilos || 0), 0);
  const comissaoTotal = comprasVisiveis.reduce((total, c) => total + getPurchaseCommissionData(c).commission, 0);

  function limparFiltros() {
    setFilterDraft(EMPTY_PURCHASE_FILTERS);
    setActiveFilters(EMPTY_PURCHASE_FILTERS);
    setReportMessage("");
  }

  function aplicarDatasAutomaticamente(filters) {
    setActiveFilters((current) => ({ ...current, startDate: filters.startDate, endDate: filters.endDate }));
    setReportMessage("");
  }

  function gerarRelatorio() {
    if (comprasVisiveis.length === 0) {
      setReportMessage("Nenhuma compra encontrada no período selecionado");
      return;
    }
    setReportMessage("");
    generatePurchasesReport({ records: comprasVisiveis, companyName, issuedBy, period: describePeriod(filtrosAplicados.startDate, filtrosAplicados.endDate) });
  }

  return <div className="ops-page">
    <ModuleHeader eyebrow="Materiais e operações" title="Compras" description="Controle operacional de aquisições e comissões." actionLabel="Nova Compra" onAction={() => { setEditandoId(null); setFornecedor(""); setProduto(""); setKilos(""); setComissaoPorKg(""); comissaoAlteradaManualmente.current = false; setModalAberto(true); }} />
    <PurchaseReportControls filters={filterDraft} onChange={setFilterDraft} onDateChange={aplicarDatasAutomaticamente} onApply={() => { setActiveFilters(filterDraft); setReportMessage(""); }} onClear={limparFiltros} onGenerate={gerarRelatorio} />
    {(reportMessage || comprasVisiveis.length === 0) && <div className="ops-feedback ops-feedback--error" role="alert"><span>Nenhuma compra encontrada no período selecionado</span></div>}
    <MetricGrid items={[
      { label: "Compras do mês", value: comprasVisiveis.length, detail: "registros filtrados", icon: "▥" },
      { label: "Peso comprado", value: `${pesoTotal.toLocaleString("pt-BR")} kg`, detail: "volume total", icon: "⚖", tone: "green" },
      { label: "Valor total", value: "—", detail: "não informado neste fluxo", icon: "R$", tone: "amber" },
      { label: "Custo médio", value: "—", detail: "sem custo unitário", icon: "÷" },
      { label: "Quantidade", value: comprasVisiveis.length, detail: `R$ ${comissaoTotal.toFixed(2)} em comissões`, icon: "#" },
    ]} />
    <section className="ops-panel"><div className="ops-panel__header"><h2>Registro de compras</h2><span>{comprasVisiveis.length} resultado(s)</span></div>
      {comprasVisiveis.length === 0 ? <EmptyState /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Data</th><th>Fornecedor</th><th>Produto</th><th>Peso</th><th>Valor</th><th>Custo unitário</th><th>Comissão</th><th>Responsável</th><th>Ações</th></tr></thead><tbody>{comprasVisiveis.map((c) => { const commissionData = getPurchaseCommissionData(c); return <tr key={c.id}><td>{formatarData(c.data_compra)}</td><td><strong>{c.fornecedor || "-"}</strong></td><td>{c.produto || "-"}</td><td>{Number(c.kilos || 0).toLocaleString("pt-BR")} kg</td><td>—</td><td>—</td><td>{commissionData.rate > 0 ? <><strong>R$ {commissionData.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>R$ {formatPurchaseCommissionRate(commissionData.rate)}/kg</small></> : "—"}</td><td>—</td><td><ActionButtons onEdit={() => editarCompra(c)} onDelete={() => excluirCompra(c.id)} /></td></tr>; })}</tbody></table></div>}
    </section>
    {modalAberto && <OperationModal title={editandoId ? "Editar compra" : "Nova compra"} editing={Boolean(editandoId)} onClose={() => setModalAberto(false)} onSubmit={salvarCompra} submitLabel={editandoId ? "Atualizar" : "Salvar"} disabled={!empresaId}>
      <label className="ops-field"><span>Data</span><input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} /></label>
      <label className="ops-field"><span>Fornecedor</span><input placeholder="Fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} /></label>
      <label className="ops-field"><span>Produto</span><input placeholder="Produto (sucata, limalha ou cavaco)" value={produto} onChange={(e) => alterarProduto(e.target.value)} /></label>
      <label className="ops-field"><span>Kilos</span><input type="number" placeholder="Kilos" value={kilos} onChange={(e) => setKilos(e.target.value)} /></label>
      <label className="ops-field"><span>Tipo de comissão</span><input value="Por kg" readOnly /></label>
      <label className="ops-field"><span>Comissão por kg (R$)</span><input type="text" inputMode="decimal" placeholder="Informe a comissão" value={comissaoPorKg} onChange={(e) => { comissaoAlteradaManualmente.current = true; setComissaoPorKg(e.target.value); }} /></label>
      <button type="button" onClick={usarComissaoPadrao} disabled={!getDefaultPurchaseCommissionRate(produto)}>Usar comissão padrão</button>
      <div className="ops-preview"><strong>Regra:</strong> {calculoComissao.rate > 0 ? `R$ ${formatPurchaseCommissionRate(calculoComissao.rate)}/kg` : "—"} · <strong>Valor total da comissão:</strong> {calculoComissao.rate > 0 ? `R$ ${calculoComissao.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</div>
    </OperationModal>}
  </div>;
}
