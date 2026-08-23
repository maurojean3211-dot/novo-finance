const DAY_MS = 86_400_000;
const asDay = (value) => value ? new Date(`${value}T00:00:00Z`).getTime() : null;
const todayIso = () => new Date().toISOString().slice(0, 10);

function alert({ empresaId, code, severity, title, description, source, ruleDate, context = "geral" }) {
  return {
    empresa_id: empresaId,
    chave_alerta: `${code}:${context}`,
    codigo_regra: code,
    classificacao: severity,
    titulo: title,
    descricao: description,
    fundamento_fonte: source,
    data_regra: ruleDate,
    resolvido: false,
  };
}

export function evaluateTaxRules({ empresaId, configurations = [], normativeRules = [], today = todayIso() }) {
  const alerts = [];
  const ordered = [...configurations].sort((a, b) => a.vigencia_inicio.localeCompare(b.vigencia_inicio));
  const current = ordered.find((item) => item.vigencia_inicio <= today && (!item.vigencia_fim || item.vigencia_fim >= today));
  if (!current) alerts.push(alert({ empresaId, code: "REGIME_AUSENTE", severity: "CRITICO", title: "Regime vigente não informado", description: "Não há configuração tributária vigente para a data atual.", source: "Cadastro tributário da empresa", ruleDate: today }));

  ordered.forEach((item, index) => {
    if (item.vigencia_fim && item.vigencia_fim < item.vigencia_inicio) alerts.push(alert({ empresaId, code: "DATAS_INCONSISTENTES", severity: "CRITICO", title: "Datas de vigência inconsistentes", description: "O término da vigência é anterior ao início.", source: "Validação cadastral do Cunha Finance", ruleDate: today, context: item.id ?? String(index) }));
    if (item.regime_base !== "simples_nacional" && item.ibs_cbs_modalidade !== "regime_regular") alerts.push(alert({ empresaId, code: "MODALIDADE_INCOMPATIVEL", severity: "CRITICO", title: "Regime e modalidade incompatíveis", description: "A modalidade IBS/CBS selecionada não é compatível com o regime-base.", source: "Validação cadastral do Cunha Finance", ruleDate: today, context: item.id ?? String(index) }));
    const next = ordered[index + 1];
    if (next && (!item.vigencia_fim || asDay(item.vigencia_fim) >= asDay(next.vigencia_inicio))) alerts.push(alert({ empresaId, code: "VIGENCIA_SOBREPOSTA", severity: "CRITICO", title: "Vigências sobrepostas", description: "Existem duas configurações tributárias cobrindo o mesmo período.", source: "Histórico tributário da empresa", ruleDate: today, context: `${item.id ?? index}:${next.id ?? index + 1}` }));
    if (item.vigencia_fim && item.vigencia_fim < today && !next && asDay(today) - asDay(item.vigencia_fim) >= DAY_MS) alerts.push(alert({ empresaId, code: "CONFIGURACAO_VENCIDA", severity: "ATENCAO", title: "Configuração vencida sem sucessora", description: "A última configuração terminou e nenhuma nova vigência foi cadastrada.", source: "Histórico tributário da empresa", ruleDate: today, context: item.id ?? String(index) }));
  });

  normativeRules.filter((rule) => rule.ativa !== false && rule.inicio_vigencia <= today).forEach((rule) => {
    alerts.push(alert({ empresaId, code: "NORMA_PENDENTE_REVISAO", severity: rule.classificacao ?? "ATENCAO", title: rule.titulo, description: rule.descricao, source: `${rule.fonte_oficial}${rule.url_fonte ? ` — ${rule.url_fonte}` : ""}`, ruleDate: rule.data_publicacao, context: `${rule.id}:${rule.versao}` }));
  });
  return alerts;
}

export function situationStatus(alerts) {
  const unresolved = alerts.filter((item) => !item.resolvido);
  if (unresolved.some((item) => item.classificacao === "CRITICO")) return "Crítico";
  if (unresolved.some((item) => item.classificacao === "ATENCAO")) return "Atenção";
  return "Regular";
}
