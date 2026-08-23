-- SOMENTE LEITURA.
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename='contas_pagar'
order by policyname;

select empresa_id,count(*) quantidade,sum(valor) valor
from public.contas_pagar group by empresa_id order by empresa_id;

select id,nome,email,empresa_id from public.usuarios order by empresa_id,id;

select c.empresa_id,count(*) contas_sem_usuario_vinculado
from public.contas_pagar c
where not exists (select 1 from public.usuarios u where u.empresa_id=c.empresa_id)
group by c.empresa_id order by c.empresa_id;
