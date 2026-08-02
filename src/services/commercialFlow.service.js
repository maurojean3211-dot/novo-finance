import { supabase } from "../supabase";

// Fluxo legado preservado para futura chamada coordenada por Vendas.
// Não é executado automaticamente nesta etapa de consolidação.
export async function createSaleWithReceivables({ empresaId, clienteId, produto, quantidade, valor, dataVenda, parcelas, intervalo }) {
  const qtd = Number(quantidade) || 1;
  const valorTotal = (Number(valor) || 0) * qtd;
  const parcelasNum = Number(parcelas) || 1;
  const dataVendaFormatada = dataVenda ? new Date(`${dataVenda}T00:00:00`) : new Date();

  const { data: venda, error: erroVenda } = await supabase.from("vendas").insert([{ empresa_id: empresaId, cliente_id: clienteId, produto: produto || "", quantidade: qtd, valor_total: Number(valorTotal), parcelas: parcelasNum, data_venda: dataVendaFormatada.toISOString() }]).select().single();
  if (erroVenda) return { error: erroVenda, venda: null, recebimentos: [] };

  const intervaloSeguro = Math.max(1, Number(intervalo) || 30);
  const valorParcela = valorTotal / parcelasNum;
  const listaRecebimentos = Array.from({ length: parcelasNum }, (_, index) => {
    const vencimento = new Date(dataVendaFormatada);
    vencimento.setDate(vencimento.getDate() + ((index + 1) * intervaloSeguro));
    return { empresa_id: empresaId, cliente_id: clienteId, venda_id: venda.id, valor: Number(valorParcela), data_vencimento: vencimento.toISOString(), status: "pendente" };
  });

  const { data: recebimentos, error: erroRecebimentos } = await supabase.from("recebimentos").insert(listaRecebimentos).select();
  return { error: erroRecebimentos, venda, recebimentos: recebimentos || [] };
}
