function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function itemCost(item) {
  const commercial = item.dadosCatalogo?.commercial || {};
  const unitCost = number(item.custo || commercial.costPerPiece || commercial.costPerKg || commercial.costPerMeter);
  return unitCost * number(item.quantidade);
}

function scenario(totalCost, margin) {
  return { nome: `Margem ${margin}%`, valor: totalCost > 0 ? totalCost / (1 - margin / 100) : 0, margem: margin };
}

export function simulatePricing({ items = [], desconto = 0, frete = 0, impostos = 0, despesas = 0 }) {
  const subtotal = items.reduce((sum, item) => sum + number(item.preco) * number(item.quantidade), 0);
  const custoItens = items.reduce((sum, item) => sum + itemCost(item), 0);
  const descontoValor = subtotal * (number(desconto) / 100);
  const custosAdicionais = number(frete) + number(impostos) + number(despesas);
  const precoFinal = subtotal - descontoValor + custosAdicionais;
  const custoTotal = custoItens + custosAdicionais;
  const lucroBruto = precoFinal - custoTotal;
  const margemBruta = precoFinal > 0 ? (lucroBruto / precoFinal) * 100 : 0;
  const pesoTotal = items.reduce((sum, item) => sum + number(item.pesoTotal), 0);
  return {
    custoItens, custoKg: pesoTotal > 0 ? custoItens / pesoTotal : 0, frete: number(frete),
    impostos: number(impostos), despesas: number(despesas), subtotal, desconto: number(desconto),
    descontoValor, custoTotal, lucroBruto, margemBruta, margemLiquida: margemBruta,
    markup: custoTotal > 0 ? precoFinal / custoTotal : 0, precoSugerido: precoFinal, precoFinal,
    rentabilidade: custoTotal > 0 ? (lucroBruto / custoTotal) * 100 : 0,
    cenarios: [scenario(custoTotal, 10), scenario(custoTotal, 20), scenario(custoTotal, 30)],
  };
}
