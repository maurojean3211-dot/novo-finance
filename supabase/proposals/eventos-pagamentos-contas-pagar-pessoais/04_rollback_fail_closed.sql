-- ROLLBACK LOCAL FAIL-CLOSED. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPLÍCITA.
-- Só é seguro antes do primeiro evento. Depois disso, usar roll-forward.
begin;

do $guards$
declare
  v_policies name[];
begin
  if to_regclass('public.contas_pagar_pessoais_pagamento_eventos') is null then
    raise exception 'ABORTADO: tabela de eventos não existe';
  end if;
  if (select count(*) from public.contas_pagar_pessoais_pagamento_eventos) <> 0 then
    raise exception 'ABORTADO: existem eventos reais; rollback destrutivo proibido, usar roll-forward';
  end if;
  if to_regprocedure('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)') is null
     or to_regprocedure('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)') is null then
    raise exception 'ABORTADO: conjunto de RPCs divergiu';
  end if;
  select array_agg(policyname order by policyname) into v_policies
  from pg_policies
  where schemaname = 'public' and tablename = 'contas_pagar_pessoais_pagamento_eventos';
  if v_policies is distinct from array['cpp_pag_eventos_insert_tenant','cpp_pag_eventos_select_tenant']::name[] then
    raise exception 'ABORTADO: conjunto de policies divergiu: %', v_policies;
  end if;
end $guards$;

drop function public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid);
drop function public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid);
drop table public.contas_pagar_pessoais_pagamento_eventos;
drop index public.contas_pagar_pessoais_scope_key;

commit;
