-- ROLLBACK ESTRUTURAL FUTURO. Só é seguro antes do primeiro uso.
begin;
do $guards$
declare v_functions name[]; v_policies text[];
begin
 if to_regclass('public.receitas_pessoais_recorrencias') is null
    or to_regclass('public.receitas_pessoais_competencias') is null
    or to_regclass('public.receitas_pessoais_competencia_eventos') is null
 then raise exception 'ABORTADO: estrutura ausente ou parcial'; end if;
 if (select count(*) from public.receitas_pessoais_recorrencias)<>0
    or (select count(*) from public.receitas_pessoais_competencias)<>0
    or (select count(*) from public.receitas_pessoais_competencia_eventos)<>0
 then raise exception 'ABORTADO: existe histórico; rollback destrutivo proibido, usar roll-forward'; end if;
 select array_agg(p.proname order by p.proname) into v_functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in
  ('criar_receita_recorrente_pessoal','atualizar_receita_recorrente_pessoal','materializar_competencia_receita_pessoal',
   'editar_competencia_receita_pessoal','registrar_recebimento_receita_pessoal','cancelar_competencia_receita_pessoal',
   'reabrir_competencia_receita_pessoal');
 if v_functions is distinct from array['atualizar_receita_recorrente_pessoal','cancelar_competencia_receita_pessoal',
  'criar_receita_recorrente_pessoal','editar_competencia_receita_pessoal','materializar_competencia_receita_pessoal',
  'reabrir_competencia_receita_pessoal','registrar_recebimento_receita_pessoal']::name[]
 then raise exception 'ABORTADO: conjunto de RPCs divergiu: %',v_functions; end if;
 select array_agg(tablename||'.'||policyname order by tablename,policyname) into v_policies from pg_policies
  where schemaname='public' and tablename in
  ('receitas_pessoais_recorrencias','receitas_pessoais_competencias','receitas_pessoais_competencia_eventos');
 if v_policies is distinct from array[
  'receitas_pessoais_competencia_eventos.receitas_comp_eventos_insert_owner',
  'receitas_pessoais_competencia_eventos.receitas_comp_eventos_select_owner',
  'receitas_pessoais_competencias.receitas_competencias_insert_owner',
  'receitas_pessoais_competencias.receitas_competencias_select_owner',
  'receitas_pessoais_competencias.receitas_competencias_update_owner',
  'receitas_pessoais_recorrencias.receitas_recorrencias_insert_owner',
  'receitas_pessoais_recorrencias.receitas_recorrencias_select_owner',
  'receitas_pessoais_recorrencias.receitas_recorrencias_update_owner']::text[]
 then raise exception 'ABORTADO: conjunto de policies divergiu: %',v_policies; end if;
end $guards$;

drop function public.reabrir_competencia_receita_pessoal(uuid,uuid,date,text,uuid);
drop function public.cancelar_competencia_receita_pessoal(uuid,uuid,date,text,uuid);
drop function public.registrar_recebimento_receita_pessoal(uuid,uuid,numeric,date,text,uuid);
drop function public.editar_competencia_receita_pessoal(uuid,uuid,integer,date,numeric,text);
drop function public.materializar_competencia_receita_pessoal(uuid,uuid,date,uuid);
drop function public.atualizar_receita_recorrente_pessoal(uuid,uuid,integer,text,numeric,text,integer,date,date,text,boolean);
drop function public.criar_receita_recorrente_pessoal(uuid,text,numeric,text,integer,date,date,text,uuid);
drop table public.receitas_pessoais_competencia_eventos;
drop table public.receitas_pessoais_competencias;
drop table public.receitas_pessoais_recorrencias;
commit;
