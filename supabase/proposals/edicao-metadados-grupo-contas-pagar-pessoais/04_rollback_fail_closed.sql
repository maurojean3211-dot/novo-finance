-- NÃO EXECUTAR SEM AUTORIZAÇÃO. Só é seguro sem cabeçalhos.
begin;
do $$ begin
 if exists(select 1 from public.contas_pagar_pessoais_grupo_metadados) then
  raise exception 'ABORTADO: existem metadados reais; usar roll-forward';
 end if;
end $$;
drop function public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,bigint,text,text,text,text,text);
drop table public.contas_pagar_pessoais_grupo_metadados;
commit;
