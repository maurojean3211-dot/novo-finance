-- PROPOSTA. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPRESSA.
begin;
do $guard$ begin
 if exists(select 1 from public.contas_pagar_pessoais where grupo_parcelamento_id is not null)
 or exists(select 1 from public.contas_pagar_pessoais where idempotency_key is not null) then
  raise exception 'ABORTADO: já existem parcelamentos; rollback destrutivo não permitido';
 end if;
end $guard$;
drop function public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text);
drop index public.contas_pagar_pessoais_grupo_idx;
drop index public.contas_pagar_pessoais_idempotency_parcela_key;
drop index public.contas_pagar_pessoais_grupo_parcela_key;
alter table public.contas_pagar_pessoais
 drop constraint contas_pagar_pessoais_periodicidade_check,
 drop constraint contas_pagar_pessoais_valor_total_compra_check,
 drop constraint contas_pagar_pessoais_parcelas_total_check,
 drop constraint contas_pagar_pessoais_parcela_numero_check,
 drop constraint contas_pagar_pessoais_parcelamento_completo_check,
 drop column idempotency_key,drop column periodicidade,drop column valor_total_compra,
 drop column parcelas_total,drop column parcela_numero,drop column grupo_parcelamento_id;
commit;
