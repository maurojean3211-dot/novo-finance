import test from "node:test";
import assert from "node:assert/strict";

import { normalizeDashboardReceivables } from "./dashboardMetrics.js";

test("normaliza o nome do cliente do recebimento pela relação cliente_id", () => {
  const result = normalizeDashboardReceivables(
    [{ id: "r-1", cliente_id: "c-1", valor: 150 }],
    [{ id: "c-1", nome: "Cliente Correto" }],
  );

  assert.equal(result[0].cliente_nome, "Cliente Correto");
  assert.equal(result[0].cliente_id, "c-1");
  assert.equal(result[0].valor, 150);
});

test("mantém fallback quando o recebimento não possui cliente correspondente", () => {
  const result = normalizeDashboardReceivables([{ id: "r-2", cliente_id: null }], []);

  assert.equal(result[0].cliente_nome, "Cliente");
});
