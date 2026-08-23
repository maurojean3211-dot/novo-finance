-- SOMENTE LEITURA.
select c.relrowsecurity rls_habilitada
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='contas_fixas';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='public' and tablename='contas_fixas'
order by cmd, policyname;

select count(*) quantidade, empresa_id
from public.contas_fixas group by empresa_id order by empresa_id;

-- Executar futuramente também via sessões autenticadas de tenants distintos:
select id, empresa_id, descricao, valor, dia_vencimento, frequencia, ativo
from public.contas_fixas order by empresa_id, id;

-- O ID 3 deve continuar fisicamente preservado no legado e o ID 5 em Mauro.
select
  (select count(*) from public.contas_fixas
   where id=3 and empresa_id='becf3dd8-33d2-4412-bab6-559b264bed07'::uuid) id3_legado_preservado,
  (select count(*) from public.contas_fixas
   where id=5 and empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid) id5_mauro;
