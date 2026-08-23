-- ROLLBACK FASE 16 CRM - NAO EXECUTAR SEM AUTORIZACAO
-- Defensivo: recusa apagar tabelas que ja contenham dados.
BEGIN;

do $$
begin
  if to_regclass('public.crm_oportunidade_historico') is not null and exists(select 1 from public.crm_oportunidade_historico) then
    raise exception 'ABORTADO: historico CRM possui dados; rollback destrutivo recusado';
  end if;
  if to_regclass('public.crm_oportunidades') is not null and exists(select 1 from public.crm_oportunidades) then
    raise exception 'ABORTADO: oportunidades CRM possuem dados; rollback destrutivo recusado';
  end if;
end $$;

drop table if exists public.crm_oportunidade_historico;
drop table if exists public.crm_oportunidades;
drop function if exists public.crm_protect_opportunity_scope();
drop function if exists public.crm_set_updated_at();

COMMIT;
