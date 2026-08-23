-- SOMENTE LEITURA administrativa.
select policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename='contas_pagar' order by policyname;

-- Executar também sob cada identidade de teste: deve retornar apenas seu tenant.
select empresa_id,count(*) quantidade,sum(valor) valor
from public.contas_pagar group by empresa_id order by empresa_id;

-- Sob Mauro, esperado: somente 18 do tenant atual; o legado becf fica invisível.
select count(*) quantidade,count(distinct empresa_id) tenants
from public.contas_pagar;
