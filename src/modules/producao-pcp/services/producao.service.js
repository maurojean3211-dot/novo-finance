import { supabase } from "../../../supabase";

export const PRODUCTION_STATUSES = ["Rascunho","Planejada","Aguardando material","Liberada","Em produção","Pausada","Concluída","Cancelada"];
const n = (value) => Number(value || 0);
const company = (value) => String(value);

export async function loadProduction(empresaId) {
  const id = company(empresaId);
  const [orders, stock, movements, sales, budgets] = await Promise.all([
    supabase.from("ordens_producao").select("*,ordem_producao_materiais(*),ordem_producao_apontamentos(*),ordem_producao_historico(*)").eq("empresa_id", id).order("created_at", { ascending: false }),
    supabase.from("estoque").select("*").eq("empresa_id", id).order("descricao"),
    supabase.from("estoque_movimentacoes").select("*").eq("empresa_id", id).eq("origem", "Produção").order("created_at", { ascending: false }).limit(300),
    supabase.from("vendas").select("id,cliente_nome,produto,kilos,valor,data_venda").eq("empresa_id", id).order("data_venda", { ascending: false }).limit(100),
    supabase.from("orcamentos").select("id,numero,status,cliente_id,cliente_snapshot,validade,orcamento_itens(*)").eq("empresa_id", id).eq("status", "Aprovado").order("created_at", { ascending: false }).limit(100),
  ]);
  const coreError = [orders, stock, movements].find((item) => item.error)?.error;
  if (coreError) throw coreError;
  return { orders: orders.data || [], stock: stock.data || [], movements: movements.data || [], sales: sales.error ? [] : sales.data || [], budgets: budgets.error ? [] : budgets.data || [], unavailable: { sales: sales.error?.message, budgets: budgets.error?.message } };
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
