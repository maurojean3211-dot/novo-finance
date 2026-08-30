import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../supabase";

function useReadQuery(empresaId, userId, load) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const read = useCallback(async () => {
      if (!empresaId || !userId) {
        setRecords([]); setError(""); setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      const result = await load(empresaId, userId);
      setRecords(result.data || []);
      setError(result.error?.message || "");
      setLoading(false);
  }, [empresaId, userId, load]);

  useEffect(() => {
    const timer = window.setTimeout(() => void read(), 0);
    return () => window.clearTimeout(timer);
  }, [read]);

  return { records, loading, error, reload: read };
}

const readExpenses = (type) => async (empresaId, userId) => supabase
  .from("despesas")
  .select("id, empresa_id, tipo, categoria, descricao, valor, data_lancamento, ativo, proprietario_id, pagamento_evento_id, origem_tipo, estorno_evento_id, estornada_em")
  .eq("empresa_id", empresaId)
  .eq("proprietario_id", userId)
  .eq("tipo", type)
  .order("data_lancamento", { ascending: false });

const readPersonalExpenses = readExpenses("despesa");
const readPersonalIncomes = readExpenses("receita");
const readPersonalFixedExpenses = async (empresaId, userId) => supabase
  .from("financeiro_recorrencias")
  .select("id, empresa_id, proprietario_id, descricao, contraparte, valor_previsto, dia_vencimento, frequencia, data_inicio, data_fim, ativo, observacoes, forma_pagamento, conta_financeira, gerar_automaticamente, classificacao, categoria_id")
  .eq("empresa_id", empresaId)
  .eq("proprietario_id", userId)
  .eq("escopo", "Pessoal")
  .order("dia_vencimento", { ascending: true });

const readPersonalCategories = async (empresaId, userId) => supabase.from("financeiro_categorias").select("*")
  .eq("empresa_id", empresaId).eq("proprietario_id", userId).order("nome");
const readPersonalBudgets = async (empresaId, userId) => supabase.from("orcamentos_pessoais_mensais").select("*")
  .eq("empresa_id", empresaId).eq("proprietario_id", userId).order("competencia", { ascending: false });

const readPersonalPayables = async (empresaId, userId) => supabase
  .from("contas_pagar_pessoais")
  // Compatibilidade temporária até a promoção da migration 20260826165933.
  .select("id, empresa_id, proprietario_id, source_legacy_id, descricao, fornecedor, valor, vencimento, status, categoria, observacoes, criado_em, atualizado_em, grupo_parcelamento_id, parcela_numero, parcelas_total, valor_total_compra, periodicidade, idempotency_key, entrada_id")
  .eq("empresa_id", empresaId)
  .eq("proprietario_id", userId)
  .order("vencimento", { ascending: true });

const readPersonalPaymentEvents = async (empresaId, userId) => supabase
  .from("contas_pagar_pessoais_pagamento_eventos")
  .select("id, empresa_id, proprietario_id, conta_pagar_pessoal_id, entrada_id, tipo, valor_nominal, valor_pago, desconto_obtido, pago_em, observacoes, idempotency_key, estorno_de_evento_id, criado_em")
  .eq("empresa_id", empresaId)
  .eq("proprietario_id", userId)
  .order("criado_em", { ascending: false });

const readPersonalDownPayments = async (empresaId, userId) => supabase
  .from("contas_pagar_pessoais_entradas")
  .select("id, grupo_parcelamento_id, empresa_id, proprietario_id, descricao, fornecedor, valor_total_compra, valor_entrada, saldo_financiado, data_entrada, parcelas_total, primeiro_vencimento, periodicidade, categoria, observacoes, criado_em")
  .eq("empresa_id", empresaId)
  .eq("proprietario_id", userId)
  .order("criado_em", { ascending: false });

export function usePersonalExpensesRead(empresaId, userId) { return useReadQuery(empresaId, userId, readPersonalExpenses); }
export function usePersonalIncomesRead(empresaId, userId) { return useReadQuery(empresaId, userId, readPersonalIncomes); }
export function usePersonalFixedExpensesRead(empresaId, userId) { return useReadQuery(empresaId, userId, readPersonalFixedExpenses); }
export function usePersonalCategoriesRead(empresaId, userId) { return useReadQuery(empresaId, userId, readPersonalCategories); }
export function usePersonalBudgetsRead(empresaId, userId) { return useReadQuery(empresaId, userId, readPersonalBudgets); }

export function usePersonalPayablesRead(empresaId, userId) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const read = useCallback(async () => {
    if (!empresaId || !userId) { setRecords([]); setError(""); setLoading(false); return; }
    setLoading(true); setError("");
    const result = await readPersonalPayables(empresaId, userId);
    setRecords(result.data || []); setError(result.error?.message || ""); setLoading(false);
  }, [empresaId, userId]);
  useEffect(() => { const timer = window.setTimeout(() => void read(), 0); return () => window.clearTimeout(timer); }, [read]);
  return { records, loading, error, reload: read };
}

export function usePersonalPaymentEventsRead(empresaId, userId) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const read = useCallback(async () => {
    if (!empresaId || !userId) { setRecords([]); setError(""); setLoading(false); return; }
    setLoading(true); setError("");
    const result = await readPersonalPaymentEvents(empresaId, userId);
    setRecords(result.data || []); setError(result.error?.message || ""); setLoading(false);
  }, [empresaId, userId]);
  useEffect(() => { const timer = window.setTimeout(() => void read(), 0); return () => window.clearTimeout(timer); }, [read]);
  return { records, loading, error, reload: read };
}

export function usePersonalDownPaymentsRead(empresaId, userId) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const read = useCallback(async () => {
    if (!empresaId || !userId) { setRecords([]); setError(""); setLoading(false); return; }
    setLoading(true); setError("");
    const result = await readPersonalDownPayments(empresaId, userId);
    setRecords(result.data || []); setError(result.error?.message || ""); setLoading(false);
  }, [empresaId, userId]);
  useEffect(() => { const timer = window.setTimeout(() => void read(), 0); return () => window.clearTimeout(timer); }, [read]);
  return { records, loading, error, reload: read };
}
