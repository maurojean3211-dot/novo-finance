-- PREFLIGHT ESTRITAMENTE SOMENTE LEITURA. Todos os campos *_ok devem retornar true.
select column_name,data_type,is_nullable,column_default from information_schema.columns
where table_schema='public' and table_name in ('despesas','usuarios') order by table_name,ordinal_position;

select policyname,cmd,roles,permissive,qual,with_check from pg_policies
where schemaname='public' and tablename='despesas' order by policyname;

select id,empresa_id,descricao,valor,data_lancamento,categoria,ativo,created_at,updated_at
from public.despesas where tipo='receita' order by data_lancamento,id;

select
 (select count(*) from public.despesas)=11 total_fisico_11_ok,
 (select count(*) from public.despesas where tipo='receita')=8 receitas_8_ok,
 (select coalesce(sum(valor),0) from public.despesas where tipo='receita')=14396 total_receitas_14396_ok,
 (select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.despesas d)='fe48fb20456c0ed9bb3b9a70fc26e5ae' fingerprint_total_ok,
 (select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.despesas d where tipo='receita')='4bf9a5ab8acf5c294ffeda87ebf26eb5' fingerprint_receitas_ok,
 not exists(select 1 from information_schema.columns where table_schema='public' and table_name='despesas'
  and column_name in ('recorrencia_id','competencia','frequencia','data_inicio','data_fim','status_recebimento')) despesas_sem_recorrencia_ok,
 exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='despesas' and c.relrowsecurity) despesas_rls_ok,
 (select array_agg(policyname order by policyname) from pg_policies where schemaname='public' and tablename='despesas')
  =array['despesas_delete_tenant','despesas_insert_tenant','despesas_select_tenant','despesas_update_tenant']::name[] policies_despesas_ok,
 not exists(select 1 from pg_policies where schemaname='public' and tablename='despesas' and (qual='true' or with_check='true')) sem_policy_ampla_ok,
 exists(select 1 from information_schema.columns where table_schema='public' and table_name='usuarios' and column_name='id' and data_type='uuid') usuarios_id_ok,
 exists(select 1 from information_schema.columns where table_schema='public' and table_name='usuarios' and column_name='empresa_id' and data_type='uuid') usuarios_empresa_ok,
 to_regclass('public.receitas_pessoais_recorrencias') is null tabela_series_ausente_ok,
 to_regclass('public.receitas_pessoais_competencias') is null tabela_competencias_ausente_ok,
 to_regclass('public.receitas_pessoais_competencia_eventos') is null tabela_eventos_ausente_ok,
 not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
  ('criar_receita_recorrente_pessoal','atualizar_receita_recorrente_pessoal','materializar_competencia_receita_pessoal',
   'editar_competencia_receita_pessoal','registrar_recebimento_receita_pessoal','cancelar_competencia_receita_pessoal',
   'reabrir_competencia_receita_pessoal')) rpcs_ausentes_ok;

-- Evidência de que não há alvo de conversão/backfill: somente leitura das oito receitas únicas.
select count(*)=8 as oito_receitas_unicas_preservaveis_ok,
 coalesce(sum(valor),0)=14396 as total_preservavel_ok
from public.despesas where tipo='receita';
