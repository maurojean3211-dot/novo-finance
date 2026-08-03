import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { ActionButtons, EmptyState, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import PurchaseReportControls from "./components/operations/PurchaseReportControls";
import { calculatePurchaseCommission, formatPurchaseCommissionRate, getDefaultPurchaseCommissionRate, getPurchaseCommissionData } from "./services/commissionEngine";
import { formatarData } from "./utils";
import { describePeriod, EMPTY_PURCHASE_FILTERS, filterPurchaseRecords, generatePurchasesReport } from "./services/reportPdf.service";

export default function ComprasUsuario({ empresaId, userId, companyName = "Cunha Finance", issuedBy = "Não informado" }) {
  const hoje = new Date();

  const dataHoje = `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1
  ).padStart(2, "0")}-${String(
    hoje.getDate()
  ).padStart(2, "0")}`;

  const [compras, setCompras] = useState([]);

  const [fornecedor, setFornecedor] =
    useState("");

  const [produto, setProduto] =
    useState("");

  const [quantidade, setQuantidade] =
    useState("");

  const [tipo, setTipo] =
    useState("UN");

  const [valor, setValor] =
    useState("");

  const [comissaoPorKg, setComissaoPorKg] = useState("");
  const comissaoAlteradaManualmente = useRef(false);

  const [dataCompra, setDataCompra] =
    useState(dataHoje);

  const [editandoId, setEditandoId] =
    useState(null);

  const [filterDraft, setFilterDraft] = useState(EMPTY_PURCHASE_FILTERS);
  const [activeFilters, setActiveFilters] = useState(EMPTY_PURCHASE_FILTERS);
  const [reportMessage, setReportMessage] = useState("");

  const [modalAberto, setModalAberto] =
    useState(false);

  useEffect(() => {
    if (!empresaId) return undefined;
    // A carga é adiada para preservar o ciclo de montagem do componente legado.
    // eslint-disable-next-line react-hooks/immutability
    const timer = window.setTimeout(() => carregarCompras(empresaId), 0);
    return () => window.clearTimeout(timer);
  }, [empresaId]);

  async function carregarCompras(empId) {
    const { data, error } =
      await supabase
        .from("compras")
        .select("*")
        .eq("empresa_id", empId)
        .order("data_compra", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        });

    if (!error) {
      setCompras(data || []);
    }
  }

  async function salvarCompra() {
    if (!empresaId)
      return alert(
        "Empresa não carregada"
      );

    if (!fornecedor.trim())
      return alert(
        "Informe o fornecedor"
      );

    if (!produto.trim())
      return alert(
        "Informe o produto"
      );

    if (!quantidade)
      return alert(
        "Informe a quantidade"
      );

    const calculoComissao = calculatePurchaseCommission({ product: produto, quantity: quantidade, unit: tipo, rate: comissaoPorKg });

    const payload = {
      fornecedor,
      produto,
      kilos: Number(quantidade),
      valor: Number(valor),
      comissao: calculoComissao.commission,
      data_compra: dataCompra,
    };

    let error = null;

    if (editandoId) {
      const res = await supabase
        .from("compras")
        .update(payload)
        .eq("id", editandoId)
        .eq("empresa_id", empresaId);

      error = res.error;
    } else {
      const res = await supabase
        .from("compras")
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
        ? "Compra atualizada!"
        : "Compra salva!"
    );

    limpar();
    setModalAberto(false);

    carregarCompras(empresaId);
  }

  function limpar() {
    setFornecedor("");
    setProduto("");
    setQuantidade("");
    setTipo("UN");
    setValor("");
    setComissaoPorKg("");
    comissaoAlteradaManualmente.current = false;
    setDataCompra(dataHoje);
    setEditandoId(null);
  }

  function editarCompra(c) {
    setEditandoId(c.id);
    setFornecedor(c.fornecedor || "");
    setProduto(c.produto || "");
    setQuantidade(c.kilos || "");
    setTipo("UN");
    setValor(c.valor || "");
    const commissionData = getPurchaseCommissionData(c);
    setComissaoPorKg(formatPurchaseCommissionRate(commissionData.rate));
    comissaoAlteradaManualmente.current = commissionData.rate > 0 && commissionData.rate !== getDefaultPurchaseCommissionRate(c.produto);
    setDataCompra(
      String(c.data_compra).slice(0, 10)
    );
    setModalAberto(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirCompra(id) {
    if (
      !window.confirm(
        "Excluir compra?"
      )
    )
      return;

    await supabase
      .from("compras")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    carregarCompras(empresaId);
  }

  const filtrosAplicados = { ...activeFilters, startDate: filterDraft.startDate, endDate: filterDraft.endDate };
  const comprasFiltradas = filterPurchaseRecords(compras, filtrosAplicados).filter((item) => String(item.empresa_id) === String(empresaId));

  const totalQuantidade = comprasFiltradas.reduce(
    (total, compra) => total + Number(compra.kilos || 0),
    0
  );

  const totalValor = comprasFiltradas.reduce(
    (total, compra) => total + Number(compra.valor || 0),
    0
  );

  const totalComissao = comprasFiltradas.reduce((total, compra) => total + getPurchaseCommissionData(compra).commission, 0);

  const calculoComissao = calculatePurchaseCommission({ product: produto, quantity: quantidade, unit: tipo, rate: comissaoPorKg });

  function alterarProduto(value) {
    const novaRegra = getDefaultPurchaseCommissionRate(value);
    setProduto(value);
    if (!comissaoAlteradaManualmente.current) setComissaoPorKg(formatPurchaseCommissionRate(novaRegra));
  }

  function usarComissaoPadrao() {
    comissaoAlteradaManualmente.current = false;
    setComissaoPorKg(formatPurchaseCommissionRate(getDefaultPurchaseCommissionRate(produto)));
  }

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
    if (comprasFiltradas.length === 0) {
      setReportMessage("Nenhuma compra encontrada no período selecionado");
      return;
    }
    setReportMessage("");
    generatePurchasesReport({ records: comprasFiltradas, companyName, issuedBy, period: describePeriod(filtrosAplicados.startDate, filtrosAplicados.endDate) });
  }

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1680,
        margin: "0 auto",
        color: "#fff",
      }}
    >
      <ModuleHeader
        eyebrow="Materiais e operações"
        title="Compras"
        description="Controle operacional de aquisições, volumes e valores."
        actionLabel="Nova Compra"
        onAction={() => {
          limpar();
          setModalAberto(true);
        }}
      />

      <PurchaseReportControls filters={filterDraft} onChange={setFilterDraft} onDateChange={aplicarDatasAutomaticamente} onApply={() => { setActiveFilters(filterDraft); setReportMessage(""); }} onClear={limparFiltros} onGenerate={gerarRelatorio} />
      {(reportMessage || comprasFiltradas.length === 0) && <div className="ops-feedback ops-feedback--error" role="alert"><span>Nenhuma compra encontrada no período selecionado</span></div>}

      <MetricGrid items={[
        { label: "Compras do mês", value: comprasFiltradas.length, detail: "registros filtrados", icon: "▥" },
        { label: "Peso comprado", value: totalQuantidade.toLocaleString("pt-BR"), detail: "quantidade total", icon: "⚖", tone: "green" },
        { label: "Valor total", value: `R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, detail: "valor acumulado", icon: "R$", tone: "amber" },
        { label: "Custo médio", value: "—", detail: "sem cálculo no fluxo atual", icon: "÷" },
        { label: "Quantidade", value: comprasFiltradas.length, detail: `R$ ${totalComissao.toFixed(2)} em comissões`, icon: "#" },
      ]} />

      {modalAberto && <OperationModal
        title={editandoId ? "Editar compra" : "Nova compra"}
        editing={Boolean(editandoId)}
        onClose={() => setModalAberto(false)}
        onSubmit={salvarCompra}
        submitLabel={editandoId ? "Atualizar Compra" : "Salvar Compra"}
      >

      <input
        type="date"
        value={dataCompra}
        onChange={(e) =>
          setDataCompra(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <p
        style={{
          color: "#cbd5e1",
        }}
      >
        📅{" "}
        {formatarData(dataCompra)}
      </p>

      <br />

      <input
        placeholder="Fornecedor"
        value={fornecedor}
        onChange={(e) =>
          setFornecedor(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <br />
      <br />

      <input
        placeholder="Produto"
        value={produto}
        onChange={(e) => alterarProduto(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <br />
      <br />

      <input
        type="number"
        placeholder="Quantidade"
        value={quantidade}
        onChange={(e) =>
          setQuantidade(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <br />
      <br />

      <label className="ops-field"><span>Tipo de comissão</span><input value="Por kg" readOnly /></label>
      <label className="ops-field"><span>Comissão por kg (R$)</span><input type="text" inputMode="decimal" placeholder="Informe a comissão" value={comissaoPorKg} onChange={(e) => { comissaoAlteradaManualmente.current = true; setComissaoPorKg(e.target.value); }} /></label>
      <button type="button" onClick={usarComissaoPadrao} disabled={!getDefaultPurchaseCommissionRate(produto)}>Usar comissão padrão</button>

      <div className="ops-preview"><strong>Regra:</strong> {calculoComissao.rate > 0 ? `R$ ${formatPurchaseCommissionRate(calculoComissao.rate)}/kg` : "—"} · <strong>Valor total da comissão:</strong> {calculoComissao.rate > 0 ? `R$ ${calculoComissao.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</div>

      <br />
      <br />

      <select
        value={tipo}
        onChange={(e) =>
          setTipo(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      >
        <option value="UN">
          Unidade
        </option>
        <option value="KG">
          Kilo
        </option>
      </select>

      <br />
      <br />

      <input
        type="number"
        placeholder="Valor"
        value={valor}
        onChange={(e) =>
          setValor(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <br />
      <br />

      <button
        onClick={salvarCompra}
        style={{
          display: "none",
          width: "100%",
          padding: 12,
          background:
            editandoId
              ? "orange"
              : "green",
          color: "#fff",
          border: "none",
          borderRadius: 8,
        }}
      >
        {editandoId
          ? "Atualizar Compra"
          : "Salvar Compra"}
      </button>

      </OperationModal>}

      <hr />


      <hr />

      {comprasFiltradas.length === 0 ? <EmptyState /> : <section className="ops-panel"><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Data</th><th>Fornecedor</th><th>Produto</th><th>Peso</th><th>Valor</th><th>Comissão</th><th>Ações</th></tr></thead><tbody>{comprasFiltradas.map((c) => { const commissionData = getPurchaseCommissionData(c); return <tr key={c.id}><td>{formatarData(c.data_compra)}</td><td><strong>{c.fornecedor || "—"}</strong></td><td>{c.produto || "—"}</td><td>{Number(c.kilos || 0).toLocaleString("pt-BR")} kg</td><td>R$ {Number(c.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>{commissionData.rate > 0 ? <><strong>R$ {commissionData.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>R$ {formatPurchaseCommissionRate(commissionData.rate)}/kg</small></> : "—"}</td><td><ActionButtons onEdit={() => editarCompra(c)} onDelete={() => excluirCompra(c.id)} /></td></tr>; })}</tbody></table></div></section>}
    </div>
  );
}
