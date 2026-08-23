-- PREFLIGHT REMOTO SOMENTE LEITURA.
-- Não cria objetos, não altera dados e não registra migration.

select
  count(*) as total,
  count(*) filter (where status = 'Pago') as pagos,
  count(*) filter (where status = 'Pendente') as pendentes,
  count(*) filter (where status = 'Cancelada') as cancelados,
  coalesce(sum(valor), 0) as total_nominal,
  count(*) filter (where grupo_parcelamento_id is not null) as parcelas_em_grupo,
  count(distinct grupo_parcelamento_id) filter (where grupo_parcelamento_id is not null) as grupos_reais,
  md5(string_agg(to_jsonb(p)::text, '|' order by id)) as fingerprint_obrigacoes
from public.contas_pagar_pessoais p;

select
  grupo_parcelamento_id,
  count(*) as parcelas,
  min(parcela_numero) as primeira_parcela,
  max(parcela_numero) as ultima_parcela,
  min(parcelas_total) as parcelas_total_min,
  max(parcelas_total) as parcelas_total_max,
  count(*) filter (where status = 'Pago') as pagas,
  count(*) filter (where status = 'Pendente') as pendentes,
  sum(valor) as total_nominal
from public.contas_pagar_pessoais
where grupo_parcelamento_id is not null
group by grupo_parcelamento_id
order by grupo_parcelamento_id;

select
  to_regclass('public.contas_pagar_pessoais_pagamento_eventos') as tabela_eventos,
  to_regprocedure('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)') as rpc_pagamento,
  to_regprocedure('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)') as rpc_estorno;

select table_name, column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'contas_pagar_pessoais' and column_name in (
      'id','empresa_id','proprietario_id','valor','status','grupo_parcelamento_id',
      'parcela_numero','parcelas_total','valor_pago','data_pagamento','desconto',
      'pagamento_id','entrada_id'
    ))
    or (table_name = 'despesas' and column_name in (
      'proprietario_id','conta_pagar_pessoal_id','pagamento_evento_id',
      'pagamento_pessoal_status','pagamento_pessoal_estornado_em'
    ))
  )
order by table_name, column_name;

select tablename, policyname, permissive, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('contas_pagar_pessoais', 'despesas')
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('contas_pagar_pessoais', 'despesas')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, grantee, privilege_type;

-- Guard consolidado esperado imediatamente antes da execução futura.
select
  (select count(*) from public.contas_pagar_pessoais) = 43 as total_ok,
  (select count(*) from public.contas_pagar_pessoais where status = 'Pago') = 21 as pagos_ok,
  (select count(*) from public.contas_pagar_pessoais where status = 'Pendente') = 22 as pendentes_ok,
  (select count(*) from public.contas_pagar_pessoais where status = 'Cancelada') = 0 as cancelados_ok,
  (select coalesce(sum(valor), 0) from public.contas_pagar_pessoais) = 41574.73 as nominal_ok,
  (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id is not null) = 24 as parcelas_ok,
  (select count(distinct grupo_parcelamento_id) from public.contas_pagar_pessoais where grupo_parcelamento_id is not null) = 1 as grupos_ok,
  to_regclass('public.contas_pagar_pessoais_pagamento_eventos') is null as tabela_eventos_ausente,
  to_regprocedure('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)') is null as rpc_pagamento_ausente,
  to_regprocedure('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)') is null as rpc_estorno_ausente,
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contas_pagar_pessoais'
      and column_name in ('valor_pago','data_pagamento','desconto','pagamento_id','entrada_id')
  ) as campos_pagamento_ausentes,
  (select array_agg(policyname order by policyname) from pg_policies
   where schemaname = 'public' and tablename = 'contas_pagar_pessoais') =
    array['contas_pagar_pessoais_delete_proprietario','contas_pagar_pessoais_insert_proprietario','contas_pagar_pessoais_select_proprietario','contas_pagar_pessoais_update_proprietario']::name[] as policies_contas_ok,
  (select array_agg(policyname order by policyname) from pg_policies
   where schemaname = 'public' and tablename = 'despesas') =
    array['despesas_delete_tenant','despesas_insert_tenant','despesas_select_tenant','despesas_update_tenant']::name[] as policies_despesas_ok;
