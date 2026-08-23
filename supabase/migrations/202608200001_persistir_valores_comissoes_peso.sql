alter table public.vendas
  add column if not exists valor_por_kg numeric(14,4),
  add column if not exists comissao_por_kg numeric(14,4);

alter table public.compras
  add column if not exists valor_por_kg numeric(14,4),
  add column if not exists valor numeric(14,2),
  add column if not exists comissao_por_kg numeric(14,4);
