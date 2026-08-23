import { normalizeCommand, parseCommercialIntent } from "../utils/commercialIntentParser";

const insufficient = "Não há informações suficientes no sistema para concluir esta análise.";
const todayIso = () => new Date().toISOString().slice(0, 10);
const recentLimit = (days) => { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); };

export function buildDailySummary(context) {
  const today = todayIso();
  const recent = recentLimit(7);
  const returns = context.agenda.filter((item) => item.origin === "Prospecção" && item.date === today).length;
  const prospects = context.prospects.filter((item) => String(item.createdAt || "").slice(0, 10) >= recent).length;
  const customers = context.customers.filter((item) => String(item.created_at || "").slice(0, 10) >= recent).length;
  const sales = context.sales.filter((item) => String(item.data_venda || "").slice(0, 10) >= recent).length;
  const activities = context.agenda.filter((item) => item.date === today).length;
  const priorityAlerts = context.receivables.filter((item) => !["pago", "recebido"].includes(String(item.status || "").toLowerCase()) && String(item.data_vencimento || "").slice(0, 10) <= today).length;
  if (!(returns || prospects || customers || sales || activities || priorityAlerts)) return { title: "Resumo comercial do dia", message: "Não há atividades comerciais relevantes registradas para hoje.", source: "Resumo local", items: [] };
  return { title: "Resumo comercial do dia", message: "Consolidação local dos registros disponíveis.", source: "Resumo local", items: [
    `Retornos programados: ${returns}`,
    `Novos prospects (7 dias): ${prospects}`,
    `Novos clientes (7 dias): ${customers}`,
    `Vendas recentes (7 dias): ${sales}`,
    `Atividades de hoje: ${activities}`,
    `Alertas prioritários: ${priorityAlerts}`,
  ] };
}

function productMatches(command, products) {
  const terms = normalizeCommand(command).split(/\s+/).filter((term) => term.length > 2 && !["produto", "material", "catalogo", "localizar", "mostrar"].includes(term));
  return products.filter((product) => {
    const text = normalizeCommand([product.name, product.description, product.supplierCode, product.marketCode, product.category, product.technical?.alloy, product.technical?.temper].filter(Boolean).join(" "));
    return terms.length > 0 && terms.some((term) => text.includes(term));
  }).slice(0, 5);
}

export function analyzeCommercialCommand(command, context) {
  const parsed = parseCommercialIntent(command);
  if (!parsed.original) return { title: "Solicitação não informada", message: insufficient, source: "Sugestão", items: [] };
  if (parsed.intent === "summary") return buildDailySummary(context);
  if (parsed.intent === "client") return context.customers.length ? { title: "Contexto de clientes", message: `${context.customers.length} cliente(s) disponível(is) para análise individual. Selecione um contato no painel de contexto.`, source: "Cliente · dado real", items: [] } : { title: "Contexto de clientes", message: insufficient, source: "Cliente", items: [] };
  if (parsed.intent === "prospect" || parsed.intent === "return") {
    const scheduled = context.prospects.filter((item) => item.proximoRetornoEm);
    return scheduled.length ? { title: "Retornos da prospecção", message: `${scheduled.length} prospect(s) possuem retorno registrado.`, source: "Prospecção · dado real", items: scheduled.slice(0, 5).map((item) => `${item.nomeFantasia || item.razaoSocial || item.contatoNome} — ${String(item.proximoRetornoEm).slice(0, 10)}`) } : { title: "Retornos da prospecção", message: insufficient, source: "Prospecção", items: [] };
  }
  if (parsed.intent === "product") {
    const matches = productMatches(command, context.products);
    return matches.length ? { title: "Correspondências no catálogo", message: `${matches.length} possível(is) correspondência(s) localizada(s). Confira os dados antes de usar.`, source: "Catálogo · sugestão local", items: matches.map((item) => item.name || item.description || item.supplierCode) } : { title: "Correspondências no catálogo", message: insufficient, source: "Catálogo", items: [] };
  }
  if (parsed.intent === "sale" || parsed.intent === "purchase") {
    const records = parsed.intent === "sale" ? context.sales : context.purchases;
    const label = parsed.intent === "sale" ? "Vendas" : "Compras";
    return records.length ? { title: `Resumo de ${label.toLowerCase()}`, message: `${records.length} registro(s) disponível(is) no sistema.`, source: `${label} · dado real`, items: records.slice(-5).map((item) => `${item.cliente_nome || item.fornecedor || "Registro"} — ${item.produto || "produto não informado"}`) } : { title: label, message: insufficient, source: label, items: [] };
  }
  if (parsed.intent === "opportunity" || parsed.intent === "budget") { const rows=context.opportunities||[];return rows.length?{title:parsed.intent==="opportunity"?"Oportunidades":"Apoio ao orçamento",message:`${rows.length} oportunidade(s) real(is) disponível(is) no CRM.`,source:"CRM · dado real",items:rows.slice(0,5).map((item)=>`${item.empresa} — ${item.etapa} — ${item.produtoInteresse||"produto não informado"}`)}:{title:"Oportunidades",message:insufficient,source:"CRM",items:[]}; }
  return { title: "Análise comercial", message: insufficient, source: "Dados comerciais reais", items: [] };
}

export function findCatalogMatches(query, products) {
  return productMatches(query, products);
}
