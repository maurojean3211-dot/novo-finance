-- Antes do primeiro uso, pode-se remover apenas a RPC. Depois do uso, DELETE é proibido.
begin;
do $guards$ begin
 if exists(select 1 from public.contas_pagar_pessoais_entradas where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)
 then raise exception 'ABORTADO: entrada já registrada; exigir roll-forward/estorno auditável'; end if;
end $guards$;
drop function public.registrar_entrada_retroativa_grupo_conta_pessoal(uuid,uuid,uuid,date,uuid);
commit;
