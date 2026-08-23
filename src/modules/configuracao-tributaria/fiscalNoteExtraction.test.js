import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFiscalNoteExtraction } from "./fiscalNoteExtraction.js";

const field = (value) => ({ value, confidence: value == null ? null : 0.99, evidence: value });

test("normaliza UFs e CST extraídos", () => {
  const result = normalizeFiscalNoteExtraction({ fields: { issuer_state: field("SP"), recipient_state: field("SP") }, items: [{ icms_cst: field("051") }] });
  assert.equal(result.note.originState, "SP"); assert.equal(result.note.destinationState, "SP"); assert.equal(result.items[0].cst, "051");
});

test("normaliza CSOSN extraído", () => {
  const result = normalizeFiscalNoteExtraction({ fields: {}, items: [{ icms_csosn: field("900") }] });
  assert.equal(result.items[0].csosn, "900");
});

test("mantém campos ausentes como null sem inventar", () => {
  const result = normalizeFiscalNoteExtraction({ fields: { issuer_state: field(null), recipient_state: field(null) }, items: [{ icms_cst: field(null), icms_csosn: field(null) }] });
  assert.equal(result.note.originState, null); assert.equal(result.note.destinationState, null); assert.equal(result.items[0].cst, null); assert.equal(result.items[0].csosn, null);
});
