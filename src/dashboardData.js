export const indicadoresExecutivos = [
  { label: "Faturamento do mês", value: "R$ 684.250", trend: "+12,4% vs. mês anterior", trendType: "positive", icon: "revenue", tone: "blue" },
  { label: "Pedidos em andamento", value: "38", trend: "12 para expedição", trendType: "neutral", icon: "orders", tone: "violet" },
  { label: "Orçamentos em retorno", value: "24", trend: "R$ 418 mil em aberto", trendType: "warning", icon: "quotes", tone: "amber" },
  { label: "Meta atingida", value: "82%", trend: "+7,2 p.p. no período", trendType: "positive", icon: "target", tone: "green" },
  { label: "Contas a receber", value: "R$ 326.800", trend: "R$ 42 mil vencem hoje", trendType: "neutral", icon: "receive", tone: "cyan" },
  { label: "Contas a pagar", value: "R$ 184.200", trend: "8 títulos esta semana", trendType: "warning", icon: "pay", tone: "rose" },
  { label: "Clientes ativos", value: "186", trend: "+11 novos neste mês", trendType: "positive", icon: "clients", tone: "indigo" },
  { label: "Margem média", value: "18,6%", trend: "+1,4 p.p. no período", trendType: "positive", icon: "margin", tone: "emerald" },
];

export const faturamentoMensal = [
  { mes: "Set", valor: 146000 }, { mes: "Out", valor: 174000 }, { mes: "Nov", valor: 168000 },
  { mes: "Dez", valor: 205000 }, { mes: "Jan", valor: 182000 }, { mes: "Fev", valor: 214000 },
  { mes: "Mar", valor: 232000 }, { mes: "Abr", valor: 228000 }, { mes: "Mai", valor: 267000 },
  { mes: "Jun", valor: 291000 }, { mes: "Jul", valor: 312000 }, { mes: "Ago", valor: 338000 },
];

export const rankingVendedores = [
  { posicao: 1, nome: "Maria Ferreira", faturamento: 240000, meta: 108, comparacao: "+18% no mês" },
  { posicao: 2, nome: "João Martins", faturamento: 180000, meta: 92, comparacao: "+9% no mês" },
  { posicao: 3, nome: "Carlos Souza", faturamento: 135000, meta: 81, comparacao: "+4% no mês" },
  { posicao: 4, nome: "Ana Ribeiro", faturamento: 108000, meta: 74, comparacao: "−2% no mês" },
];

export const orcamentosRecentes = [
  { numero: "ORC-1084", cliente: "Metal Forte", vendedor: "Maria", valor: 84200, data: "01/08/26", validade: "08/08/26", status: "Aguardando retorno", statusId: "waiting" },
  { numero: "ORC-1083", cliente: "Alumax Indústria", vendedor: "João", valor: 129500, data: "31/07/26", validade: "07/08/26", status: "Enviado", statusId: "sent" },
  { numero: "ORC-1082", cliente: "Fundição Sul", vendedor: "Carlos", valor: 47600, data: "30/07/26", validade: "06/08/26", status: "Aprovado", statusId: "approved" },
  { numero: "ORC-1081", cliente: "Perfil Center", vendedor: "Ana", valor: 28300, data: "29/07/26", validade: "05/08/26", status: "Em elaboração", statusId: "draft" },
  { numero: "ORC-1080", cliente: "Nova Liga", vendedor: "Maria", valor: 63200, data: "27/07/26", validade: "03/08/26", status: "Vencido", statusId: "expired" },
];

export const mensagensIa = [
  { texto: "Existem 5 pedidos aguardando orçamento.", tipo: "info" },
  { texto: "Dois clientes estão sem contato há mais de 45 dias.", tipo: "warning" },
  { texto: "Um produto está com estoque abaixo do mínimo.", tipo: "danger" },
  { texto: "Há três oportunidades acima de R$ 100.000.", tipo: "success" },
];

export const financeiroResumo = [
  { label: "Contas vencendo hoje", valor: "R$ 42.350", detalhe: "6 lançamentos", tone: "warning" },
  { label: "Recebimentos previstos", valor: "R$ 68.900", detalhe: "para hoje", tone: "positive" },
  { label: "Inadimplência", valor: "R$ 18.420", detalhe: "2,7% da carteira", tone: "danger" },
  { label: "Saldo projetado", valor: "R$ 512.740", detalhe: "próximos 30 dias", tone: "positive" },
];

export const estoqueCritico = [
  { produto: "Perfil 50 × 30 Natural", saldo: "86 kg", minimo: "120 kg", situacao: "Crítico", tipo: "critical" },
  { produto: "Silício Metálico 553", saldo: "420 kg", minimo: "500 kg", situacao: "Baixo", tipo: "low" },
  { produto: "Perfil U 2” Anodizado", saldo: "54 barras", minimo: "60 barras", situacao: "Atenção", tipo: "attention" },
  { produto: "Desgaseificante em pastilha", saldo: "18 cx", minimo: "20 cx", situacao: "Atenção", tipo: "attention" },
];

export const atividadesComerciais = [
  { icon: "↗", quantidade: 12, label: "Retornos pendentes" },
  { icon: "◷", quantidade: 4, label: "Reuniões agendadas" },
  { icon: "⌖", quantidade: 3, label: "Visitas comerciais" },
  { icon: "◇", quantidade: 9, label: "Propostas para acompanhar" },
];

export const operacoesDisponiveis = [
  { icon: "◇", label: "Novo orçamento", description: "Preparar uma proposta comercial" },
  { icon: "↗", label: "Nova venda", description: "Registrar uma nova venda" },
  { icon: "▤", label: "Novo pedido", description: "Criar um pedido comercial" },
  { icon: "▣", label: "Nova compra", description: "Iniciar aquisição de material" },
  { icon: "＋", label: "Novo cliente", description: "Cadastrar uma empresa cliente" },
  { icon: "PDF", label: "Importar PDF", description: "Analisar arquivo em PDF" },
  { icon: "XLS", label: "Importar Excel", description: "Importar uma planilha" },
  { icon: "▦", label: "Importar catálogo", description: "Atualizar catálogo técnico" },
  { icon: "▥", label: "Importar estoque", description: "Preparar atualização de estoque" },
];
