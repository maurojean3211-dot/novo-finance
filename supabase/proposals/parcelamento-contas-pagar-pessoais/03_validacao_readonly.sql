-- SOMENTE LEITURA. Não cria parcelas de teste.
select column_name,data_type,is_nullable from information_schema.columns
where table_schema='public' and table_name='contas_pagar_pessoais'
 and column_name in ('grupo_parcelamento_id','parcela_numero','parcelas_total','valor_total_compra','periodicidade','idempotency_key')
order by column_name;

select conname,pg_get_constraintdef(oid) definicao from pg_constraint
where conrelid='public.contas_pagar_pessoais'::regclass
 and (conname like 'contas_pagar_pessoais_parcel%'
   or conname in ('contas_pagar_pessoais_valor_total_compra_check','contas_pagar_pessoais_periodicidade_check'))
order by conname;

select indexname,indexdef from pg_indexes where schemaname='public'
 and tablename='contas_pagar_pessoais'
 and indexname in ('contas_pagar_pessoais_grupo_parcela_key','contas_pagar_pessoais_idempotency_parcela_key','contas_pagar_pessoais_grupo_idx')
order by indexname;

select p.oid::regprocedure assinatura,p.prosecdef security_definer,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_executa,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_executa
from pg_proc p where p.oid=to_regprocedure('public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text)');

select count(*) total_registros,sum(valor) total_valor,
 count(*) filter(where status='Pago') pagos,count(*) filter(where status='Pendente') pendentes,
 count(*) filter(where status='Cancelada') canceladas,
 count(*) filter(where grupo_parcelamento_id is not null) registros_parcelados,
 count(*) filter(where grupo_parcelamento_id is null and
  (parcela_numero is not null or parcelas_total is not null or valor_total_compra is not null
   or periodicidade is not null or idempotency_key is not null)) historico_parcialmente_alterado
from public.contas_pagar_pessoais;

select empresa_id,proprietario_id,grupo_parcelamento_id,count(*) quantidade,
 min(parcela_numero) primeira,max(parcela_numero) ultima,max(parcelas_total) total_declarado,
 sum(valor) soma,max(valor_total_compra) valor_total
from public.contas_pagar_pessoais where grupo_parcelamento_id is not null
group by empresa_id,proprietario_id,grupo_parcelamento_id
having count(*)<>max(parcelas_total) or min(parcela_numero)<>1
 or max(parcela_numero)<>max(parcelas_total) or sum(valor)<>max(valor_total_compra);

