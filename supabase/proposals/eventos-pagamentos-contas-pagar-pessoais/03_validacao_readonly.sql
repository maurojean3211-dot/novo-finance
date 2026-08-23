-- VALIDAÇÃO PÓS-APLICAÇÃO SOMENTE LEITURA. Não cria eventos.

select c.relrowsecurity as rls_habilitada, c.relforcerowsecurity as rls_forcada
from pg_class c
where c.oid = 'public.contas_pagar_pessoais_pagamento_eventos'::regclass;

select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'contas_pagar_pessoais_pagamento_eventos'
order by ordinal_position;

select conname, contype, pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = 'public.contas_pagar_pessoais_pagamento_eventos'::regclass
order by conname;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('contas_pagar_pessoais','contas_pagar_pessoais_pagamento_eventos')
  and indexname in (
    'contas_pagar_pessoais_scope_key','cpp_pag_eventos_conta_idx',
    'cpp_pag_eventos_tipo_data_idx','cpp_pag_eventos_idempotency_key',
    'cpp_pag_eventos_estorno_unico_key','cpp_pag_eventos_scope_key'
  )
order by indexname;

select policyname, permissive, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'contas_pagar_pessoais_pagamento_eventos'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'contas_pagar_pessoais_pagamento_eventos'
  and grantee in ('anon','authenticated','PUBLIC')
order by grantee, privilege_type;

select
  p.oid::regprocedure as funcao,
  p.prosecdef as security_definer,
  p.proconfig as configuracao,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_executa,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_executa
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.oid in (
    'public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)'::regprocedure,
    'public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)'::regprocedure
  )
order by p.proname;

select count(*) as eventos_iniciais
from public.contas_pagar_pessoais_pagamento_eventos;

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

-- Guard consolidado esperado imediatamente após a migration estrutural.
select
  to_regclass('public.contas_pagar_pessoais_pagamento_eventos') is not null as tabela_criada,
  (select count(*) from public.contas_pagar_pessoais_pagamento_eventos) = 0 as zero_eventos,
  (select count(*) from public.contas_pagar_pessoais) = 43 as obrigacoes_preservadas,
  (select count(*) from public.contas_pagar_pessoais where status = 'Pago') = 21 as pagos_preservados,
  (select count(*) from public.contas_pagar_pessoais where status = 'Pendente') = 22 as pendentes_preservados,
  (select coalesce(sum(valor), 0) from public.contas_pagar_pessoais) = 41574.73 as nominal_preservado,
  (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id is not null) = 24 as parcelas_preservadas,
  (select relrowsecurity from pg_class where oid = 'public.contas_pagar_pessoais_pagamento_eventos'::regclass) as rls_habilitada,
  (select array_agg(policyname order by policyname) from pg_policies
   where schemaname = 'public' and tablename = 'contas_pagar_pessoais_pagamento_eventos') =
    array['cpp_pag_eventos_insert_tenant','cpp_pag_eventos_select_tenant']::name[] as policies_exatas,
  not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contas_pagar_pessoais_pagamento_eventos'
      and cmd in ('UPDATE','DELETE')
  ) as append_only_sem_policy_update_delete,
  not has_table_privilege('authenticated','public.contas_pagar_pessoais_pagamento_eventos','UPDATE') as authenticated_sem_update,
  not has_table_privilege('authenticated','public.contas_pagar_pessoais_pagamento_eventos','DELETE') as authenticated_sem_delete,
  not has_table_privilege('anon','public.contas_pagar_pessoais_pagamento_eventos','SELECT') as anon_sem_select,
  not has_table_privilege('anon','public.contas_pagar_pessoais_pagamento_eventos','INSERT') as anon_sem_insert;
