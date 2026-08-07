export const FUNNEL_STAGES = [
  "Novo contato",
  "Qualificação",
  "Proposta em preparação",
  "Proposta enviada",
  "Negociação",
  "Fechado — ganho",
  "Fechado — perdido",
];

export const PRIORITIES = ["Alta", "Média", "Baixa"];
export const ACTIVITY_TYPES = ["Ligação", "WhatsApp", "E-mail", "Reunião", "Visita", "Proposta enviada", "Observação", "Próximo retorno"];
export const OPEN_STAGES = FUNNEL_STAGES.slice(0, 5);

export const EMPTY_OPPORTUNITY = {
  empresa: "", contatoPrincipal: "", telefone: "", whatsapp: "", email: "",
  cidade: "", estado: "", pais: "", segmento: "", origemLead: "", vendedorResponsavel: "", clienteId: null,
  produtoInteresse: "", quantidade: "", unidade: "kg", valorEstimado: "", pesoEstimado: "", probabilidade: "",
  etapa: FUNNEL_STAGES[0], prioridade: "Média", proximoContato: "", observacoes: "",
  motivoPerda: "", status: "Ativa",
};
