import { supabase } from "../../supabase";
import { evaluateTaxRules } from "./taxValidationEngine";

export const REGIMES_TRIBUTARIOS = [
  { value: "lucro_real", label: "Lucro Real" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "simples_nacional", label: "Simples Nacional" },
];

export function regimeDisplayName(config) {
  if (config.regime_base === "simples_nacional" && config.ibs_cbs_modalidade === "regime_regular") return "Simples Híbrido";
  return REGIMES_TRIBUTARIOS.find((item) => item.value === config.regime_base)?.label ?? "Não configurado";
}

export function configurationStatus(config, today = new Date().toISOString().slice(0, 10)) {
  if (config.vigencia_inicio > today) return "Futura";
  if (config.vigencia_fim && config.vigencia_fim < today) return "Encerrada";
  return "Vigente";
}

const FRIENDLY_TAX_ERRORS = {
  "23P01": "Já existe uma configuração tributária para este período.",
  "23505": "Já existe uma configuração tributária para este período.",
  "23514": "Não foi possível registrar a nova vigência. Verifique as datas informadas.",
  P0001: "Não foi possível registrar a nova vigência. Verifique as datas informadas.",
};

export function taxErrorMessage(error) {
  const raw = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  if (error?.code === "23P01" || error?.code === "23505" || raw.includes("sobrepos")) {
    return FRIENDLY_TAX_ERRORS["23P01"];
  }
  if (FRIENDLY_TAX_ERRORS[error?.code]) return FRIENDLY_TAX_ERRORS[error.code];
  if (error?.code === "42501" || raw.includes("permission denied") || raw.includes("row-level security")) {
    return "Você não tem permissão para alterar a configuração tributária desta empresa.";
  }
  return "Não foi possível registrar a nova vigência. Verifique as datas informadas.";
}

export async function listTaxConfigurations(empresaId) {
  const { data, error } = await supabase
    .from("empresa_configuracoes_tributarias")
    .select("id,empresa_id,regime_base,ibs_cbs_modalidade,vigencia_inicio,vigencia_fim,observacoes,criado_por,created_at")
    .eq("empresa_id", String(empresaId))
    .order("vigencia_inicio", { ascending: false });
  if (error) throw new Error("Não foi possível carregar a configuração tributária desta empresa.");
  return data ?? [];
}

export async function saveTaxConfiguration({ empresaId, userId, configuration }) {
  void userId;
  const { data, error } = await supabase.rpc("registrar_configuracao_tributaria", {
    p_empresa_id: String(empresaId),
    p_regime_base: configuration.regimeBase,
    p_ibs_cbs_modalidade: configuration.regimeBase === "simples_nacional" ? configuration.ibsCbsModalidade : "regime_regular",
    p_vigencia_inicio: configuration.vigenciaInicio,
    p_vigencia_fim: configuration.vigenciaFim || null,
    p_observacoes: configuration.observacoes.trim() || null,
  });
  if (error) throw new Error(taxErrorMessage(error));
  return data;
}

export async function loadTaxSituation(empresaId, records) {
  const [{ data: rules, error: rulesError }, { data: storedAlerts, error: alertsError }] = await Promise.all([
    supabase.from("empresa_regras_tributarias").select("*").eq("empresa_id", String(empresaId)).order("data_publicacao", { ascending: false }),
    supabase.from("empresa_alertas_tributarios").select("*").eq("empresa_id", String(empresaId)).order("created_at", { ascending: false }),
  ]);
  if (rulesError || alertsError) throw new Error("Não foi possível verificar as regras tributárias desta empresa.");

  const evaluated = evaluateTaxRules({ empresaId: String(empresaId), configurations: records, normativeRules: rules ?? [] });
  const existingByKey = new Map((storedAlerts ?? []).map((alert) => [alert.chave_alerta, alert]));
  const activeKeys = evaluated.map((alert) => alert.chave_alerta);
  const pending = evaluated.filter((alert) => !existingByKey.has(alert.chave_alerta));
  if (pending.length) {
    const { error } = await supabase.from("empresa_alertas_tributarios").insert(pending);
    if (error) throw new Error("As regras foram verificadas, mas não foi possível registrar os alertas.");
  }
  const reopenedIds = evaluated.map((alert) => existingByKey.get(alert.chave_alerta)).filter((alert) => alert?.resolvido).map((alert) => alert.id);
  if (reopenedIds.length) {
    const { error } = await supabase.from("empresa_alertas_tributarios").update({ resolvido: false, resolvido_em: null }).in("id", reopenedIds).eq("empresa_id", String(empresaId));
    if (error) throw new Error("As regras foram verificadas, mas não foi possível reabrir os alertas recorrentes.");
  }
  const staleIds = (storedAlerts ?? []).filter((alert) => !alert.resolvido && !activeKeys.includes(alert.chave_alerta)).map((alert) => alert.id);
  if (staleIds.length) {
    const { error } = await supabase.from("empresa_alertas_tributarios").update({ resolvido: true, resolvido_em: new Date().toISOString() }).in("id", staleIds).eq("empresa_id", String(empresaId));
    if (error) throw new Error("As regras foram verificadas, mas não foi possível atualizar os alertas resolvidos.");
  }
  const merged = [
    ...evaluated.map((alert) => ({ ...existingByKey.get(alert.chave_alerta), ...alert, resolvido: false })),
    ...(storedAlerts ?? []).filter((alert) => alert.resolvido || !activeKeys.includes(alert.chave_alerta)).map((alert) => ({ ...alert, resolvido: true })),
  ];
  return { rules: rules ?? [], alerts: merged, checkedAt: new Date().toISOString() };
}
