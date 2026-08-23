import { findCatalogMatches } from "./commercialAssistantRules.service";
import { normalizeCommand } from "../utils/commercialIntentParser";
import { supabase } from "../../../supabase";

export const ATTENDANCE_TYPES = ["Novo cliente", "Cliente existente", "Pedido de orçamento", "Consulta de produto", "Consulta de preço", "Retorno comercial", "Pós-venda", "Outro"];
export const PRIORITIES = ["Baixa", "Normal", "Alta", "Urgente"];
export const EMPTY_ATTENDANCE = { client: "", company: "", phone: "", whatsapp: "", email: "", city: "", state: "", country: "", message: "", product: "", quantity: "", unit: "kg", deadline: "", notes: "", classification: "Outro", priority: "Normal" };

const hasAny = (text, terms) => terms.some((term) => text.includes(term));
const label = (value) => String(value || "").trim();

function inferClassification(form, existingCustomer) {
  const text = normalizeCommand(`${form.message} ${form.notes}`);
  if (hasAny(text, ["pos-venda", "pos venda", "reclamacao", "garantia"])) return "Pós-venda";
  if (hasAny(text, ["retorno", "retornando", "follow-up", "follow up"])) return "Retorno comercial";
  if (hasAny(text, ["orcamento", "cotacao", "proposta"])) return "Pedido de orçamento";
  if (hasAny(text, ["preco", "valor", "quanto custa"])) return "Consulta de preço";
  if (form.product || hasAny(text, ["produto", "material", "perfil", "sucata", "cavaco", "limalha", "tarugo"])) return "Consulta de produto";
  if (existingCustomer) return "Cliente existente";
  if (form.client || form.company) return "Novo cliente";
  return "Outro";
}

function inferPriority(form) {
  const text = normalizeCommand(`${form.message} ${form.notes} ${form.deadline}`);
  if (hasAny(text, ["urgente", "imediato", "hoje", "agora"])) return "Urgente";
  if (hasAny(text, ["prioridade", "amanha", "esta semana"])) return "Alta";
  return form.priority || "Normal";
}

function extractQuantity(form) {
  if (label(form.quantity)) return label(form.quantity);
  const match = String(form.message || "").match(/(\d+(?:[.,]\d+)?)\s*(kg|quilo(?:s)?|ton(?:elada)?s?|t|un(?:idade)?s?|peças?|pecas?|barras?|m(?:etros?)?)\b/i);
  return match ? match[1] : "";
}

function missingFields(form) {
  return [["nome do cliente ou empresa", form.client || form.company], ["forma de contato", form.phone || form.whatsapp || form.email], ["mensagem ou necessidade", form.message || form.notes], ["produto/material", form.product], ["quantidade", form.quantity], ["prazo desejado", form.deadline]].filter(([, value]) => !label(value)).map(([name]) => name);
}

export function analyzeAttendance(form, context) {
  const quantity = extractQuantity(form);
  const normalizedName = normalizeCommand(form.client || form.company);
  const existingCustomer = normalizedName ? context.customers.find((item) => normalizeCommand(item.nome).includes(normalizedName) || normalizedName.includes(normalizeCommand(item.nome))) : null;
  const classification = inferClassification({ ...form, quantity }, existingCustomer);
  const priority = inferPriority(form);
  const matches = findCatalogMatches(`${form.product} ${form.message}`, context.products).slice(0, 5);
  const normalized = { ...form, quantity, classification, priority };
  const missing = missingFields(normalized);
  const questions = missing.map((item) => `Você poderia informar ${item}?`);
  const nextStep = classification === "Pedido de orçamento" ? "Conferir os dados e preparar um orçamento." : matches.length ? "Validar a correspondência do produto com o cliente." : "Completar a qualificação antes de avançar.";
  return { form: normalized, existingCustomer, classification, priority, missing, questions, matches, nextStep, analyzedAt: new Date().toISOString() };
}

export function attendanceSummary(analysis) {
  const form = analysis.form;
  return [`ATENDIMENTO COMERCIAL — RASCUNHO LOCAL`, `Cliente: ${form.client || "Não informado"}`, `Empresa: ${form.company || "Não informada"}`, `Contato: ${form.whatsapp || form.phone || form.email || "Não informado"}`, `Localização: ${[form.city, form.state, form.country].filter(Boolean).join(" / ") || "Não informada"}`, `Classificação: ${analysis.classification}`, `Prioridade: ${analysis.priority}`, `Necessidade: ${form.message || form.notes || "Não informada"}`, `Produto/material: ${form.product || "Não informado"}`, `Quantidade: ${form.quantity ? `${form.quantity} ${form.unit}` : "Não informada"}`, `Prazo: ${form.deadline || "Não informado"}`, `Dados faltantes: ${analysis.missing.join(", ") || "Nenhum"}`, `Próximo passo sugerido: ${analysis.nextStep}`, `Conteúdo sujeito à conferência humana.`].join("\n");
}

export function suggestedResponse(analysis) {
  const name = analysis.form.client ? `, ${analysis.form.client.split(" ")[0]}` : "";
  if (analysis.missing.length) return `Olá${name}! Obrigado pelo contato. Para darmos continuidade, poderia nos informar ${analysis.missing.slice(0, 3).join(", ")}? Assim nossa equipe poderá analisar sua necessidade com precisão.`;
  return `Olá${name}! Obrigado pelas informações. Vamos conferir os dados de ${analysis.form.product || "sua solicitação"} e preparar o próximo passo comercial. Retornaremos após a análise da equipe.`;
}

export async function loadAttendanceHistory(companyId, userId) { if(!companyId||!userId)return[];const{data,error}=await supabase.from("ia_comercial_historico").select("*").eq("empresa_id",String(companyId)).eq("user_id",userId).order("created_at",{ascending:false}).limit(30);if(error)throw error;return(data||[]).map((row)=>({id:row.id,command:row.comando,result:row.resultado,attendance:row.atendimento,createdAt:row.created_at})) }
export async function saveAttendanceEntry(companyId,userId,entry){const{data,error}=await supabase.from("ia_comercial_historico").insert({empresa_id:String(companyId),user_id:userId,comando:entry.command,resultado:entry.result,atendimento:entry.attendance||null}).select("*").single();if(error)throw error;return{id:data.id,command:data.comando,result:data.resultado,attendance:data.atendimento,createdAt:data.created_at}}
export async function deleteAttendanceEntry(companyId,userId,id){const{error}=await supabase.from("ia_comercial_historico").delete().eq("id",id).eq("empresa_id",String(companyId)).eq("user_id",userId);if(error)throw error}
