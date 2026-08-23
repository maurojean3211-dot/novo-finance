-- PROPOSAL — NÃO EXECUTAR. Aplicar junto da criação da função.
begin;
revoke all privileges on function public.provisionar_conta_v1(text,text,text) from public;
revoke all privileges on function public.provisionar_conta_v1(text,text,text) from anon;
revoke all privileges on function public.provisionar_conta_v1(text,text,text) from authenticated;
grant execute on function public.provisionar_conta_v1(text,text,text) to authenticated;
-- service_role não é exposto e a Edge Function não precisa chamar esta RPC.
commit;
