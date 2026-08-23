-- ROLLBACK DE CONTINGÊNCIA. NÃO EXECUTAR SEM AUTORIZAÇÃO.
-- Restaura o estado anterior com RLS desabilitada, portanto reabre o risco de exposição.
begin;
drop policy if exists contas_fixas_select_tenant on public.contas_fixas;
drop policy if exists contas_fixas_insert_tenant on public.contas_fixas;
drop policy if exists contas_fixas_update_tenant on public.contas_fixas;
drop policy if exists contas_fixas_delete_tenant on public.contas_fixas;
alter table public.contas_fixas disable row level security;
commit;
