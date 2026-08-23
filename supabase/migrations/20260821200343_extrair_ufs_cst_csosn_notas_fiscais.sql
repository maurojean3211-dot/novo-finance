alter table public.empresa_notas_fiscais_tributarias
  add column if not exists uf_emitente text check (uf_emitente is null or uf_emitente ~ '^[A-Z]{2}$'),
  add column if not exists uf_destinatario text check (uf_destinatario is null or uf_destinatario ~ '^[A-Z]{2}$');

alter table public.empresa_nota_fiscal_itens
  add column if not exists cst_icms text check (cst_icms is null or cst_icms ~ '^[0-9]{2,3}$'),
  add column if not exists csosn_icms text check (csosn_icms is null or csosn_icms ~ '^[0-9]{3}$');

comment on column public.empresa_notas_fiscais_tributarias.uf_emitente is 'UF do emitente extraída do documento; nula quando não identificada.';
comment on column public.empresa_notas_fiscais_tributarias.uf_destinatario is 'UF do destinatário extraída do documento; nula quando não identificada.';
comment on column public.empresa_nota_fiscal_itens.cst_icms is 'CST do ICMS extraído do item; nulo quando não identificado.';
comment on column public.empresa_nota_fiscal_itens.csosn_icms is 'CSOSN do ICMS extraído do item; nulo quando não identificado.';
