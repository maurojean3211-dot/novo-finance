-- PROPOSTA LOCAL. NÃO EXECUTAR SEM APROVAÇÃO SEPARADA.
begin;
do $hardening_contas_pagar_select$
begin
  if (select count(*) from pg_policies where schemaname='public' and tablename='contas_pagar' and policyname='ler contas pagar' and cmd='SELECT' and qual='true')<>1 then
    raise exception 'ABORTADO: policy SELECT atual diverge do diagnóstico qual=true';
  end if;
end $hardening_contas_pagar_select$;

drop policy "ler contas pagar" on public.contas_pagar;
create policy "ler contas pagar"
on public.contas_pagar for select to authenticated
using (exists (
  select 1 from public.usuarios u
  where u.id=(select auth.uid()) and u.empresa_id=contas_pagar.empresa_id
));
commit;
