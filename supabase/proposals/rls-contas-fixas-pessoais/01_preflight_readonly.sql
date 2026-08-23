-- SOMENTE LEITURA.
select c.relrowsecurity rls_habilitada
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'contas_fixas';

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'contas_fixas'
order by ordinal_position;

select empresa_id, count(*) quantidade
from public.contas_fixas group by empresa_id order by empresa_id;

-- Estado esperado depois do saneamento autorizado do ID 5:
-- empresa_nula=0, orfao_legado_id3=1, orfaos_inesperados=0,
-- sem_usuario_inesperado=0 e id5_mauro=1.
select
  count(*) filter (where cf.empresa_id is null) empresa_nula,
  count(*) filter (where cf.id = 3
    and cf.empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
    and cf.descricao = 'ALUGUEL APARTAMENTO'
    and cf.valor = 1947.64 and cf.dia_vencimento = 11
    and e.id is null and u.id is null) orfao_legado_id3,
  count(*) filter (where e.id is null and cf.id <> 3) orfaos_inesperados,
  count(*) filter (where u.id is null and cf.id <> 3) sem_usuario_inesperado,
  count(*) filter (where cf.id = 5
    and cf.empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
    and cf.descricao = 'ODONTOCOMPANY'
    and cf.valor = 49.90 and cf.dia_vencimento = 10) id5_mauro
from public.contas_fixas cf
left join public.empresas e on e.id = cf.empresa_id
left join lateral (
  select id from public.usuarios where empresa_id = cf.empresa_id limit 1
) u on true;

select id, empresa_id, descricao, valor, dia_vencimento, frequencia, ativo, created_at
from public.contas_fixas
where id in (3, 5, 7)
order by id;

select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'contas_fixas';
