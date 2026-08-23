import assert from "node:assert/strict";
import test from "node:test";
import { analyzeFiscalNote, evaluateCfopCompatibility, evaluateIcmsAluminumDeferral, reviewedFiscalNoteStatus } from "./fiscalNoteValidationEngine.js";

const config = [{ regime_base: "lucro_real", ibs_cbs_modalidade: "regime_regular", vigencia_inicio: "2026-01-01", vigencia_fim: null }];
const complete = { number: "10", issueDate: "2026-08-21", direction: "entrada", partyTaxId: "123", totalAmount: 100, icms: 10 };

test("nota completa e coerente fica regular", () => {
  const result = analyzeFiscalNote({ note: complete, items: [{ ncm: "1234", cfop: "5102", totalAmount: 100 }], configurations: config });
  assert.equal(result.status, "regular"); assert.equal(result.alerts.length, 0);
});

test("NCM e CFOP ausentes geram alertas", () => {
  const result = analyzeFiscalNote({ note: complete, items: [{ totalAmount: 100 }], configurations: config });
  assert.equal(result.status, "atencao"); assert.deepEqual(result.alerts.map((item) => item.field), ["itens[0].ncm", "itens[0].cfop"]);
});

test("ausência de vigência gera alerta crítico", () => {
  const result = analyzeFiscalNote({ note: complete, items: [], configurations: [] });
  assert.equal(result.status, "critico"); assert.equal(result.alerts[0].field, "regime_tributario");
});

const item = { ncm: "76012000", cfop: "5101", totalAmount: 10250 };
const fiscalNote = { ...complete, totalAmount: 10516.5 };

test("item mais IPI fecha o total da NF 000342", () => {
  const result = analyzeFiscalNote({ note: { ...fiscalNote, ipi: 266.5, freight: 0 }, items: [item], configurations: config });
  assert.equal(result.status, "regular"); assert.equal(result.alerts.some((entry) => entry.field === "valor_total"), false);
});

test("item mais frete fecha o total", () => {
  const result = analyzeFiscalNote({ note: { ...complete, totalAmount: 115, freight: 15 }, items: [{ ...item, totalAmount: 100 }], configurations: config });
  assert.equal(result.status, "regular");
});

test("desconto é subtraído do total", () => {
  const result = analyzeFiscalNote({ note: { ...complete, totalAmount: 90, discount: 10 }, items: [{ ...item, totalAmount: 100 }], configurations: config });
  assert.equal(result.status, "regular");
});

test("divergência real informa diferença não explicada", () => {
  const result = analyzeFiscalNote({ note: { ...complete, totalAmount: 120, freight: 10 }, items: [{ ...item, totalAmount: 100 }], configurations: config });
  const totalAlert = result.alerts.find((entry) => entry.field === "valor_total");
  assert.equal(result.status, "atencao"); assert.match(totalAlert.guidance, /Diferença não explicada: 10\.00/);
});

test("diferença de até dois centavos é tolerada", () => {
  const result = analyzeFiscalNote({ note: { ...complete, totalAmount: 100.02 }, items: [{ ...item, totalAmount: 100 }], configurations: config });
  assert.equal(result.status, "regular"); assert.equal(result.alerts.length, 0);
});

test("revisão de nota pendente sem alertas resulta em regular", () => {
  assert.equal(reviewedFiscalNoteStatus({ alertas: [] }), "regular");
});

test("revisão preserva atenção quando há alerta", () => {
  assert.equal(reviewedFiscalNoteStatus({ alertas: [{ severity: "ATENÇÃO" }] }), "atencao");
});

test("revisão preserva crítico quando há alerta crítico", () => {
  assert.equal(reviewedFiscalNoteStatus({ alertas: [{ severity: "CRÍTICO" }] }), "critico");
});

const aluminumItem = { description: "Tarugo de alumínio em liga bruta", ncm: "76012000", cfop: "5101", cst: "51", totalAmount: 100 };
const internalSpNote = { ...complete, icms: 0, originState: "SP", destinationState: "SP", fiscalNotes: "Diferimento do ICMS conforme artigo 400-D do RICMS/SP" };

test("NCM 7601 em operação SP para SP reconhece diferimento sem falso alerta de ICMS", () => {
  const result = analyzeFiscalNote({ note: internalSpNote, items: [aluminumItem], configurations: config, rules: [{ titulo: "ICMS obrigatório", descricao: "Destaque obrigatório de ICMS" }] });
  assert.equal(result.status, "regular");
  assert.equal(result.alerts.some((entry) => entry.kind === "icms_deferral" && entry.severity === "INFO"), true);
  assert.equal(result.alerts.some((entry) => entry.problem.includes("não identificado")), false);
});

test("destinatário do Simples não apropria crédito", () => {
  const treatment = evaluateIcmsAluminumDeferral({ note: internalSpNote, items: [aluminumItem], configuration: { regime_base: "simples_nacional" } });
  assert.equal(treatment.applied, true); assert.equal(treatment.credit, "Não"); assert.match(treatment.alert.guidance, /não apropriável pelo Simples Nacional/);
});

test("regime normal recebe somente indicação para verificar crédito e débito", () => {
  const treatment = evaluateIcmsAluminumDeferral({ note: internalSpNote, items: [aluminumItem], configuration: { regime_base: "lucro_real" } });
  assert.equal(treatment.applied, true); assert.equal(treatment.credit, "Verificar"); assert.match(treatment.alert.guidance, /verificar crédito\/débito/);
});

test("operação interestadual não aplica automaticamente o artigo 400-D", () => {
  assert.equal(evaluateIcmsAluminumDeferral({ note: { ...internalSpNote, destinationState: "RJ" }, items: [aluminumItem], configuration: config[0] }), null);
});

test("NCM diferente de 7601 não aplica a regra", () => {
  assert.equal(evaluateIcmsAluminumDeferral({ note: internalSpNote, items: [{ ...aluminumItem, ncm: "76020000" }], configuration: config[0] }), null);
});

test("dados insuficientes geram atenção sem concluir diferimento", () => {
  const incompleteItem = { ...aluminumItem, cfop: null, cst: null };
  const result = analyzeFiscalNote({ note: { ...complete, icms: 0 }, items: [incompleteItem], configurations: config });
  const treatment = result.alerts.find((entry) => entry.kind === "icms_deferral");
  assert.equal(result.status, "atencao"); assert.equal(treatment.severity, "ATENÇÃO"); assert.match(treatment.problem, /Possível diferimento/);
});

test("NF de fornecedor com CFOP 5101 e empresa destinatária não gera falso alerta", () => {
  assert.deepEqual(evaluateCfopCompatibility({ companyRole: "destinataria", originState: "SP", destinationState: "SP" }, [{ cfop: "5.101" }]), []);
});

test("CFOP 6xxx de fornecedor em operação interestadual é coerente", () => {
  assert.deepEqual(evaluateCfopCompatibility({ companyRole: "destinataria", originState: "MG", destinationState: "SP" }, [{ cfop: "6.101" }]), []);
});

test("empresa ativa emitente com CFOP de saída coerente fica regular", () => {
  const result = analyzeFiscalNote({ note: { ...complete, direction: "saida", companyRole: "emitente", originState: "SP", destinationState: "SP" }, items: [{ ncm: "1234", cfop: "5.101", totalAmount: 100 }], configurations: config });
  assert.equal(result.status, "regular"); assert.equal(result.alerts.length, 0);
});

test("papel da empresa não identificado gera atenção sem afirmar incompatibilidade", () => {
  const alerts = evaluateCfopCompatibility({}, [{ cfop: "5.101" }]);
  assert.equal(alerts.length, 1); assert.match(alerts[0].problem, /Confirmar natureza/); assert.doesNotMatch(alerts[0].problem, /incompatível/i);
});
