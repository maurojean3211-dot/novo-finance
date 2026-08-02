export function demoWeightTotal(item) { return Number(item.pesoTotal || item.pesoUnitario * item.quantidade || 0); }
