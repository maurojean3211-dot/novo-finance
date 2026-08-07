export const PROSPECT_STATUSES = [
  "Novo", "A pesquisar", "Contato pendente", "Contato realizado", "Aguardando retorno",
  "Qualificado", "Proposta em preparação", "Proposta enviada", "Negociação",
  "Convertido em cliente", "Sem interesse", "Arquivado",
];

export const INTERACTION_TYPES = ["Ligação", "WhatsApp", "E-mail", "Reunião", "Visita", "Proposta enviada", "Retorno recebido", "Outro"];
export const INTEREST_PRODUCTS = ["Tarugo", "Perfil", "Cavaco", "Limalha", "Sucata", "Alumínio primário", "Alumínio secundário", "Serviços", "Outros"];
export const PRIORITIES = ["Alta", "Média", "Baixa"];
export const COMPANY_SIZES = ["Micro", "Pequena", "Média", "Grande"];
export const CONTACT_PREFERENCES = ["Telefone", "WhatsApp", "E-mail", "Reunião"];
export const ORIGINS = ["Indicação", "Site", "Feira industrial", "Prospecção ativa", "Carteira antiga", "Outro"];

export const EMPTY_PROSPECT = {
  razaoSocial: "", nomeFantasia: "", cnpj: "", segmento: "", porte: "", site: "", pais: "", countryCode: "", cidade: "", estado: "", region: "", endereco: "", codigoPostal: "", postalCode: "",
  idiomaPreferencial: "pt-BR", preferredLocale: "pt-BR", moedaPreferencial: "BRL", preferredCurrency: "BRL", fusoHorario: "", timeZone: "", representante: "",
  origem: "", responsavel: "", status: "Novo", contatoNome: "", contatoCargo: "", telefone: "", whatsapp: "", email: "",
  contatoPreferido: "", produtosInteresse: [], necessidade: "", volumeEstimado: "", unidade: "kg", frequenciaCompra: "",
  fornecedorAtual: "", prazoEsperado: "", regiaoAtendimento: "", potencial: "", observacoes: "", proximoRetornoEm: "",
  retornoPrioridade: "Média", retornoObservacao: "", interacoes: [], arquivado: false,
};

export const EMPTY_FILTERS = {
  search: "", status: "", segmento: "", pais: "", cidade: "", estado: "", idioma: "", moeda: "", responsavel: "", produto: "", origem: "",
  ultimaInteracao: "", proximoRetorno: "", retornoVencido: false, semContatoRecente: false,
};
