-- ROLLBACK ESTRUTURAL FUTURO: seguro somente antes do primeiro uso.
begin;
do $guards$
begin
 if to_regclass('public.contas_pagar_pessoais_recorrencias') is null
 or (select count(*) from public.contas_pagar_pessoais_recorrencias)<>0
 or (select count(*) from public.contas_pagar_pessoais where recorrencia_id is not null)<>0
 then raise exception 'ABORTADO: estrutura ausente, parcial ou com histórico; usar roll-forward'; end if;
 if (select count(*) from public.contas_fixas)<>8 then raise exception 'ABORTADO: contas_fixas divergiu'; end if;
end $guards$;
drop function public.encerrar_recorrencia_conta_pessoal(uuid,uuid,integer,date);
drop function public.cancelar_competencia_recorrente_pessoal(uuid,uuid);
drop function public.ajustar_competencia_recorrente_pessoal(uuid,uuid,numeric,date,text);
drop function public.atualizar_recorrencia_conta_pessoal(uuid,uuid,integer,text,text,numeric,text,text);
drop function public.materializar_competencia_conta_pessoal(uuid,uuid,date);
drop function public.criar_recorrencia_conta_pessoal(uuid,text,text,numeric,date,integer,text,text,text,uuid);
drop index public.cpp_recorrencia_mes_idx;
drop index public.cpp_recorrencia_competencia_key;
alter table public.contas_pagar_pessoais
 drop constraint cpp_recorrencia_completa_check,
 drop constraint cpp_recorrencia_scope_fkey,
 drop column valor_previsto,
 drop column competencia,
 drop column recorrencia_id;
drop table public.contas_pagar_pessoais_recorrencias;
commit;
