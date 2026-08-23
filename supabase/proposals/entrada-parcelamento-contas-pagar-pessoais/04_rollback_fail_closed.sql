-- ROLLBACK SOMENTE ANTES DO PRIMEIRO USO. Depois, usar roll-forward.
begin;
do $guards$
begin
 if exists(select 1 from public.contas_pagar_pessoais_entradas)
 or exists(select 1 from public.contas_pagar_pessoais_pagamento_eventos where tipo='Entrada' or entrada_id is not null)
 or exists(select 1 from public.contas_pagar_pessoais where entrada_id is not null) then
  raise exception 'ABORTADO: existem dados de entrada; rollback destrutivo proibido';
 end if;
end $guards$;

drop function public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text);
drop index public.cpp_pag_eventos_entrada_unica_idx;
alter table public.contas_pagar_pessoais_pagamento_eventos drop constraint cpp_pag_eventos_entrada_scope_fkey;
drop policy cpp_pag_eventos_insert_tenant on public.contas_pagar_pessoais_pagamento_eventos;
create policy cpp_pag_eventos_insert_tenant on public.contas_pagar_pessoais_pagamento_eventos
 for insert to authenticated with check(
  proprietario_id=(select auth.uid()) and autor_id=(select auth.uid())
  and tipo in ('Pagamento','Antecipacao','Estorno')
  and exists(select 1 from public.usuarios u where u.id=(select auth.uid())
   and u.empresa_id=contas_pagar_pessoais_pagamento_eventos.empresa_id));
drop index public.contas_pagar_pessoais_entrada_idx;
alter table public.contas_pagar_pessoais drop constraint contas_pagar_pessoais_entrada_scope_fkey;
alter table public.contas_pagar_pessoais drop column entrada_id;
drop table public.contas_pagar_pessoais_entradas;
commit;
