alter table public.usuarios
  add column valor_mensal numeric(14,2) not null default 0
  check (valor_mensal >= 0);
