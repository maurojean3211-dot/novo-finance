import { supabase } from "../../supabase";
import { analyzeFinancialDocument } from "../documentos-financeiros/services/financialDocumentExtraction.service";
import { analyzeFiscalNote, reviewedFiscalNoteStatus } from "./fiscalNoteValidationEngine";
import { normalizeFiscalNoteExtraction } from "./fiscalNoteExtraction";

const friendlyError = () => new Error("Não foi possível registrar a nota para conferência. Tente novamente.");

export async function importFiscalNote({ file, empresaId, configurations, rules }) {
  if (file?.type !== "application/pdf") throw new Error("Selecione um arquivo PDF da nota fiscal.");
  const response = await analyzeFinancialDocument({ file, context: "company", empresaId: String(empresaId), destination: "Conferência Tributária", documentType: "tax_invoice" });
  const normalized = normalizeFiscalNoteExtraction(response.extraction);
  const analysis = analyzeFiscalNote({ ...normalized, configurations, rules });
  const configuration = analysis.configuration;
  const { data: saved, error } = await supabase.from("empresa_notas_fiscais_tributarias").insert({
    empresa_id: String(empresaId), numero: normalized.note.number, serie: normalized.note.series, chave_acesso: normalized.note.accessKey,
    data_emissao: normalized.note.issueDate, tipo_operacao: normalized.note.direction, parte_nome: normalized.note.partyName, parte_cnpj: normalized.note.partyTaxId,
    uf_emitente: normalized.note.originState, uf_destinatario: normalized.note.destinationState,
    valor_total: normalized.note.totalAmount, frete: normalized.note.freight, icms: normalized.note.icms, ipi: normalized.note.ipi, ibs: normalized.note.ibs, cbs: normalized.note.cbs,
    observacoes_fiscais: normalized.note.fiscalNotes, arquivo_nome: file.name, arquivo_tipo: file.type, confianca_extracao: normalized.confidence,
    status_tributario: analysis.status, regime_aplicado: configuration?.regime_base ?? null, modalidade_ibs_cbs: configuration?.ibs_cbs_modalidade ?? null,
    vigencia_inicio_usada: configuration?.vigencia_inicio ?? null, extracao_raw: response.extraction, analisada_em: new Date().toISOString(),
  }).select("id").single();
  if (error) throw friendlyError();
  try {
    if (normalized.items.length) {
      const { error: itemsError } = await supabase.from("empresa_nota_fiscal_itens").insert(normalized.items.map((item, index) => ({
        empresa_id: String(empresaId), nota_fiscal_id: saved.id, item_ordem: index + 1, descricao: item.description, ncm: item.ncm, cfop: item.cfop, cst_icms: item.cst, csosn_icms: item.csosn,
        quantidade: item.quantity, unidade: item.unit, peso: item.weight, valor_unitario: item.unitPrice, valor_total: item.totalAmount,
        icms: item.icms, ipi: item.ipi, ibs: item.ibs, cbs: item.cbs, confianca_extracao: item.confidence,
      })));
      if (itemsError) throw itemsError;
    }
    const { error: analysisError } = await supabase.from("empresa_nota_fiscal_analises").insert({
      empresa_id: String(empresaId), nota_fiscal_id: saved.id, status: analysis.status, regime_aplicado: configuration?.regime_base ?? null,
      modalidade_ibs_cbs: configuration?.ibs_cbs_modalidade ?? null, vigencia_inicio_usada: configuration?.vigencia_inicio ?? null,
      quantidade_alertas: analysis.alerts.filter((item) => item.severity !== "INFO").length, alertas: analysis.alerts,
    });
    if (analysisError) throw analysisError;
  } catch {
    await supabase.from("empresa_notas_fiscais_tributarias").delete().eq("id", saved.id).eq("empresa_id", String(empresaId));
    throw friendlyError();
  }
  return saved.id;
}

export async function listFiscalNotes(empresaId) {
  const { data, error } = await supabase.from("empresa_notas_fiscais_tributarias")
    .select("*,empresa_nota_fiscal_itens(*),empresa_nota_fiscal_analises(*)").eq("empresa_id", String(empresaId)).order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar as notas fiscais desta empresa.");
  return (data ?? []).map((note) => ({ ...note, empresa_nota_fiscal_analises: [...(note.empresa_nota_fiscal_analises ?? [])].sort((a, b) => b.analisada_em.localeCompare(a.analisada_em)) }));
}

export async function markFiscalNoteReviewed(empresaId, noteId, userId) {
  const { data: analysis, error: analysisError } = await supabase.from("empresa_nota_fiscal_analises")
    .select("alertas,analisada_em").eq("nota_fiscal_id", noteId).eq("empresa_id", String(empresaId)).order("analisada_em", { ascending: false }).limit(1).maybeSingle();
  if (analysisError || !analysis) throw new Error("Não foi possível localizar a análise tributária persistida desta nota.");
  const reviewedAt = new Date().toISOString();
  const { error } = await supabase.from("empresa_notas_fiscais_tributarias").update({
    revisada_em: reviewedAt, revisada_por: userId, status_tributario: reviewedFiscalNoteStatus(analysis), updated_at: reviewedAt,
  }).eq("id", noteId).eq("empresa_id", String(empresaId)).select("id").single();
  if (error) throw new Error("Não foi possível marcar a nota como revisada.");
}

export async function deleteFiscalNote(empresaId, noteId) {
  const { data, error } = await supabase.from("empresa_notas_fiscais_tributarias").delete().eq("id", noteId).eq("empresa_id", String(empresaId)).is("integracao_operacional", null).is("integrado_em", null).select("id");
  if (error || !data?.length) throw new Error("Esta nota não pode ser excluída porque já possui integração operacional ou você não tem permissão.");
}
