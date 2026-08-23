const alert = (field, problem, value, rule, source, guidance, severity = "ATENÇÃO") => ({ field, problem, value: value ?? null, rule, source, guidance, severity });
const finite = (value) => Number.isFinite(value) ? value : 0;
const itemComponent = (items, field) => items.some((item) => Number.isFinite(item[field])) ? items.reduce((sum, item) => sum + finite(item[field]), 0) : 0;
const explicitComponent = (note, items, noteField, itemField = noteField) => Number.isFinite(note[noteField]) ? note[noteField] : itemComponent(items, itemField);

export const ICMS_ALUMINUM_DEFERRAL_RULE = Object.freeze({
  id: "sp-ricms-400d-aluminio-7601", version: "2025-06-04", foundation: "Art. 400-D do RICMS/SP", source: "SEFAZ-SP",
  sourceUrl: "https://legislacao.fazenda.sp.gov.br/Paginas/art400d.aspx", publishedAt: "2005-05-24", effectiveFrom: "2005-06-01",
  lastVerifiedAt: "2026-08-21", application: "Operações internas com NCM 7601 nas hipóteses previstas",
});

const normalized = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const uf = (value) => String(value ?? "").trim().toUpperCase();
const taxId = (value) => String(value ?? "").replace(/\D/g, "");

export function activeCompanyRole(note) {
  if (["emitente", "destinataria"].includes(note.companyRole)) return note.companyRole;
  const activeTaxId = taxId(note.activeCompanyTaxId);
  if (activeTaxId && activeTaxId === taxId(note.issuerTaxId)) return "emitente";
  if (activeTaxId && activeTaxId === taxId(note.recipientTaxId)) return "destinataria";
  if (note.direction === "entrada") return "destinataria";
  if (note.direction === "saida") return "emitente";
  return null;
}

export function evaluateCfopCompatibility(note, items = []) {
  const role = activeCompanyRole(note);
  const cfopItems = items.map((item, index) => ({ item, index, prefix: String(item.cfop ?? "").replace(/\D/g, "").charAt(0) })).filter(({ prefix }) => prefix);
  if (!cfopItems.length) return [];
  if (!role) return [alert("natureza_operacao", "Confirmar natureza da operação.", note.operationNature ?? null, "Compatibilidade tipo da nota/CFOP", "Dados extraídos da nota", "Não foi possível determinar se a empresa ativa é emitente ou destinatária; confira participantes, CNPJs e natureza da operação.")];
  const origin = uf(note.originState ?? note.originUf);
  const destination = uf(note.destinationState ?? note.destinationUf);
  return cfopItems.flatMap(({ item, index, prefix }) => {
    if (!"567".includes(prefix)) return [alert(`itens[${index}].cfop`, "CFOP requer conferência sob a ótica do emitente.", item.cfop, "Compatibilidade tipo da nota/CFOP", "CFOP informado no DANFE", `A empresa ativa foi identificada como ${role}; confira participantes e natureza da operação.`)];
    if (origin && destination && prefix === "5" && origin !== destination) return [alert(`itens[${index}].cfop`, "CFOP interno diverge das UFs identificadas.", item.cfop, "Compatibilidade geográfica do CFOP", "UF do emitente e do destinatário", "Confira as UFs e a natureza da operação.")];
    if (origin && destination && prefix === "6" && origin === destination) return [alert(`itens[${index}].cfop`, "CFOP interestadual diverge das UFs identificadas.", item.cfop, "Compatibilidade geográfica do CFOP", "UF do emitente e do destinatário", "Confira as UFs e a natureza da operação.")];
    return [];
  });
}

export function evaluateIcmsAluminumDeferral({ note, items = [], configuration }) {
  const aluminumItems = items.filter((item) => String(item.ncm ?? "").replace(/\D/g, "").startsWith("7601"));
  if (!aluminumItems.length) return null;
  const descriptionMatches = aluminumItems.some((item) => {
    const description = normalized(item.description);
    return description.includes("alumin") && /(forma bruta|liga|lingote|tarugo|granalha)/.test(description);
  });
  if (!descriptionMatches) return null;
  const origin = uf(note.originState ?? note.originUf);
  const destination = uf(note.destinationState ?? note.destinationUf);
  if (origin && destination && (origin !== "SP" || destination !== "SP")) return null;
  const internalCfop = aluminumItems.some((item) => /^[15]/.test(String(item.cfop ?? "")));
  const cstDeferred = [note.cst, ...aluminumItems.map((item) => item.cst ?? item.cst_icms)].some((value) => /^(0?51)$/.test(String(value ?? "").replace(/\D/g, "")));
  const complementary = normalized(note.complementaryInformation ?? note.fiscalNotes);
  const explicitFoundation = complementary.includes("difer") && (complementary.includes("400-d") || complementary.includes("400 d") || complementary.includes("icms"));
  const sufficient = origin === "SP" && destination === "SP" && internalCfop && (cstDeferred || explicitFoundation);
  const simple = configuration?.regime_base === "simples_nacional";
  const credit = simple ? "Não" : "Verificar";
  const creditGuidance = simple
    ? "Crédito de ICMS: não apropriável pelo Simples Nacional. Pode haver recolhimento do ICMS diferido na hipótese de interrupção, conforme a legislação aplicável."
    : "Tratamento do crédito: verificar crédito/débito na interrupção do diferimento conforme destinação e operação. Não lançar crédito automaticamente.";
  return {
    applied: sufficient, credit,
    alert: sufficient
      ? alert("icms", "Tratamento do ICMS: Diferido", note.icms, ICMS_ALUMINUM_DEFERRAL_RULE.foundation, ICMS_ALUMINUM_DEFERRAL_RULE.source, `O diferimento posterga o lançamento do imposto; não significa isenção ou alíquota zero. ${creditGuidance}`, "INFO")
      : alert("icms", "Possível diferimento de ICMS. Necessária conferência.", note.icms, ICMS_ALUMINUM_DEFERRAL_RULE.foundation, ICMS_ALUMINUM_DEFERRAL_RULE.source, "Confira CFOP, CST/CSOSN, UFs, finalidade da mercadoria e informações complementares antes de concluir o diferimento."),
  };
}

function fiscalTotalComposition(note, items, itemsTotal) {
  const otherFiscalComponents = Array.isArray(note.otherFiscalComponents)
    ? note.otherFiscalComponents.reduce((sum, component) => sum + finite(typeof component === "number" ? component : component?.value ?? component?.amount), 0)
    : 0;
  const additions =
    explicitComponent(note, items, "ipi") +
    explicitComponent(note, items, "icmsSt") +
    explicitComponent(note, items, "freight") +
    explicitComponent(note, items, "insurance") +
    explicitComponent(note, items, "otherExpenses") +
    otherFiscalComponents;
  const discounts = explicitComponent(note, items, "discount");
  return itemsTotal + additions - discounts;
}

export function findTaxConfiguration(configurations, issueDate) {
  if (!issueDate) return null;
  return configurations.find((item) => item.vigencia_inicio <= issueDate && (!item.vigencia_fim || item.vigencia_fim >= issueDate)) ?? null;
}

export function reviewedFiscalNoteStatus(analysis) {
  const alerts = (Array.isArray(analysis?.alertas) ? analysis.alertas : []).filter((item) => item?.severity !== "INFO");
  if (!alerts.length) return "regular";
  const hasCritical = alerts.some((item) => String(item?.severity ?? item?.classificacao ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === "CRITICO");
  return hasCritical ? "critico" : "atencao";
}

export function analyzeFiscalNote({ note, items = [], configurations = [], rules = [] }) {
  const alerts = [];
  const configuration = findTaxConfiguration(configurations, note.issueDate);
  if (!note.issueDate) alerts.push(alert("data_emissao", "Data de emissão não identificada.", null, "Vigência tributária", "Configuração tributária da empresa", "Confira a data de emissão no documento.", "CRÍTICO"));
  else if (!configuration) alerts.push(alert("regime_tributario", "Não existe regime tributário vigente na data da nota.", note.issueDate, "Regime vigente na emissão", "Histórico tributário da empresa", "Cadastre ou revise a vigência correspondente.", "CRÍTICO"));

  const icmsDeferral = evaluateIcmsAluminumDeferral({ note, items, configuration });
  if (icmsDeferral) alerts.push({ ...icmsDeferral.alert, kind: "icms_deferral", credit: icmsDeferral.credit, ruleVersion: ICMS_ALUMINUM_DEFERRAL_RULE.version, sourceUrl: ICMS_ALUMINUM_DEFERRAL_RULE.sourceUrl });

  items.forEach((item, index) => {
    if (!item.ncm) alerts.push(alert(`itens[${index}].ncm`, "NCM não identificado.", null, "Identificação fiscal do item", "Documento fiscal importado", "Confira o NCM do item na nota."));
    if (!item.cfop) alerts.push(alert(`itens[${index}].cfop`, "CFOP não identificado.", null, "Identificação da operação", "Documento fiscal importado", "Confira o CFOP do item na nota."));
  });
  alerts.push(...evaluateCfopCompatibility(note, items));

  const totals = items.map((item) => item.totalAmount).filter(Number.isFinite);
  if (Number.isFinite(note.totalAmount) && totals.length === items.length && items.length) {
    const itemsTotal = totals.reduce((total, value) => total + value, 0);
    const calculatedTotal = fiscalTotalComposition(note, items, itemsTotal);
    const unexplainedDifference = note.totalAmount - calculatedTotal;
    if (Math.abs(Math.round(unexplainedDifference * 100)) > 2) {
      alerts.push(alert("valor_total", "A composição dos valores não fecha com o total da nota.", note.totalAmount, "Conferência aritmética", "Valores extraídos da nota", `Total calculado: ${calculatedTotal.toFixed(2)}. Diferença não explicada: ${unexplainedDifference.toFixed(2)}.`));
    }
  }

  const ruleText = rules.map((rule) => `${rule.titulo ?? ""} ${rule.descricao ?? ""}`).join(" ").toLowerCase();
  ["icms", "ipi", "ibs", "cbs"].forEach((tax) => {
    if (ruleText.includes(tax) && ruleText.includes("obrigat") && note[tax] == null && items.every((item) => item[tax] == null) && !(tax === "icms" && icmsDeferral?.applied)) {
      const sourceRule = rules.find((rule) => `${rule.titulo ?? ""} ${rule.descricao ?? ""}`.toLowerCase().includes(tax));
      alerts.push(alert(tax, `${tax.toUpperCase()} não identificado embora exista regra cadastrada aplicável.`, null, sourceRule?.titulo ?? `Regra de ${tax.toUpperCase()}`, sourceRule?.fonte_oficial ?? "Regra tributária cadastrada", "Confirme a incidência e os valores com o responsável fiscal."));
    }
  });

  const missingIdentity = !note.number || !note.issueDate || !note.direction || !note.partyTaxId || !Number.isFinite(note.totalAmount);
  const actionableAlerts = alerts.filter((item) => item.severity !== "INFO");
  const status = actionableAlerts.some((item) => item.severity === "CRÍTICO") ? "critico" : actionableAlerts.length ? "atencao" : missingIdentity ? "pendente_revisao" : "regular";
  return { status, alerts, configuration };
}
