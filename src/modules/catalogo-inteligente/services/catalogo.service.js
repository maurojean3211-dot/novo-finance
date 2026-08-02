const catalogoDemonstrativo = [
  { id: "mat-001", codigo: "PF-5030-N", descricao: "Perfil 50 × 30 Natural", categoria: "Perfis", liga: "6063", tempera: "T5", formato: "Retangular", diametro: "", largura: 50, altura: 30, espessura: 2, comprimento: 6000, pesoPorMetro: 0.84, pesoPorBarra: 5.04, pesoUnitario: "", unidade: "barra", fornecedorPrincipal: "Alumax", fornecedoresAlternativos: "Metal Forte", precoCompra: 21.4, precoSugerido: 29.9, margemPadrao: 28.4, estoqueMinimo: 120, estoqueAtual: 86, localizacao: "A-01-03", observacoes: "Reposição prioritária.", status: "Ativo", atualizadoEm: "01/08/2026" },
  { id: "mat-002", codigo: "PF-U2-AN", descricao: "Perfil U 2” Anodizado", categoria: "Perfis", liga: "6063", tempera: "T6", formato: "U", diametro: "", largura: 50.8, altura: 25, espessura: 2.2, comprimento: 6000, pesoPorMetro: 0.71, pesoPorBarra: 4.26, pesoUnitario: "", unidade: "barra", fornecedorPrincipal: "Perfil Center", fornecedoresAlternativos: "Alumax", precoCompra: 24.8, precoSugerido: 34.2, margemPadrao: 27.5, estoqueMinimo: 60, estoqueAtual: 54, localizacao: "A-02-01", observacoes: "Acabamento anodizado fosco.", status: "Ativo", atualizadoEm: "31/07/2026" },
  { id: "mat-003", codigo: "TR-6061-178", descricao: "Tarugo de Alumínio Ø 178 mm", categoria: "Tarugos", liga: "6061", tempera: "Homogeneizado", formato: "Cilíndrico", diametro: 178, largura: "", altura: "", espessura: "", comprimento: 5800, pesoPorMetro: 67.2, pesoPorBarra: 389.8, pesoUnitario: "", unidade: "kg", fornecedorPrincipal: "Liga Brasil", fornecedoresAlternativos: "Metal Forte", precoCompra: 18.9, precoSugerido: 24.5, margemPadrao: 22.9, estoqueMinimo: 0, estoqueAtual: 0, localizacao: "Sob encomenda", observacoes: "Material sob encomenda.", status: "Ativo", atualizadoEm: "29/07/2026" },
  { id: "mat-004", codigo: "SI-553", descricao: "Silício Metálico 553", categoria: "Silício", liga: "553", tempera: "", formato: "Granulado", diametro: "", largura: "", altura: "", espessura: "", comprimento: "", pesoPorMetro: "", pesoPorBarra: "", pesoUnitario: 25, unidade: "kg", fornecedorPrincipal: "Fundição Sul", fornecedoresAlternativos: "Nova Liga", precoCompra: 12.7, precoSugerido: 16.8, margemPadrao: 24.4, estoqueMinimo: 500, estoqueAtual: 420, localizacao: "B-04-02", observacoes: "Sacos de 25 kg.", status: "Ativo", atualizadoEm: "28/07/2026" },
  { id: "mat-005", codigo: "INS-DESG-01", descricao: "Desgaseificante em pastilha", categoria: "Insumos", liga: "", tempera: "", formato: "Pastilha", diametro: 50, largura: "", altura: "", espessura: 20, comprimento: "", pesoPorMetro: "", pesoPorBarra: "", pesoUnitario: 0.2, unidade: "unidade", fornecedorPrincipal: "Química Metal", fornecedoresAlternativos: "Fundição Sul", precoCompra: 8.2, precoSugerido: 12.5, margemPadrao: 34.4, estoqueMinimo: 20, estoqueAtual: 18, localizacao: "C-01-04", observacoes: "Armazenar em local seco.", status: "Ativo", atualizadoEm: "25/07/2026" },
  { id: "mat-006", codigo: "CH-5052-2MM", descricao: "Chapa 5052 H32 2 mm", categoria: "Chapas", liga: "5052", tempera: "H32", formato: "Chapa", diametro: "", largura: 1250, altura: "", espessura: 2, comprimento: 3000, pesoPorMetro: "", pesoPorBarra: "", pesoUnitario: 20.25, unidade: "peça", fornecedorPrincipal: "Metal Forte", fornecedoresAlternativos: "Alumax", precoCompra: 645, precoSugerido: 825, margemPadrao: 21.8, estoqueMinimo: 12, estoqueAtual: 24, localizacao: "D-02-01", observacoes: "Filme protetivo em uma face.", status: "Ativo", atualizadoEm: "22/07/2026" },
  { id: "mat-007", codigo: "PF-2020-B", descricao: "Perfil 20 × 20 Branco", categoria: "Perfis", liga: "6063", tempera: "T5", formato: "Quadrado", diametro: "", largura: 20, altura: 20, espessura: 1.5, comprimento: 6000, pesoPorMetro: 0.31, pesoPorBarra: 1.86, pesoUnitario: "", unidade: "barra", fornecedorPrincipal: "Perfil Center", fornecedoresAlternativos: "", precoCompra: 19.6, precoSugerido: 27.4, margemPadrao: 28.5, estoqueMinimo: 100, estoqueAtual: 184, localizacao: "A-03-02", observacoes: "Pintura branca RAL 9003.", status: "Em revisão", atualizadoEm: "20/07/2026" },
  { id: "mat-008", codigo: "INS-ESC-02", descricao: "Escorificante para alumínio", categoria: "Insumos", liga: "", tempera: "", formato: "Pó", diametro: "", largura: "", altura: "", espessura: "", comprimento: "", pesoPorMetro: "", pesoPorBarra: "", pesoUnitario: 10, unidade: "kg", fornecedorPrincipal: "Química Metal", fornecedoresAlternativos: "", precoCompra: 14.3, precoSugerido: 20.9, margemPadrao: 31.6, estoqueMinimo: 30, estoqueAtual: 42, localizacao: "C-02-03", observacoes: "Embalagem de 10 kg.", status: "Inativo", atualizadoEm: "18/07/2026" },
];

export function getCatalogoDemonstrativo() {
  return catalogoDemonstrativo.map((material) => ({ ...material }));
}

export function filterAndSortMaterials(materials, { search, category, status, sortBy }) {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = materials.filter((material) => {
    const matchesTerm = !term || [material.codigo, material.descricao, material.liga, material.fornecedorPrincipal].some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(term));
    return matchesTerm && (category === "Todas" || material.categoria === category) && (status === "Todos" || material.status === status);
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === "descricao") return a.descricao.localeCompare(b.descricao, "pt-BR");
    if (sortBy === "estoque") return Number(a.estoqueAtual || 0) - Number(b.estoqueAtual || 0);
    if (sortBy === "preco") return Number(b.precoSugerido || 0) - Number(a.precoSugerido || 0);
    return a.codigo.localeCompare(b.codigo, "pt-BR");
  });
}
