const today = new Date();
const iso = (offset) => { const date = new Date(today); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10); };
export const DEMO_INCOMES = [
  { id: 1, tipo: "Salário", descricao: "Remuneração mensal", fontePagadora: "Empresa demonstrativa", competencia: "08/2026", dataPrevista: iso(2), dataRecebida: "", valorBruto: 9200, descontos: 1180, status: "Prevista", categoria: "Renda principal", observacoes: "Dados somente em memória." },
  { id: 2, tipo: "Comissão", descricao: "Comissão comercial", fontePagadora: "Cunha", competencia: "07/2026", dataPrevista: iso(-3), dataRecebida: iso(-2), valorBruto: 2480, descontos: 0, status: "Recebida", categoria: "Comissões", observacoes: "Integração com Vendas ainda não implementada." },
  { id: 3, tipo: "Renda extra", descricao: "Projeto eventual", fontePagadora: "Cliente particular", competencia: "08/2026", dataPrevista: iso(8), dataRecebida: "", valorBruto: 1350, descontos: 0, status: "Prevista", categoria: "Renda extra", observacoes: "" },
];
export const DEMO_MONTHS = [
  { month: "Mar", income: 10400, expense: 7120 }, { month: "Abr", income: 9800, expense: 6840 },
  { month: "Mai", income: 11200, expense: 7460 }, { month: "Jun", income: 10800, expense: 7210 },
  { month: "Jul", income: 12150, expense: 7930 }, { month: "Ago", income: 13030, expense: 8210 },
];
export const DEMO_COMMISSIONS = [
  { company: "Empresa demonstrativa", sale: "VEN-0142", client: "Metalúrgica Horizonte", product: "Tarugo 6063", quantity: "4.200 kg", percentage: "0,05/kg", expected: 210, dueDate: iso(12), status: "Prevista" },
  { company: "Empresa demonstrativa", sale: "VEN-0138", client: "Alumitech", product: "Perfil industrial", quantity: "1.850 kg", percentage: "0,05/kg", expected: 92.5, dueDate: iso(-4), status: "Recebida" },
];
