begin;

insert into public.empresa_modulos (empresa_id, modulo_key, habilitado, alterado_por)
select u.empresa_id, m.modulo_key, true, u.id
from public.usuarios u
cross join lateral (
  values
    ('financas_pessoais'), ('financeiro'), ('crm'), ('prospeccao'),
    ('vendas'), ('compras'), ('estoque'), ('catalogo'),
    ('orcamentos'), ('pcp'), ('tributario'), ('relatorios')
) as m(modulo_key)
join public.empresas e on e.id = u.empresa_id
where u.master_admin is true
  and u.status = 'ATIVO'
  and e.status = 'ATIVO'
  and coalesce(u.permissoes, '{}'::jsonb) @> jsonb_build_object(m.modulo_key, true)
on conflict (empresa_id, modulo_key) do update
set habilitado = excluded.habilitado,
    alterado_por = excluded.alterado_por,
    alterado_em = now();

commit;
