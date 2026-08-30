import { supabase } from "../../../supabase";
import { clearOperationKey, getOperationKey } from "../../../utils";

const company = (empresaId) => String(empresaId);

export async function loadFinanceServerTime() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sessão indisponível para consultar a data do servidor.");
  const response = await fetch(`${supabase.supabaseUrl}/rest/v1/financeiro_titulos?select=id&limit=1`, {
    cache: "no-store",
    headers: { apikey: supabase.supabaseKey, Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Não foi possível consultar a data do servidor.");
  const serverDate = response.headers.get("date");
  if (!serverDate) throw new Error("O servidor não informou uma referência de data.");
  return new Date(serverDate);
}

export async function loadCorporateFinance(empresaId) {
  const empresa = company(empresaId);
  const [titles, settlements, reconciliations, history, purchaseInstallments, sales, budgets, recurrences] = await Promise.all([
    supabase.from("financeiro_titulos").select("*").eq("empresa_id", empresa).order("vencimento"),
    supabase.from("financeiro_baixas").select("*").eq("empresa_id", empresa).order("created_at", { ascending: false }),
    supabase.from("financeiro_conciliacoes").select("*").eq("empresa_id", empresa).order("created_at", { ascending: false }),
    supabase.from("financeiro_historico").select("*").eq("empresa_id", empresa).order("created_at", { ascending: false }).limit(100),
    supabase.from("pedido_compra_parcelas").select("*,pedidos_compra!inner(id,numero,status,fornecedor_id,fornecedor_snapshot,observacoes)").eq("empresa_id", empresa).eq("status", "Pendente"),
    supabase.from("vendas").select("id,empresa_id,cliente_nome,produto,valor,data_venda").eq("empresa_id", empresa).order("data_venda", { ascending: false }).limit(100),
    supabase.from("orcamentos").select("id,numero,status,cliente_id,cliente_snapshot,valor_final,data,validade").eq("empresa_id", empresa).eq("status", "Aprovado").order("data", { ascending: false }).limit(100),
    supabase.from("financeiro_recorrencias").select("*").eq("empresa_id", empresa).eq("escopo", "Empresarial").order("descricao"),
  ]);
  const core = [titles, settlements, reconciliations, history];
  const coreError = core.find((result) => result.error)?.error;
  if (coreError) throw coreError;
  return {
    titles: titles.data || [], settlements: settlements.data || [], reconciliations: reconciliations.data || [], history: history.data || [],
    purchaseInstallments: purchaseInstallments.error ? [] : purchaseInstallments.data || [],
    sales: sales.error ? [] : sales.data || [], budgets: budgets.error ? [] : budgets.data || [], recurrences: recurrences.error ? [] : recurrences.data || [],
    unavailable: { purchases: purchaseInstallments.error?.message, sales: sales.error?.message, budgets: budgets.error?.message },
  };
}

export async function saveCorporateRecurrence({ empresaId, values }) {
  const payload = { empresa_id: company(empresaId), proprietario_id: null, escopo: "Empresarial", descricao: values.description.trim(), contraparte: values.party?.trim() || null, classificacao: values.classification, valor_previsto: Number(values.value), dia_vencimento: Number(values.dueDay), data_inicio: values.startDate, data_fim: values.endDate || null, frequencia: "Mensal", ativo: true, centro_custo: values.costCenter?.trim() || null, observacoes: values.notes?.trim() || null, gerar_automaticamente: true };
  const { error } = await supabase.from("financeiro_recorrencias").insert(payload);
  if (error) throw error;
}

export async function generateCorporateRecurringTitles({ competencia }) {
  const { data, error } = await supabase.rpc("gerar_titulos_recorrentes", { p_competencia: `${competencia}-01`, p_recorrencia_id: null });
  if (error) throw error;
  return (data || []).filter((item) => item.escopo === "Empresarial");
}

export async function registerTitle({ empresaId, title }) {
  if (title.id) return updateTitle({ empresaId, title });
  const { data, error } = await supabase.rpc("registrar_titulo_financeiro", {
    p_empresa_id: company(empresaId), p_tipo: title.type, p_contraparte_nome: title.party,
    p_origem: title.origin, p_origem_id: title.originId || null, p_referencia: title.reference || null,
    p_descricao: title.description, p_vencimento: title.dueDate, p_valor: Number(title.value),
    p_contraparte_id: title.partyId ? String(title.partyId) : null, p_categoria: title.category || null,
    p_centro_custo: title.costCenter || null, p_observacoes: title.notes || null,
  });
  if (error) throw error;
  return data;
}

export async function settleTitle({ empresaId, titleId, settlement }) {
  const operationScope = `baixa:${empresaId}:${titleId}`;
  const { data, error } = await supabase.rpc("baixar_titulo_financeiro", {
    p_titulo_id: titleId, p_empresa_id: company(empresaId), p_valor: Number(settlement.value),
    p_data: settlement.date, p_forma: settlement.method || null, p_conta: settlement.account || null,
    p_observacoes: settlement.notes || null,
    p_idempotency_key: getOperationKey(operationScope),
  });
  if (error) throw error;
  clearOperationKey(operationScope);
  return data;
}

export async function updateTitle({ empresaId, title }) {
  const { error } = await supabase.rpc("editar_titulo_financeiro", { p_titulo_id: title.id, p_empresa_id: company(empresaId),
    p_contraparte_nome: title.party, p_referencia: title.reference || null, p_descricao: title.description,
    p_categoria: title.category || null, p_centro_custo: title.costCenter || null, p_vencimento: title.dueDate,
    p_observacoes: title.notes || null });
  if (error) throw error;
}

export async function reverseSettlement({ empresaId, settlementId, notes }) {
  const { error } = await supabase.rpc("estornar_baixa_financeira", {
    p_baixa_id: settlementId, p_empresa_id: company(empresaId), p_data: new Date().toISOString().slice(0, 10), p_observacoes: notes || null,
  });
  if (error) throw error;
}

export async function saveReconciliation({ empresaId, reconciliation }) {
  const operationScope = `conciliacao:${empresaId}:${reconciliation.titleId}`;
  const { error } = await supabase.rpc("conciliar_titulo_financeiro", { p_titulo_id: reconciliation.titleId,
    p_empresa_id: company(empresaId), p_conta: reconciliation.account, p_data: reconciliation.date,
    p_valor: Number(reconciliation.value), p_status: reconciliation.status, p_observacoes: reconciliation.notes || null,
    p_idempotency_key: getOperationKey(operationScope) });
  if (error) throw error;
  clearOperationKey(operationScope);
}

export function purchaseToTitle(installment) {
  const order = installment.pedidos_compra || {};
  return { type: "Pagar", partyId: order.fornecedor_id, party: order.fornecedor_snapshot?.nome || "Fornecedor",
    origin: "Compra", originId: `parcela:${installment.id}`, reference: `${order.numero || "Pedido"}/${installment.numero}`,
    description: `Parcela ${installment.numero} do pedido ${order.numero || "de compra"}`, dueDate: installment.vencimento,
    value: installment.valor, category: "Compras", notes: order.observacoes || "" };
}

export function saleToTitle(sale, dueDate) {
  return { type: "Receber", party: sale.cliente_nome || "Cliente", origin: "Venda", originId: String(sale.id),
    reference: `VENDA-${sale.id}`, description: `Venda de ${sale.produto || "produto"}`, dueDate,
    value: sale.valor, category: "Vendas" };
}

export function budgetToTitle(budget, dueDate) {
  return { type: "Receber", partyId: budget.cliente_id, party: budget.cliente_snapshot?.nome || "Cliente",
    origin: "Orçamento", originId: String(budget.id), reference: budget.numero,
    description: `Orçamento aprovado ${budget.numero}`, dueDate, value: budget.valor_final, category: "Vendas" };
}
