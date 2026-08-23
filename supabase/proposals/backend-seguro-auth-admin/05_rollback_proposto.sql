-- PROPOSAL — NÃO EXECUTAR CEGAMENTE. Rollback automático fail-closed.
begin;
do $human_decision$
begin
  raise exception using errcode='P0001',message=
    'ROLLBACK BLOQUEADO: exigir decisão humana; não reativar INSERT inseguro nem acesso administrativo global.';
end $human_decision$;

-- Após decisão humana documentada, rollback parcial possível:
-- revoke all privileges on function public.provisionar_conta_v1(text,text,text)
--   from public,anon,authenticated;
-- drop function public.provisionar_conta_v1(text,text,text);
-- Não restaurar grants amplos, policies abertas ou MasterAdmin direto.
commit;
