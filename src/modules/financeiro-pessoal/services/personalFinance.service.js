import { supabase } from "../../../supabase";

export async function loadPersonalFinanceServerTime() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sessão indisponível para consultar a data do servidor.");
  const response = await fetch(`${supabase.supabaseUrl}/rest/v1/despesas?select=id&limit=1`, {
    cache: "no-store",
    headers: { apikey: supabase.supabaseKey, Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Não foi possível consultar a data do servidor.");
  const serverDate = response.headers.get("date");
  if (!serverDate) throw new Error("O servidor não informou uma referência de data.");
  return new Date(serverDate);
}

function requireScope(empresaId) {
  if (!empresaId) throw new Error("Empresa ativa não identificada.");
}

function personalTransactionPayload(values, tipo, empresaId, userId) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  return {
    empresa_id: empresaId,
    proprietario_id: userId,
    tipo,
    descricao: values.descricao.trim(),
    valor: Number(values.valor),
    data_lancamento: values.data,
    categoria: values.categoria.trim() || null,
    idempotency_key: values.idempotency_key || null,
  };
}

export async function savePersonalTransaction({ empresaId, userId, tipo, id, values }) {
  const payload = personalTransactionPayload(values, tipo, empresaId, userId);
  const query = id
    ? supabase.from("despesas").update(payload).eq("id", id).eq("empresa_id", empresaId).eq("proprietario_id", userId).eq("tipo", tipo)
    : supabase.from("despesas").insert([payload]);
  const { error } = await query;
  if (error && !(error.code === "23505" && !id)) throw error;
}

export async function deletePersonalTransaction({ empresaId, userId, tipo, id }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  const { error } = await supabase.from("despesas").delete().eq("id", id).eq("empresa_id", empresaId).eq("proprietario_id", userId).eq("tipo", tipo);
  if (error) throw error;
}

export async function savePersonalFixedExpense({ empresaId, userId, id, values }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  const payload = {
    empresa_id: empresaId,
    proprietario_id: userId,
    escopo: "Pessoal",
    descricao: values.descricao.trim(),
    contraparte: values.contraparte?.trim() || null,
    categoria_id: values.categoria_id || null,
    classificacao: values.classificacao || "Fixa",
    valor_previsto: Number(values.valor),
    dia_vencimento: Number(values.dia_vencimento),
    frequencia: values.frequencia,
    data_inicio: values.data_base,
    data_fim: values.data_fim || null,
    ativo: values.ativo,
    observacoes: values.observacoes?.trim() || null,
    forma_pagamento: values.forma_pagamento?.trim() || null,
    conta_financeira: values.conta_financeira?.trim() || null,
    gerar_automaticamente: values.gerar_automaticamente !== false,
  };
  const query = id
    ? supabase.from("financeiro_recorrencias").update(payload).eq("id", id).eq("empresa_id", empresaId).eq("proprietario_id", userId)
    : supabase.from("financeiro_recorrencias").insert([payload]);
  const { error } = await query;
  if (error) throw error;
}

export async function deletePersonalFixedExpense({ empresaId, userId, id }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  const { error } = await supabase.from("financeiro_recorrencias").update({ ativo: false }).eq("id", id).eq("empresa_id", empresaId).eq("proprietario_id", userId).eq("escopo", "Pessoal");
  if (error) throw error;
}

export async function generatePersonalRecurringTitles({ competencia, recurrenceId = null }) {
  const { data, error } = await supabase.rpc("gerar_titulos_recorrentes", { p_competencia: `${competencia}-01`, p_recorrencia_id: recurrenceId });
  if (error) throw error;
  return data || [];
}

export async function savePersonalCategory({ empresaId, userId, values }) {
  const { data, error } = await supabase.from("financeiro_categorias").insert({ empresa_id: empresaId, proprietario_id: userId, nome: values.nome.trim(), classificacao: values.classificacao }).select().single();
  if (error) throw error;
  return data;
}

export async function savePersonalBudget({ empresaId, userId, values }) {
  const { error } = await supabase.from("orcamentos_pessoais_mensais").upsert({ empresa_id: empresaId, proprietario_id: userId, categoria_id: values.categoria_id, competencia: `${values.competencia}-01`, valor_previsto: Number(values.valor_previsto) }, { onConflict: "empresa_id,proprietario_id,categoria_id,competencia" });
  if (error) throw error;
}

export async function savePersonalPayable({ empresaId, userId, id, values }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  const payload = { empresa_id: empresaId, proprietario_id: userId, descricao: values.descricao.trim(), fornecedor: values.fornecedor?.trim() || null, valor: Number(values.valor), vencimento: values.vencimento || null, categoria: values.categoria?.trim() || null, observacoes: values.observacoes?.trim() || null, document_idempotency_key: values.idempotency_key || null };
  if (!id) payload.status = "Pendente";
  const query = id
    ? supabase.from("contas_pagar_pessoais").update(payload).eq("id", id).eq("empresa_id", empresaId).eq("proprietario_id", userId)
    : supabase.from("contas_pagar_pessoais").insert([payload]);
  const { error } = await query;
  if (error && !(error.code === "23505" && !id)) throw error;
}

export async function registerPersonalPayablePayment({ empresaId, userId, payableId, type, paidValue, paidAt, notes, idempotencyKey }) {
  requireScope(empresaId);
  if (!userId || !payableId || !idempotencyKey) throw new Error("Escopo ou chave idempotente não identificados.");
  const { data, error } = await supabase.rpc("registrar_pagamento_conta_pessoal", {
    p_conta_pagar_pessoal_id: payableId,
    p_empresa_id: empresaId,
    p_proprietario_id: userId,
    p_tipo: type,
    p_valor_pago: Number(paidValue),
    p_pago_em: paidAt,
    p_observacoes: notes?.trim() || null,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function reversePersonalPayablePayment({ empresaId, userId, eventId, reversedAt, notes, idempotencyKey }) {
  requireScope(empresaId);
  if (!userId || !eventId || !idempotencyKey) throw new Error("Escopo ou chave idempotente não identificados.");
  const { data, error } = await supabase.rpc("estornar_pagamento_conta_pessoal", {
    p_evento_pagamento_id: eventId,
    p_empresa_id: empresaId,
    p_proprietario_id: userId,
    p_estornado_em: reversedAt,
    p_observacoes: notes?.trim() || null,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function createPersonalInstallmentPlan({ empresaId, userId, idempotencyKey, values }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  if (!idempotencyKey) throw new Error("Chave idempotente não identificada.");
  const { data, error } = await supabase.rpc("criar_parcelamento_conta_pessoal", {
    p_empresa_id: empresaId,
    p_proprietario_id: userId,
    p_idempotency_key: idempotencyKey,
    p_descricao: values.descricao.trim(),
    p_fornecedor: values.fornecedor?.trim() || null,
    p_valor_total: Number(values.valor),
    p_quantidade: Number(values.quantidadeParcelas),
    p_valor_primeira_parcela: values.valorPrimeiraParcela ? Number(values.valorPrimeiraParcela) : null,
    p_primeiro_vencimento: values.vencimento,
    p_periodicidade: "Mensal",
    p_categoria: values.categoria?.trim() || null,
    p_observacoes: values.observacoes?.trim() || null,
  });
  if (error) throw error;
  return data || [];
}

export async function createPersonalInstallmentPlanWithDownPayment({ empresaId, userId, idempotencyKey, values }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  if (!idempotencyKey) throw new Error("Chave idempotente não identificada.");
  const { data, error } = await supabase.rpc("criar_parcelamento_conta_pessoal_com_entrada", {
    p_empresa_id: empresaId,
    p_proprietario_id: userId,
    p_idempotency_key: idempotencyKey,
    p_descricao: values.descricao.trim(),
    p_fornecedor: values.fornecedor?.trim() || null,
    p_valor_total: Number(values.valor),
    p_valor_entrada: Number(values.valorEntrada),
    p_data_entrada: values.dataEntrada,
    p_quantidade: Number(values.quantidadeParcelas),
    p_primeiro_vencimento: values.vencimento,
    p_periodicidade: "Mensal",
    p_categoria: values.categoria?.trim() || null,
    p_observacoes: values.observacoes?.trim() || null,
  });
  if (error) throw error;
  return data || [];
}

export async function deletePersonalPayable({ empresaId, userId, id }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  const { error } = await supabase.from("contas_pagar_pessoais").delete().eq("id", id).eq("empresa_id", empresaId).eq("proprietario_id", userId);
  if (error) throw error;
}

export async function updatePersonalPayableStatus({ empresaId, userId, id, status }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  if (!["Pendente", "Cancelada"].includes(status)) throw new Error("Pagamentos e estornos devem usar exclusivamente as RPCs de eventos.");
  const { error } = await supabase.from("contas_pagar_pessoais").update({ status }).eq("id", id).eq("empresa_id", empresaId).eq("proprietario_id", userId);
  if (error) throw error;
}

export async function loadPersonalInstallmentGroupMetadata({ empresaId, userId, groupId }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  if (!groupId) throw new Error("Grupo de parcelamento não identificado.");
  const { data, error } = await supabase
    .from("contas_pagar_pessoais_grupo_metadados")
    .select("grupo_parcelamento_id, empresa_id, proprietario_id, nome_amigavel, descricao, fornecedor, categoria, observacoes, versao, criado_em, atualizado_em")
    .eq("grupo_parcelamento_id", groupId)
    .eq("empresa_id", empresaId)
    .eq("proprietario_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadPersonalInstallmentGroupMetadataList({ empresaId, userId }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  const { data, error } = await supabase
    .from("contas_pagar_pessoais_grupo_metadados")
    .select("grupo_parcelamento_id, empresa_id, proprietario_id, nome_amigavel, descricao, fornecedor, categoria, observacoes, versao")
    .eq("empresa_id", empresaId)
    .eq("proprietario_id", userId);
  if (error) throw error;
  return data || [];
}

export async function savePersonalInstallmentGroupMetadata({ empresaId, userId, groupId, expectedVersion, values }) {
  requireScope(empresaId);
  if (!userId) throw new Error("Proprietário não identificado.");
  if (!groupId) throw new Error("Grupo de parcelamento não identificado.");
  const { data, error } = await supabase.rpc("atualizar_metadados_grupo_conta_pessoal", {
    p_grupo: groupId,
    p_empresa: empresaId,
    p_proprietario: userId,
    p_versao_esperada: expectedVersion,
    p_nome: values.nome_amigavel?.trim() || null,
    p_descricao: values.descricao.trim(),
    p_fornecedor: values.fornecedor?.trim() || null,
    p_categoria: values.categoria?.trim() || null,
    p_observacoes: values.observacoes?.trim() || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
