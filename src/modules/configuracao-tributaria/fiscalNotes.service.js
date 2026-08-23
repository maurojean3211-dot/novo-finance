import { supabase } from "../../supabase";
import { analyzeFinancialDocument } from "../documentos-financeiros/services/financialDocumentExtraction.service";
import { analyzeFiscalNote } from "./fiscalNoteValidationEngine";
import { normalizeFiscalNoteExtraction } from "./fiscalNoteExtraction";

const friendlyError = () => new Error("Não foi possível registrar a nota para conferência. Tente novamente.");

export async function importFiscalNote({ file, empresaId, configurations, rules, isContextCurrent = () => true }) {
  if (file?.type !== "application/pdf") throw new Error("Selecione um arquivo PDF da nota fiscal.");
  const response = await analyzeFinancialDocument({ file, context: "company", empresaId: String(empresaId), destination: "Conferência Tributária", documentType: "tax_invoice" });
  if (!isContextCurrent(String(empresaId))) throw new Error("A empresa ativa mudou durante a leitura. Importe a nota novamente.");
  const normalized = normalizeFiscalNoteExtraction(response.extraction);
  const analysis = analyzeFiscalNote({ ...normalized, configurations, rules });
  const configuration = analysis.configuration;
  const note = {
    numero: normalized.note.number, serie: normalized.note.series, chave_acesso: normalized.note.accessKey,
    data_emissao: normalized.note.issueDate, tipo_operacao: normalized.note.direction, parte_nome: normalized.note.partyName, parte_cnpj: normalized.note.partyTaxId,
    uf_emitente: normalized.note.originState, uf_destinatario: normalized.note.destinationState,
    valor_total: normalized.note.totalAmount, frete: normalized.note.freight, icms: normalized.note.icms, ipi: normalized.note.ipi, ibs: normalized.note.ibs, cbs: normalized.note.cbs,
    observacoes_fiscais: normalized.note.fiscalNotes, arquivo_nome: file.name, arquivo_tipo: file.type, confianca_extracao: normalized.confidence,
    status_tributario: analysis.status, regime_aplicado: configuration?.regime_base ?? null, modalidade_ibs_cbs: configuration?.ibs_cbs_modalidade ?? null,
    vigencia_inicio_usada: configuration?.vigencia_inicio ?? null, extracao_raw: response.extraction, analisada_em: new Date().toISOString(),
  };
  const items = normalized.items.map((item, index) => ({
        item_ordem: index + 1, descricao: item.description, ncm: item.ncm, cfop: item.cfop, cst_icms: item.cst, csosn_icms: item.csosn,
        quantidade: item.quantity, unidade: item.unit, peso: item.weight, valor_unitario: item.unitPrice, valor_total: item.totalAmount,
        icms: item.icms, ipi: item.ipi, ibs: item.ibs, cbs: item.cbs, confianca_extracao: item.confidence,
  }));
  const persistedAnalysis = {
      status: analysis.status, regime_aplicado: configuration?.regime_base ?? null,
      modalidade_ibs_cbs: configuration?.ibs_cbs_modalidade ?? null, vigencia_inicio_usada: configuration?.vigencia_inicio ?? null,
      quantidade_alertas: analysis.alerts.filter((item) => item.severity !== "INFO").length, alertas: analysis.alerts,
  };
  const { data: savedId, error } = await supabase.rpc("importar_nota_fiscal_tributaria", {
    p_empresa_id: String(empresaId), p_nota: note, p_itens: items, p_analise: persistedAnalysis,
  });
  if (error) throw friendlyError();
  return savedId;
}

export async function listFiscalNotes(empresaId) {
  const { data, error } = await supabase.from("empresa_notas_fiscais_tributarias")
    .select("*,empresa_nota_fiscal_itens(*),empresa_nota_fiscal_analises(*)").eq("empresa_id", String(empresaId)).order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar as notas fiscais desta empresa.");
  return (data ?? []).map((note) => ({ ...note, empresa_nota_fiscal_analises: [...(note.empresa_nota_fiscal_analises ?? [])].sort((a, b) => b.analisada_em.localeCompare(a.analisada_em)) }));
}

export async function markFiscalNoteReviewed(empresaId, noteId) {
  const { error } = await supabase.rpc("revisar_nota_fiscal_tributaria", { p_empresa_id: String(empresaId), p_nota_fiscal_id: noteId });
  if (error) throw new Error("Não foi possível marcar a nota como revisada.");
}

export async function deleteFiscalNote(empresaId, noteId) {
  const { data, error } = await supabase.rpc("excluir_nota_fiscal_tributaria", { p_empresa_id: String(empresaId), p_nota_fiscal_id: noteId });
  if (error || !data) throw new Error("Esta nota não pode ser excluída porque já possui integração operacional ou você não tem permissão.");
}
