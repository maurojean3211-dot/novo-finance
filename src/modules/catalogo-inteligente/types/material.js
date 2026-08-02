export const MATERIAL_CATEGORIES = ["Perfis", "Tarugos", "Silício", "Insumos", "Chapas", "Outros"];
export const MATERIAL_UNITS = ["kg", "m", "barra", "peça", "unidade"];
export const MATERIAL_STATUS = ["Ativo", "Inativo", "Em revisão"];

export const MATERIAL_FIELDS = [
  "codigo", "descricao", "categoria", "liga", "tempera", "formato", "diametro",
  "largura", "altura", "espessura", "comprimento", "pesoPorMetro", "pesoPorBarra",
  "pesoUnitario", "unidade", "fornecedorPrincipal", "fornecedoresAlternativos",
  "precoCompra", "precoSugerido", "margemPadrao", "estoqueMinimo", "estoqueAtual",
  "localizacao", "observacoes", "status",
];

export function createEmptyMaterial() {
  return {
    codigo: "", descricao: "", categoria: "Perfis", liga: "", tempera: "", formato: "",
    diametro: "", largura: "", altura: "", espessura: "", comprimento: "",
    pesoPorMetro: "", pesoPorBarra: "", pesoUnitario: "", unidade: "kg",
    fornecedorPrincipal: "", fornecedoresAlternativos: "", precoCompra: "",
    precoSugerido: "", margemPadrao: "", estoqueMinimo: "", estoqueAtual: "",
    localizacao: "", observacoes: "", status: "Ativo",
  };
}
