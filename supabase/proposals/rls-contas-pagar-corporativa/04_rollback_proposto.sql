-- ROLLBACK LOCAL PROPOSTO. Restaura exatamente o comportamento amplo anterior.
-- Executar somente se a aplicação autorizada causar regressão confirmada.
begin;
drop policy if exists "ler contas pagar" on public.contas_pagar;
create policy "ler contas pagar"
on public.contas_pagar for select to authenticated using (true);
commit;
