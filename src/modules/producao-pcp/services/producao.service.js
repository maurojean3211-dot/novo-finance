import { supabase } from "../../../supabase";

export const PRODUCTION_STATUSES = ["Rascunho","Planejada","Aguardando material","Liberada","Em produção","Pausada","Concluída","Cancelada"];
export const RESOURCE_TYPES = ["Máquina","Forno","Serra","Prensa","Linha","Equipe","Posto de trabalho","Outro recurso"];
export const OPERATION_EVENT_TRANSITIONS = { Pendente: ["Liberação","Cancelamento"], Liberada: ["Início","Cancelamento"], "Em execução": ["Pausa","Conclusão"], Pausada: ["Retomada","Conclusão","Cancelamento"], Concluída: [], Cancelada: [] };
export const PLANNING_HORIZON_DAYS = 30;
const n = (value) => Number(value || 0);
const company = (value) => String(value);

export async function loadProduction(empresaId) {
  const id = company(empresaId);
  const [orders, stock, movements, sales, budgets, resources, allocations, unavailability, purchaseOrders] = await Promise.all([
    supabase.from("ordens_producao").select("*,ordem_producao_materiais(*),ordem_producao_apontamentos(*),ordem_producao_historico(*),ordem_producao_custos(*)").eq("empresa_id", id).order("created_at", { ascending: false }),
    supabase.from("estoque").select("*").eq("empresa_id", id).order("descricao"),
    supabase.from("estoque_movimentacoes").select("*").eq("empresa_id", id).eq("origem", "Produção").order("created_at", { ascending: false }).limit(300),
    supabase.from("vendas").select("id,cliente_nome,produto,kilos,valor,data_venda").eq("empresa_id", id).order("data_venda", { ascending: false }).limit(100),
    supabase.from("orcamentos").select("id,numero,status,cliente_id,cliente_snapshot,validade,valor_final,orcamento_itens(*)").eq("empresa_id", id).eq("status", "Aprovado").order("created_at", { ascending: false }).limit(100),
    supabase.from("recursos_producao").select("*").eq("empresa_id", id).order("nome"),
    supabase.from("ordem_producao_recursos").select("*,ordem_producao_operacao_apontamentos(*),ordem_producao_operacao_resultados(*)").eq("empresa_id", id).order("sequencia"),
    supabase.from("recurso_producao_indisponibilidades").select("*").eq("empresa_id", id).order("inicio"),
    supabase.from("pedidos_compra").select("id,numero,status,data,previsao,fornecedor_id,fornecedor_snapshot,observacoes,valor_total,pedido_compra_itens(id,estoque_id,quantidade,quantidade_recebida,unidade,valor_unitario,dados_catalogo),pedido_compra_cotacoes(id,fornecedor_id,fornecedor_snapshot,prazo_dias,created_at),pedido_compra_followups(*)").eq("empresa_id", id).order("created_at", { ascending: false }).limit(200),
  ]);
  const coreError = [orders, stock, movements, resources, allocations, unavailability].find((item) => item.error)?.error;
  if (coreError) throw coreError;
  return { orders: orders.data || [], stock: stock.data || [], movements: movements.data || [], sales: sales.error ? [] : sales.data || [], budgets: budgets.error ? [] : budgets.data || [], resources: resources.data || [], allocations: allocations.data || [], unavailability: unavailability.data || [], purchaseOrders: purchaseOrders.error ? [] : purchaseOrders.data || [], unavailable: { sales: sales.error?.message, budgets: budgets.error?.message, purchaseOrders: purchaseOrders.error?.message } };
}

export async function createOrder({ empresaId, userId, order }) {
  const payload = { empresa_id: company(empresaId), user_id: userId, numero_op: order.number || `OP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`,
    cliente_id: order.clientId ? String(order.clientId) : null, cliente_nome: order.client || null, venda_id: order.saleId ? String(order.saleId) : null,
    orcamento_id: order.budgetId || null, produto_id: order.productId ? String(order.productId) : null, produto: order.product,
    descricao: order.description || null, liga: order.alloy || null, tempera: order.temper || null, dimensao: order.dimension || null,
    quantidade_planejada: n(order.quantity), unidade: order.unit || "kg", peso_planejado: n(order.weight),
    data_prevista_inicio: order.start || null, data_prevista_fim: order.end || null, prioridade: order.priority || "Média",
    responsavel: order.responsible || null, observacoes: order.notes || null };
  const { data, error } = await supabase.from("ordens_producao").insert(payload).select("*").single();
  if (error) throw error;
  const { error: historyError } = await supabase.from("ordem_producao_historico").insert({ ordem_id: data.id, empresa_id: company(empresaId), user_id: userId, tipo: "Criação", descricao: order.saleId ? "OP criada a partir de venda após confirmação humana." : order.budgetId ? "OP criada a partir de orçamento aprovado após confirmação humana." : "OP criada manualmente." });
  if (historyError) throw historyError;
  return data.id;
}

export async function addMaterial({ empresaId, userId, orderId, stock, quantity, notes }) {
  const { data, error } = await supabase.from("ordem_producao_materiais").insert({ ordem_id: orderId, empresa_id: company(empresaId), estoque_id: stock.id, produto_id: stock.produto_id, material: `${stock.codigo} · ${stock.descricao}`, quantidade_prevista: n(quantity), unidade: stock.unidade, observacoes: notes || null, necessidade_compra: n(quantity) > n(stock.estoque_disponivel) }).select("*").single();
  if (error) throw error;
  await addHistory({ empresaId, userId, orderId, type: "Planejamento", description: `Material ${data.material} adicionado ao planejamento.` });
}

export async function addHistory({ empresaId, userId, orderId, type, description, data = {} }) {
  const { error } = await supabase.from("ordem_producao_historico").insert({ ordem_id: orderId, empresa_id: company(empresaId), user_id: userId, tipo: type, descricao: description, dados: data });
  if (error) throw error;
}

export async function changeOrderStatus({ empresaId, userId, order, status }) {
  if (["Concluída","Cancelada"].includes(status) && (order.ordem_producao_materiais || []).some((item) => n(item.quantidade_reservada) > 0)) {
    throw new Error("Libere ou consuma todas as reservas antes de concluir ou cancelar a OP.");
  }
  const patch = { status, updated_at: new Date().toISOString() };
  if (status === "Em produção" && !order.data_inicio_real) patch.data_inicio_real = new Date().toISOString();
  if (status === "Concluída") patch.data_fim_real = new Date().toISOString();
  const { error } = await supabase.from("ordens_producao").update(patch).eq("id", order.id).eq("empresa_id", company(empresaId)).select("id").single();
  if (error) throw error;
  const types = { Planejada: "Planejamento", "Aguardando material": "Planejamento", Liberada: "Programação", "Em produção": order.status === "Pausada" ? "Retomada" : "Início", Pausada: "Pausa", Concluída: "Conclusão", Cancelada: "Cancelamento" };
  const type = types[status] || "Edição";
  if (["Início","Pausa","Retomada","Conclusão"].includes(type)) {
    const { error: pointError } = await supabase.from("ordem_producao_apontamentos").insert({ ordem_id: order.id, empresa_id: company(empresaId), user_id: userId, tipo: type, observacoes: `Status alterado para ${status}.` });
    if (pointError) throw pointError;
  }
  await addHistory({ empresaId, userId, orderId: order.id, type, description: `Status alterado para ${status}.` });
}

export async function changeOrderPriority({ empresaId, userId, order, priority }) {
  const { error } = await supabase.from("ordens_producao").update({ prioridade: priority, updated_at: new Date().toISOString() }).eq("id", order.id).eq("empresa_id", company(empresaId)).select("id").single();
  if (error) throw error;
  await addHistory({ empresaId, userId, orderId: order.id, type: "Edição", description: `Prioridade alterada manualmente de ${order.prioridade} para ${priority}.`, data: { anterior: order.prioridade, atual: priority } });
}

export async function recordProduction({ empresaId, userId, order, entry }) {
  const loss = entry.type === "Perda"; const quantity = n(entry.quantity); const weight = n(entry.weight);
  const patch = loss ? { quantidade_perdida: n(order.quantidade_perdida) + quantity, peso_perdido: n(order.peso_perdido) + weight } : { quantidade_produzida: n(order.quantidade_produzida) + quantity, peso_produzido: n(order.peso_produzido) + weight };
  patch.updated_at = new Date().toISOString();
  const { error: pointError } = await supabase.from("ordem_producao_apontamentos").insert({ ordem_id: order.id, empresa_id: company(empresaId), user_id: userId, tipo: loss ? "Perda" : "Produção", quantidade: quantity, peso: weight, motivo_perda: loss ? entry.reason : null, ocorrido_em: entry.occurredAt || new Date().toISOString(), observacoes: entry.notes || null }); if (pointError) throw pointError;
  const { error } = await supabase.from("ordens_producao").update(patch).eq("id", order.id).eq("empresa_id", company(empresaId)).select("id").single();
  if (error) throw new Error(`Apontamento registrado, mas não foi possível atualizar o progresso da OP: ${error.message}`);
  await addHistory({ empresaId, userId, orderId: order.id, type: loss ? "Perda" : "Edição", description: loss ? `Perda registrada: ${entry.reason}.` : "Produção realizada apontada.", data: { quantity, weight } });
}

async function rpc(name, args) { const { error } = await supabase.rpc(name, args); if (error) throw error; }
export const reserveMaterial = ({ empresaId, materialId, quantity }) => rpc("reservar_material_producao", { p_material_id: materialId, p_empresa_id: company(empresaId), p_quantidade: n(quantity) });
export const consumeMaterial = ({ empresaId, materialId, quantity }) => rpc("consumir_material_producao", { p_material_id: materialId, p_empresa_id: company(empresaId), p_quantidade: n(quantity) });
export const releaseMaterial = ({ empresaId, materialId, quantity }) => rpc("liberar_material_producao", { p_material_id: materialId, p_empresa_id: company(empresaId), p_quantidade: n(quantity) });
export const reverseConsumption = ({ empresaId, materialId, movementId }) => rpc("reverter_consumo_producao", { p_material_id: materialId, p_empresa_id: company(empresaId), p_movimentacao_id: movementId });
export const finishProduct = ({ empresaId, orderId, stockId, quantity }) => rpc("entrar_produto_acabado", { p_ordem_id: orderId, p_empresa_id: company(empresaId), p_estoque_id: stockId, p_quantidade: n(quantity) });

export async function preparePurchaseNeed({ empresaId, userId, orderId, materialId }) {
  const { error } = await supabase.from("ordem_producao_materiais").update({ necessidade_compra: true, updated_at: new Date().toISOString() }).eq("id", materialId).eq("empresa_id", company(empresaId)); if (error) throw error;
  await addHistory({ empresaId, userId, orderId, type: "Compra", description: "Necessidade de compra preparada para revisão em Compras Inteligentes.", data: { materialId } });
}

export async function resolvePurchaseNeed({ empresaId, userId, orderId, materialId }) {
  const { error } = await supabase.from("ordem_producao_materiais").update({ necessidade_compra: false, updated_at: new Date().toISOString() }).eq("id", materialId).eq("ordem_id", orderId).eq("empresa_id", company(empresaId)).select("id").single();
  if (error) throw error;
  await addHistory({ empresaId, userId, orderId, type: "Compra", description: "Necessidade de compra tratada após confirmação humana em Compras Inteligentes.", data: { materialId } });
}

const purchaseNeedKey = (empresaId) => `cunha:pcp:purchase-needs:${company(empresaId)}`;
const readPurchaseNeeds = (empresaId) => { try { return JSON.parse(sessionStorage.getItem(purchaseNeedKey(empresaId)) || "[]").filter((item) => company(item.empresaId) === company(empresaId)); } catch { return []; } };

async function addMrpHistoryOnce({ empresaId, userId, orderId, mrpKey, description }) {
  const { data, error } = await supabase.from("ordem_producao_historico").select("id").eq("ordem_id", orderId).eq("empresa_id", company(empresaId)).contains("dados", { mrpKey, description }).limit(1);
  if (error) throw error;
  if (!data?.length) await addHistory({ empresaId, userId, orderId, type: "Compra", description, data: { mrpKey, description } });
}

export async function prepareConsolidatedPurchaseNeed({ empresaId, userId, requirement, updating = false }) {
  const materialIds = requirement.demands.map((item) => item.materialId);
  if (!materialIds.length || requirement.shortage <= 0) throw new Error("A necessidade consolidada não possui quantidade faltante válida.");
  const { data, error } = await supabase.from("ordem_producao_materiais").update({ necessidade_compra: true, updated_at: new Date().toISOString() }).eq("empresa_id", company(empresaId)).in("id", materialIds).select("id,ordem_id");
  if (error) throw error;
  if ((data || []).length !== materialIds.length) throw new Error("Nem todos os materiais da necessidade foram atualizados. Revise o isolamento da empresa e tente novamente.");
  const orderIds = [...new Set(requirement.demands.map((item) => item.orderId))];
  for (const orderId of orderIds) {
    await addMrpHistoryOnce({ empresaId, userId, orderId, mrpKey: requirement.key, description: "Necessidade consolidada de material identificada pelo MRP." });
    await addMrpHistoryOnce({ empresaId, userId, orderId, mrpKey: requirement.key, description: updating ? "Contexto da necessidade de material atualizado manualmente para Compras Inteligentes." : "Necessidade consolidada encaminhada manualmente para Compras Inteligentes." });
  }
}

export async function resolveConsolidatedPurchaseNeed({ empresaId, userId, need }) {
  const materialIds = need.materialIds?.length ? need.materialIds : [need.materialId];
  const { data, error } = await supabase.from("ordem_producao_materiais").update({ necessidade_compra: false, updated_at: new Date().toISOString() }).eq("empresa_id", company(empresaId)).in("id", materialIds).select("id,ordem_id");
  if (error) throw error;
  if ((data || []).length !== materialIds.length) throw new Error("A necessidade não foi sincronizada integralmente com as OPs.");
  for (const orderId of [...new Set((data || []).map((item) => item.ordem_id))]) await addMrpHistoryOnce({ empresaId, userId, orderId, mrpKey: need.key || need.materialId, description: "Necessidade consolidada tratada após confirmação humana em Compras Inteligentes." });
}

export async function saveAdditionalCost({ empresaId, userId, orderId, cost }) {
  const payload = { ordem_id: orderId, empresa_id: company(empresaId), user_id: userId, tipo: cost.type, descricao: String(cost.description || "").trim(), valor: n(cost.value), data: cost.date, observacoes: String(cost.notes || "").trim() || null, updated_at: new Date().toISOString() };
  if (!payload.descricao || payload.valor <= 0 || !payload.data) throw new Error("Descrição, valor positivo e data são obrigatórios.");
  const query = cost.id ? supabase.from("ordem_producao_custos").update(payload).eq("id", cost.id).eq("ordem_id", orderId).eq("empresa_id", company(empresaId)) : supabase.from("ordem_producao_custos").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  await addHistory({ empresaId, userId, orderId, type: "Edição", description: cost.id ? `Custo adicional alterado: ${payload.descricao}.` : `Custo adicional incluído: ${payload.descricao}.`, data: { custoId: data.id, tipo: payload.tipo, valor: payload.valor } });
  return data.id;
}

export async function saveProductionResource({ empresaId, userId, resource }) {
  const days = String(resource.workDays || "").split(",").map((item) => Number(item.trim())).filter((item) => item >= 0 && item <= 6);
  const payload = { empresa_id: company(empresaId), user_id: userId, nome: String(resource.name || "").trim(), tipo: resource.type, descricao: String(resource.description || "").trim() || null, capacidade_nominal: resource.capacity === "" ? null : n(resource.capacity), unidade_capacidade: String(resource.capacityUnit || "").trim() || null, horas_disponiveis_dia: resource.hoursPerDay === "" ? null : n(resource.hoursPerDay), dias_trabalho: [...new Set(days)], ativo: resource.active !== false, observacoes: String(resource.notes || "").trim() || null, updated_at: new Date().toISOString() };
  if (!payload.nome) throw new Error("Nome do recurso é obrigatório.");
  if (payload.capacidade_nominal !== null && payload.capacidade_nominal <= 0) throw new Error("Capacidade nominal deve ser positiva quando informada.");
  if (payload.horas_disponiveis_dia !== null && (payload.horas_disponiveis_dia <= 0 || payload.horas_disponiveis_dia > 24)) throw new Error("Horas disponíveis devem estar entre 0 e 24.");
  const query = resource.id ? supabase.from("recursos_producao").update(payload).eq("id", resource.id).eq("empresa_id", company(empresaId)) : supabase.from("recursos_producao").insert(payload);
  const { data, error } = await query.select("id").single(); if (error) throw error; return data.id;
}

export async function saveResourceAllocation({ empresaId, userId, orderId, allocation }) {
  const payload = { ordem_id: orderId, recurso_id: allocation.resourceId, empresa_id: company(empresaId), user_id: userId, quantidade_planejada: n(allocation.quantity), tempo_unitario_horas: allocation.unitHours === "" ? null : n(allocation.unitHours), tempo_total_horas: allocation.totalHours === "" ? null : n(allocation.totalHours), sequencia: Math.max(1, Math.trunc(n(allocation.sequence) || 1)), observacoes: String(allocation.notes || "").trim() || null, updated_at: new Date().toISOString() };
  if (!payload.recurso_id || payload.quantidade_planejada <= 0) throw new Error("Recurso e quantidade planejada são obrigatórios.");
  if (payload.tempo_unitario_horas !== null && payload.tempo_unitario_horas <= 0) throw new Error("Tempo por unidade deve ser positivo.");
  if (payload.tempo_total_horas !== null && payload.tempo_total_horas <= 0) throw new Error("Tempo total deve ser positivo.");
  const query = allocation.id ? supabase.from("ordem_producao_recursos").update(payload).eq("id", allocation.id).eq("ordem_id", orderId).eq("empresa_id", company(empresaId)) : supabase.from("ordem_producao_recursos").insert(payload);
  const { data, error } = await query.select("id").single(); if (error) throw error;
  await addHistory({ empresaId, userId, orderId, type: "Planejamento", description: allocation.id ? "Planejamento de recurso alterado manualmente." : "Recurso produtivo alocado manualmente.", data: { alocacaoId: data.id, recursoId: payload.recurso_id, sequencia: payload.sequencia, tempoUnitario: payload.tempo_unitario_horas, tempoTotal: payload.tempo_total_horas } });
  return data.id;
}

export async function saveResourceUnavailability({ empresaId, userId, entry }) {
  const payload = { recurso_id: entry.resourceId, empresa_id: company(empresaId), user_id: userId, tipo: entry.type, inicio: entry.start, fim: entry.end, observacoes: String(entry.notes || "").trim() || null };
  if (!payload.recurso_id || !payload.inicio || !payload.fim || payload.fim < payload.inicio) throw new Error("Recurso e período válido são obrigatórios.");
  const { data, error } = await supabase.from("recurso_producao_indisponibilidades").insert(payload).select("id").single(); if (error) throw error; return data.id;
}

export async function saveProductionQueue({ empresaId, resourceId, allocationIds }) {
  if (!resourceId || !allocationIds.length || new Set(allocationIds).size !== allocationIds.length) throw new Error("A fila informada é inválida.");
  const { error } = await supabase.rpc("reordenar_fila_producao", {
    p_empresa_id: company(empresaId), p_recurso_id: resourceId, p_alocacoes: allocationIds,
  });
  if (error) throw error;
}

export async function recordProductionOperationEvent({ empresaId, allocationId, event }) {
  if (!allocationId || !event.idempotencyKey || !event.type || !event.occurredAt) throw new Error("Operação, evento e data são obrigatórios.");
  const { error } = await supabase.rpc("registrar_evento_operacao_producao", {
    p_empresa_id: company(empresaId), p_alocacao_id: allocationId, p_evento: event.type,
    p_ocorrido_em: event.occurredAt, p_observacoes: String(event.notes || "").trim() || null,
    p_idempotency_key: event.idempotencyKey,
  });
  if (error) throw error;
}

export async function recordProductionOperationResult({ empresaId, allocationId, result }) {
  const good = n(result.good); const rejected = n(result.rejected); const operator = String(result.operator || "").trim();
  if (!allocationId || !result.idempotencyKey || !result.occurredAt || good < 0 || rejected < 0 || good + rejected <= 0 || !operator) throw new Error("Operação, operador, data e quantidade positiva são obrigatórios.");
  if (rejected > 0 && !result.lossReason) throw new Error("Informe o motivo do refugo.");
  const { error } = await supabase.rpc("apontar_resultado_operacao_producao", {
    p_empresa_id: company(empresaId), p_alocacao_id: allocationId, p_quantidade_boa: good,
    p_quantidade_refugada: rejected, p_operador: operator, p_motivo_refugo: result.lossReason || null,
    p_ocorrido_em: result.occurredAt, p_observacoes: String(result.notes || "").trim() || null,
    p_idempotency_key: result.idempotencyKey,
  });
  if (error) throw error;
}

const dayKey = (date) => date.toISOString().slice(0, 10);
const allocationHours = (item) => n(item.tempo_total_horas) > 0 ? n(item.tempo_total_horas) : n(item.tempo_unitario_horas) > 0 && n(item.quantidade_planejada) > 0 ? n(item.tempo_unitario_horas) * n(item.quantidade_planejada) : null;
export function operationPerformance(allocation, currentTime = new Date()) {
  const results = allocation.ordem_producao_operacao_resultados || []; const good = results.reduce((sum, item) => sum + n(item.quantidade_boa), 0); const rejected = results.reduce((sum, item) => sum + n(item.quantidade_refugada), 0); const planned = n(allocation.quantidade_planejada); const events = [...(allocation.ordem_producao_operacao_apontamentos || [])].sort((a, b) => String(a.ocorrido_em).localeCompare(String(b.ocorrido_em)));
  let activeStart = null; let workedMilliseconds = 0; events.forEach((event) => { const occurred = new Date(event.ocorrido_em).getTime(); if (["Início","Retomada"].includes(event.tipo) && activeStart === null) activeStart = occurred; if (["Pausa","Conclusão","Cancelamento"].includes(event.tipo) && activeStart !== null) { workedMilliseconds += Math.max(0, occurred - activeStart); activeStart = null; } }); if (activeStart !== null) workedMilliseconds += Math.max(0, currentTime.getTime() - activeStart);
  const actualHours = workedMilliseconds / 3600000; const plannedHours = allocationHours(allocation); return { good, rejected, pending: Math.max(0, planned - good - rejected), total: good + rejected, actualHours, plannedHours, timeDifference: plannedHours === null ? null : actualHours - plannedHours };
}
export function buildOperationalMonitoring({ resourcePlans, plans }) {
  return resourcePlans.map((resourcePlan) => {
    const operations = resourcePlan.queue.map((allocation) => { const performance = operationPerformance(allocation); const plan = (plans.get(allocation.order.id) || []).find((item) => item.id === allocation.id); return { ...allocation, performance, plan }; });
    const waiting = operations.filter((item) => ["Pendente","Liberada"].includes(item.status_operacao || "Pendente")).length; const executing = operations.filter((item) => item.status_operacao === "Em execução").length; const paused = operations.filter((item) => item.status_operacao === "Pausada").length; const completed = operations.filter((item) => item.status_operacao === "Concluída").length; const knownPlanned = operations.filter((item) => item.performance.plannedHours !== null); const started = operations.filter((item) => item.inicio_real); const good = operations.reduce((sum, item) => sum + item.performance.good, 0); const rejected = operations.reduce((sum, item) => sum + item.performance.rejected, 0); const pending = operations.reduce((sum, item) => sum + item.performance.pending, 0); const actualHours = started.reduce((sum, item) => sum + item.performance.actualHours, 0); const plannedHours = knownPlanned.reduce((sum, item) => sum + item.performance.plannedHours, 0); const overruns = operations.filter((item) => item.performance.timeDifference !== null && item.performance.timeDifference > 0 && ["Em execução","Pausada","Concluída"].includes(item.status_operacao)).length; const highRisk = operations.filter((item) => item.plan?.risk === "Alto").length; const operators = [...new Set(operations.flatMap((item) => (item.ordem_producao_operacao_resultados || []).map((result) => result.operador)).filter(Boolean))]; const reasons = [];
    if (resourcePlan.classification === "Sobrecarregado") reasons.push("capacidade planejada acima de 100%"); if (highRisk) reasons.push(`${highRisk} operação(ões) com risco alto`); if (paused) reasons.push(`${paused} operação(ões) pausada(s)`); if (overruns) reasons.push(`${overruns} operação(ões) acima do tempo previsto`);
    const classification = resourcePlan.classification === "Sobrecarregado" || highRisk > 0 && paused > 0 ? "Crítico" : highRisk || paused || overruns ? "Atenção" : resourcePlan.utilization === null && !started.length ? "Dados insuficientes" : "Normal";
    return { resource: resourcePlan.resource, capacityClassification: resourcePlan.classification, utilization: resourcePlan.utilization, availableHours: resourcePlan.availableHours, committedHours: resourcePlan.committedHours, knownCommittedHours: resourcePlan.knownCommittedHours, waiting, executing, paused, completed, good, rejected, pending, yieldRate: good + rejected > 0 ? good / (good + rejected) * 100 : null, actualHours, plannedHours: knownPlanned.length ? plannedHours : null, timeCoveragePartial: knownPlanned.length < operations.length, overruns, highRisk, operators, classification, reasons, operations };
  }).sort((a, b) => ({ Crítico: 0, Atenção: 1, "Dados insuficientes": 2, Normal: 3 }[a.classification] - ({ Crítico: 0, Atenção: 1, "Dados insuficientes": 2, Normal: 3 }[b.classification])) || String(a.resource.nome).localeCompare(String(b.resource.nome), "pt-BR"));
}
const isBlocked = (date, entries) => entries.some((item) => dayKey(date) >= String(item.inicio).slice(0, 10) && dayKey(date) <= String(item.fim).slice(0, 10));
const plannedDate = (value) => /^\d{4}-\d{2}-\d{2}/.test(String(value || "")) ? String(value).slice(0, 10) : null;
const horizonLoadStatus = (order, horizonStart, horizonEnd) => {
  const start = plannedDate(order?.data_prevista_inicio); const end = plannedDate(order?.data_prevista_fim);
  if ((start && start > horizonEnd) || (end && end < horizonStart)) return "outside";
  if (start && end && start >= horizonStart && end <= horizonEnd) return "inside";
  return start || end ? "partial" : "unknown";
};
export function projectWorkingHours(startValue, hours, resource, unavailable = []) {
  const daily = n(resource?.horas_disponiveis_dia); const days = resource?.dias_trabalho || [];
  if (!(hours >= 0) || daily <= 0 || !days.length) return null;
  const date = new Date(`${startValue || dayKey(new Date())}T12:00:00`); let remaining = hours; let guard = 0;
  while ((!days.includes(date.getDay()) || isBlocked(date, unavailable)) && guard < 730) { date.setDate(date.getDate() + 1); guard += 1; }
  while (remaining > 0 && guard < 730) { if (days.includes(date.getDay()) && !isBlocked(date, unavailable)) remaining -= daily; if (remaining > 0) date.setDate(date.getDate() + 1); guard += 1; }
  return remaining > 0 ? null : dayKey(date);
}

export function buildCapacityPlan({ orders, resources, allocations, unavailability, stock = [] }) {
  const today = dayKey(new Date()); const horizonEndDate = new Date(`${today}T12:00:00`); horizonEndDate.setDate(horizonEndDate.getDate() + PLANNING_HORIZON_DAYS - 1); const horizonEnd = dayKey(horizonEndDate);
  const activeResources = resources.filter((item) => item.ativo); const plans = new Map(); const resourcePlans = activeResources.map((resource) => {
    const unavailable = unavailability.filter((item) => item.recurso_id === resource.id); const days = resource.dias_trabalho || []; let availableHours = 0;
    for (let cursor = new Date(`${today}T12:00:00`); dayKey(cursor) <= horizonEnd; cursor.setDate(cursor.getDate() + 1)) if (days.includes(cursor.getDay()) && !isBlocked(cursor, unavailable)) availableHours += n(resource.horas_disponiveis_dia);
    const queue = allocations.filter((item) => item.recurso_id === resource.id).map((item) => { const order = orders.find((candidate) => candidate.id === item.ordem_id); return { ...item, order, hours: allocationHours(item), horizonStatus: horizonLoadStatus(order, today, horizonEnd) }; }).filter((item) => item.order && !["Concluída","Cancelada"].includes(item.order.status)).sort((a, b) => n(a.sequencia) - n(b.sequencia) || String(a.order.data_prevista_inicio || "9999").localeCompare(String(b.order.data_prevista_inicio || "9999")));
    let projectionHours = 0; let scheduleKnown = true; queue.forEach((item, index) => { const before = projectionHours; if (item.hours === null) scheduleKnown = false; else projectionHours += item.hours; const start = !scheduleKnown || item.hours === null ? null : projectWorkingHours(item.order.data_prevista_inicio || today, before, resource, unavailable); const end = item.hours === null || start === null ? null : projectWorkingHours(start, item.hours, resource, unavailable); const materials = item.order.ordem_producao_materiais || []; const materialBlocked = materials.some((material) => { const stockItem = stock.find((candidate) => candidate.id === material.estoque_id); return n(material.quantidade_prevista) - n(material.quantidade_reservada) - n(material.quantidade_consumida) > n(stockItem?.estoque_disponivel); }); const materialState = !materials.length ? null : materialBlocked ? "Faltante" : "Disponível"; const plannedEnd = item.order.data_prevista_fim; const differenceDays = end && plannedEnd ? Math.ceil((new Date(`${end}T12:00:00`) - new Date(`${plannedEnd}T12:00:00`)) / 86400000) : null; plans.set(item.order.id, [...(plans.get(item.order.id) || []), { ...item, position: index + 1, projectedStart: start, projectedEnd: end, differenceDays, materialState, risk: end === null ? null : materialBlocked || differenceDays > 2 ? "Alto" : differenceDays > 0 ? "Atenção" : "Baixo" }]); });
    const horizonQueue = queue.filter((item) => item.horizonStatus !== "outside"); const knownCommittedHours = horizonQueue.filter((item) => item.horizonStatus === "inside" && item.hours !== null).reduce((sum, item) => sum + item.hours, 0); const unclassifiableLoad = horizonQueue.filter((item) => item.horizonStatus !== "inside" || item.hours === null).length; const committed = unclassifiableLoad ? null : knownCommittedHours; const utilization = availableHours > 0 && committed !== null ? committed / availableHours * 100 : null; const classification = utilization === null ? "Dados insuficientes" : utilization > 100 ? "Sobrecarregado" : utilization >= 80 ? "Alta carga" : utilization >= 30 ? "Normal" : "Livre";
    return { resource, queue, availableHours: availableHours || null, committedHours: committed, knownCommittedHours, unclassifiableLoad, utilization, classification };
  });
  const loadPartial = resourcePlans.some((item) => item.committedHours === null); const totalKnownCommitted = resourcePlans.length ? resourcePlans.reduce((sum, item) => sum + item.knownCommittedHours, 0) : null;
  return { plans, resourcePlans, loadPartial, totalKnownCommitted, totalAvailable: resourcePlans.every((item) => item.availableHours !== null) && resourcePlans.length ? resourcePlans.reduce((sum, item) => sum + item.availableHours, 0) : null, totalCommitted: !loadPartial ? totalKnownCommitted : null };
}

const priorityWeight = { Baixa: 1, Média: 2, Alta: 3, Urgente: 4 };
export function purchaseItemMatchesRequirement(catalogData = {}, requirementKey, relatedOrderIds) {
  const linkedByLegacyFormat = relatedOrderIds.has(String(catalogData.pcpOrderId || ""));
  const linkedByMrpFormat = catalogData.mrpKey === requirementKey && Array.isArray(catalogData.pcpOrderIds) && catalogData.pcpOrderIds.some((orderId) => relatedOrderIds.has(String(orderId)));
  return linkedByLegacyFormat || linkedByMrpFormat;
}
export function buildMaterialRequirements({ orders, stock, plans = new Map(), purchaseOrders = [] }) {
  const openOrders = orders.filter((order) => !["Concluída","Cancelada"].includes(order.status)); const stockById = new Map(stock.map((item) => [item.id, item])); const grouped = new Map();
  openOrders.forEach((order) => {
    const orderPlans = plans.get(order.id) || []; const projectedDates = orderPlans.map((item) => item.projectedStart).filter(Boolean).sort(); const reliableProjectedDate = orderPlans.length > 0 && projectedDates.length === orderPlans.length ? projectedDates[0] : null; const needDate = reliableProjectedDate || plannedDate(order.data_prevista_inicio);
    (order.ordem_producao_materiais || []).forEach((material) => {
      const demand = Math.max(0, n(material.quantidade_prevista) - n(material.quantidade_consumida)); if (demand <= 0) return;
      const key = material.estoque_id || `material:${String(material.material).trim().toLowerCase()}`; const current = grouped.get(key) || { key, stockId: material.estoque_id || null, productId: material.produto_id || null, material: material.material, unit: material.unidade, demands: [] };
      current.demands.push({ materialId: material.id, orderId: order.id, orderNumber: order.numero_op, orderStatus: order.status, client: order.cliente_nome || null, priority: order.prioridade, date: needDate, demand, reserved: n(material.quantidade_reservada), forwarded: Boolean(material.necessidade_compra), notes: material.observacoes || null }); grouped.set(key, current);
    });
  });
  return [...grouped.values()].map((item) => {
    const stockItem = item.stockId ? stockById.get(item.stockId) : null; const demand = item.demands.reduce((sum, row) => sum + row.demand, 0); const reserved = item.demands.reduce((sum, row) => sum + row.reserved, 0); const uncoveredDemand = Math.max(0, demand - reserved); const available = stockItem ? n(stockItem.estoque_disponivel) : null; const projected = available === null ? null : available - uncoveredDemand; const shortage = projected === null ? null : Math.max(0, -projected); const dates = item.demands.map((row) => row.date).filter(Boolean).sort(); const firstNeedDate = dates[0] || null; const today = dayKey(new Date()); const sevenDays = new Date(`${today}T12:00:00`); sevenDays.setDate(sevenDays.getDate() + 7); const criticalDate = dayKey(sevenDays); const risk = shortage === null ? "Dados insuficientes" : shortage <= 0 ? "Sem risco" : !firstNeedDate ? "Dados insuficientes" : firstNeedDate <= criticalDate ? "Crítico" : "Atenção"; const highestPriority = item.demands.reduce((highest, row) => priorityWeight[row.priority] > priorityWeight[highest] ? row.priority : highest, "Baixa"); const unitCost = stockItem && n(stockItem.custo_unitario) > 0 ? n(stockItem.custo_unitario) : null;
    const relatedOrderIds = new Set(item.demands.map((row) => String(row.orderId))); const linkedOrder = purchaseOrders.find((order) => (order.pedido_compra_itens || []).some((row) => purchaseItemMatchesRequirement(row.dados_catalogo, item.key, relatedOrderIds)));
    return { ...item, code: stockItem?.codigo || "", currentStock: stockItem ? n(stockItem.estoque_atual) : null, available, demand, reserved, uncoveredDemand, projected, shortage, firstNeedDate, risk, highestPriority, unitCost, estimatedValue: shortage !== null && unitCost !== null ? shortage * unitCost : null, forwarded: item.demands.some((row) => row.forwarded), purchaseStatus: linkedOrder ? `${linkedOrder.numero} · ${linkedOrder.status}` : null, orderNumbers: [...new Set(item.demands.map((row) => row.orderNumber))], clients: [...new Set(item.demands.map((row) => row.client).filter(Boolean))] };
  }).sort((a, b) => { const weight = { Crítico: 0, Atenção: 1, "Dados insuficientes": 2, "Sem risco": 3 }; return weight[a.risk] - weight[b.risk] || String(a.firstNeedDate || "9999").localeCompare(String(b.firstNeedDate || "9999")); });
}

export function queueConsolidatedPurchaseNeed({ empresaId, requirement }) {
  const key = purchaseNeedKey(empresaId); const current = readPurchaseNeeds(empresaId); const existing = current.find((item) => item.key === requirement.key || (requirement.stockId && item.stockId === requirement.stockId)); const orderIds = [...new Set(requirement.demands.map((item) => item.orderId))]; const materialIds = requirement.demands.map((item) => item.materialId); const need = { key: requirement.key, empresaId: company(empresaId), materialId: materialIds[0], materialIds, orderId: orderIds[0], orderIds, orderNumber: requirement.orderNumbers.join(", "), orderNumbers: requirement.orderNumbers, client: requirement.clients.join(", "), clients: requirement.clients, priority: requirement.highestPriority, stockId: requirement.stockId, productId: requirement.productId, code: requirement.code, description: requirement.material, quantity: requirement.shortage, unit: requirement.unit, needDate: requirement.firstNeedDate, context: `MRP consolidado de ${requirement.orderNumbers.length} OP(s): ${requirement.orderNumbers.join(", ")}. Clientes: ${requirement.clients.join(", ") || "não informados"}. Prioridade ${requirement.highestPriority}. Necessidade em ${requirement.firstNeedDate || "data não definida"}.`, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  sessionStorage.setItem(key, JSON.stringify([...current.filter((item) => item !== existing && item.key !== requirement.key && (!requirement.stockId || item.stockId !== requirement.stockId)), need])); return { need, updated: Boolean(existing) };
}

export async function saveSupplyFollowup({ empresaId, userId, orderId, followup }) {
  const payload = { pedido_id: orderId, empresa_id: company(empresaId), user_id: userId, idempotency_key: followup.idempotencyKey, data_prometida: followup.promisedDate || null, prazo_informado: String(followup.informedTerm || "").trim() || null, responsavel_contato: String(followup.contact || "").trim() || null, observacoes: String(followup.notes || "").trim() || null, contatado_em: followup.contactedAt };
  if (!payload.idempotency_key || !payload.contatado_em) throw new Error("Identificador e data do follow-up são obrigatórios.");
  if (!payload.data_prometida && !payload.prazo_informado && !payload.responsavel_contato && !payload.observacoes) throw new Error("Informe ao menos um dado real do contato com o fornecedor.");
  const { data, error } = await supabase.from("pedido_compra_followups").insert(payload).select("id").single(); if (error) throw error; return data.id;
}

const supplyStatus = (orders, forwarded, fulfillment) => {
  if (!orders.length) return forwarded ? "Encaminhada para Compras" : "Identificada";
  if (orders.every((order) => order.status === "Cancelado")) return "Cancelada";
  const activeOrders = orders.filter((order) => order.status !== "Cancelado");
  if (fulfillment === "Atendido") return "Atendida"; if (fulfillment === "Parcial") return "Parcialmente atendida";
  if (activeOrders.some((order) => order.status === "Comprado" && (order.previsao || (order.pedido_compra_followups || []).length))) return "Aguardando recebimento";
  if (activeOrders.some((order) => order.status === "Comprado")) return "Pedido realizado manualmente";
  if (activeOrders.some((order) => order.status === "Aprovado")) return "Pedido preparado";
  if (activeOrders.some((order) => order.status === "Em cotação")) return "Em cotação";
  if (activeOrders.some((order) => order.status === "Solicitado")) return "Em análise";
  return "Pedido preparado";
};

export function buildSupplyFollowup({ requirements, purchaseOrders }) {
  return requirements.map((requirement) => {
    const relatedOrderIds = new Set(requirement.demands.map((row) => String(row.orderId))); const linkedOrders = purchaseOrders.map((order) => { const items = (order.pedido_compra_itens || []).filter((item) => purchaseItemMatchesRequirement(item.dados_catalogo, requirement.key, relatedOrderIds)).map((item) => { const ordered = Math.max(0, n(item.quantidade)); const received = Math.min(ordered, Math.max(0, n(item.quantidade_recebida))); return { id: item.id, ordered, received, pending: Math.max(0, ordered - received), unitPrice: n(item.valor_unitario), unit: item.unidade }; }); return items.length ? { ...order, items } : null; }).filter(Boolean);
    const activeOrders = linkedOrders.filter((order) => order.status !== "Cancelado"); const items = activeOrders.flatMap((order) => order.items); const ordered = items.reduce((sum, item) => sum + item.ordered, 0); const received = items.reduce((sum, item) => sum + item.received, 0); const pending = Math.max(0, ordered - received); const remainingNeed = requirement.shortage === null || requirement.shortage === undefined ? null : Math.max(0, n(requirement.shortage)); const neededQuantity = remainingNeed === null ? null : remainingNeed + received; const fulfillment = remainingNeed === null ? "Dados insuficientes" : received <= 0 ? "Não atendido" : remainingNeed > 0 ? "Parcial" : "Atendido"; const followups = activeOrders.flatMap((order) => (order.pedido_compra_followups || []).map((entry) => ({ ...entry, orderId: order.id }))).sort((a, b) => String(b.contatado_em).localeCompare(String(a.contatado_em))); const latestFollowup = followups[0] || null; const promisedDate = followups.find((entry) => entry.data_prometida)?.data_prometida || activeOrders.map((order) => order.previsao).filter(Boolean).sort()[0] || null; const suppliers = [...new Set(activeOrders.map((order) => order.fornecedor_snapshot?.nome).filter(Boolean))]; const status = supplyStatus(linkedOrders, requirement.forwarded, fulfillment); const needDate = requirement.firstNeedDate; const late = Boolean(needDate && promisedDate && promisedDate > needDate); const orderedAfterNeed = activeOrders.some((order) => needDate && order.data > needDate); const knownValueItems = items.filter((item) => item.unitPrice > 0); const pendingValue = knownValueItems.reduce((sum, item) => sum + item.pending * item.unitPrice, 0); const valuePartial = items.some((item) => item.pending > 0 && item.unitPrice <= 0) || remainingNeed === null || remainingNeed > ordered; const blockedOrderIds = [...new Set(requirement.demands.filter((row) => remainingNeed !== null && remainingNeed > 0 && row.orderStatus === "Aguardando material").map((row) => row.orderId))];
    return { ...requirement, linkedOrders, activeOrderCount: activeOrders.length, neededQuantity, ordered, received, pending, remainingNeed, blockedOrderIds, status, latestFollowup, promisedDate, suppliers, late, orderedAfterNeed, pendingValue: knownValueItems.length ? pendingValue : null, valuePartial, fulfillment };
  });
}

export function productionCosts(order, stockById, sale, budget) {
  const materials = (order.ordem_producao_materiais || []).map((material) => {
    const stock = stockById.get(material.estoque_id);
    const unitCost = n(stock?.custo_unitario);
    const plannedQuantity = n(material.quantidade_prevista);
    const consumedQuantity = n(material.quantidade_consumida);
    const hasCost = unitCost > 0;
    return { ...material, unitCost: hasCost ? unitCost : null, plannedQuantity, consumedQuantity, plannedCost: hasCost ? plannedQuantity * unitCost : null, actualCost: hasCost ? consumedQuantity * unitCost : null };
  });
  const missingPlannedCosts = materials.filter((item) => item.plannedQuantity > 0 && item.unitCost === null);
  const missingActualCosts = materials.filter((item) => item.consumedQuantity > 0 && item.unitCost === null);
  const hasMaterials = materials.length > 0;
  const plannedMaterials = !hasMaterials || missingPlannedCosts.length ? null : materials.reduce((sum, item) => sum + n(item.plannedCost), 0);
  const actualMaterials = !hasMaterials || missingActualCosts.length ? null : materials.reduce((sum, item) => sum + n(item.actualCost), 0);
  const additional = (order.ordem_producao_custos || []).reduce((sum, item) => sum + n(item.valor), 0);
  const totalActual = actualMaterials === null ? null : actualMaterials + additional;
  const plannedQuantity = n(order.quantidade_planejada);
  const producedQuantity = n(order.quantidade_produzida);
  const lostQuantity = n(order.quantidade_perdida);
  const progress = plannedQuantity > 0 ? Math.min(100, producedQuantity / plannedQuantity * 100) : null;
  const lossRate = producedQuantity + lostQuantity > 0 ? lostQuantity / (producedQuantity + lostQuantity) * 100 : null;
  const plannedUnit = plannedMaterials !== null && plannedQuantity > 0 ? plannedMaterials / plannedQuantity : null;
  const actualUnit = totalActual !== null && producedQuantity > 0 ? totalActual / producedQuantity : null;
  const difference = plannedMaterials !== null && totalActual !== null ? totalActual - plannedMaterials : null;
  const differencePercent = difference !== null && plannedMaterials > 0 ? difference / plannedMaterials * 100 : null;
  const unitDifference = plannedUnit !== null && actualUnit !== null ? actualUnit - plannedUnit : null;
  const commercialValue = sale ? n(sale.valor) || null : budget ? n(budget.valor_final) || null : null;
  const estimatedMargin = commercialValue !== null && plannedMaterials !== null ? commercialValue - plannedMaterials : null;
  const operationalMargin = commercialValue !== null && totalActual !== null ? commercialValue - totalActual : null;
  return { materials, missingPlannedCosts, missingActualCosts, plannedMaterials, actualMaterials, additional, totalActual, plannedQuantity, producedQuantity, lostQuantity, progress, lossRate, plannedUnit, actualUnit, difference, differencePercent, unitDifference, commercialValue, estimatedMargin, operationalMargin };
}

export function materialAvailability(material, stock) {
  const required = Math.max(0, n(material.quantidade_prevista) - n(material.quantidade_consumida));
  const reserved = n(material.quantidade_reservada);
  const available = n(stock?.estoque_disponivel);
  const shortage = Math.max(0, required - reserved - available);
  return { required, reserved, available, shortage, situation: shortage <= 0 ? "Disponível" : reserved + available > 0 ? "Parcial" : "Indisponível" };
}

export function queuePurchaseNeed({ empresaId, order, material, stock }) {
  const availability = materialAvailability(material, stock);
  const key = `cunha:pcp:purchase-needs:${company(empresaId)}`;
  const current = JSON.parse(sessionStorage.getItem(key) || "[]").filter((item) => item.materialId !== material.id);
  current.push({ empresaId: company(empresaId), materialId: material.id, orderId: order.id, orderNumber: order.numero_op, client: order.cliente_nome || "", priority: order.prioridade, stockId: material.estoque_id, productId: material.produto_id, code: stock?.codigo || "", description: material.material, quantity: availability.shortage, unit: material.unidade, context: `Necessidade da ${order.numero_op}${order.cliente_nome ? ` para ${order.cliente_nome}` : ""}. Prioridade ${order.prioridade}.`, createdAt: new Date().toISOString() });
  sessionStorage.setItem(key, JSON.stringify(current));
  return availability;
}

export function saleDraft(sale) { return { client: sale.cliente_nome || "Cliente", saleId: sale.id, product: sale.produto || "Produto da venda", quantity: sale.kilos || 1, unit: "kg", weight: sale.kilos || 0, start: new Date().toISOString().slice(0,10), end: "", priority: "Média" }; }
export function budgetDraft(budget) { const item = budget.orcamento_itens?.[0] || {}; return { clientId: budget.cliente_id, client: budget.cliente_snapshot?.nome || "Cliente", budgetId: budget.id, productId: item.catalogo_item_id, product: item.produto || `Orçamento ${budget.numero}`, description: item.descricao || "", alloy: item.liga || "", temper: item.tempera || "", dimension: item.dimensao || "", quantity: item.quantidade || 1, unit: item.unidade || "kg", weight: item.peso || 0, start: new Date().toISOString().slice(0,10), end: budget.validade || "", priority: "Média" }; }
