import assert from "node:assert/strict";
import test from "node:test";
import { evaluateTaxRules, situationStatus } from "./taxValidationEngine.js";

test("classifica ausência de regime vigente como crítica", () => {
  const alerts = evaluateTaxRules({ empresaId: "empresa-a", configurations: [], today: "2026-09-01" });
  assert.equal(alerts[0].codigo_regra, "REGIME_AUSENTE");
  assert.equal(situationStatus(alerts), "Crítico");
});

test("identifica sobreposição e configuração vencida", () => {
  const alerts = evaluateTaxRules({ empresaId: "empresa-a", today: "2026-10-01", configurations: [
    { id: "1", regime_base: "simples_nacional", ibs_cbs_modalidade: "simples_nacional", vigencia_inicio: "2026-08-01", vigencia_fim: "2026-09-10" },
    { id: "2", regime_base: "lucro_real", ibs_cbs_modalidade: "regime_regular", vigencia_inicio: "2026-09-01", vigencia_fim: "2026-09-30" },
  ] });
  assert.deepEqual(new Set(alerts.map((item) => item.codigo_regra)), new Set(["REGIME_AUSENTE", "VIGENCIA_SOBREPOSTA", "CONFIGURACAO_VENCIDA"]));
});

test("norma gera alerta sem alterar a configuração", () => {
  const configurations = [{ id: "1", regime_base: "lucro_real", ibs_cbs_modalidade: "regime_regular", vigencia_inicio: "2026-01-01", vigencia_fim: null }];
  const alerts = evaluateTaxRules({ empresaId: "empresa-a", configurations, today: "2026-09-01", normativeRules: [{ id: "r1", titulo: "Revisar norma", descricao: "Revisão necessária", fonte_oficial: "Receita Federal", url_fonte: "https://gov.br/", data_publicacao: "2026-08-01", inicio_vigencia: "2026-08-01", versao: "1", ativa: true, classificacao: "INFO" }] });
  assert.equal(alerts[0].codigo_regra, "NORMA_PENDENTE_REVISAO");
  assert.equal(configurations[0].regime_base, "lucro_real");
});
