import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../supabase";

function useReadQuery(empresaId, load) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const read = useCallback(async () => {
      if (!empresaId) {
        setRecords([]); setError(""); setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      const result = await load(empresaId);
      setRecords(result.data || []);
      setError(result.error?.message || "");
      setLoading(false);
  }, [empresaId, load]);

  useEffect(() => {
    const timer = window.setTimeout(() => void read(), 0);
    return () => window.clearTimeout(timer);
  }, [read]);

  return { records, loading, error, reload: read };
}

const readExpenses = (type) => async (empresaId) => supabase
  .from("despesas")
  .select("id, empresa_id, tipo, categoria, descricao, valor, data_lancamento")
  .eq("empresa_id", empresaId)
  .eq("tipo", type)
  .order("data_lancamento", { ascending: false });

const readPersonalExpenses = readExpenses("despesa");
const readPersonalIncomes = readExpenses("receita");
const readPersonalFixedExpenses = async (empresaId) => supabase
  .from("contas_fixas")
  .select("id, empresa_id, descricao, valor, dia_vencimento, frequencia, ativo")
  .eq("empresa_id", empresaId)
  .order("dia_vencimento", { ascending: true });

const readPersonalPayables = async (empresaId, userId) => supabase
  .from("contas_pagar_pessoais")
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

export function usePersonalExpensesRead(empresaId) { return useReadQuery(empresaId, readPersonalExpenses); }
export function usePersonalIncomesRead(empresaId) { return useReadQuery(empresaId, readPersonalIncomes); }
export function usePersonalFixedExpensesRead(empresaId) { return useReadQuery(empresaId, readPersonalFixedExpenses); }

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
