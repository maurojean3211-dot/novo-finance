-- PROPOSAL — NÃO EXECUTAR CEGAMENTE.
-- Rollback automático deliberadamente fail-closed.
begin;
do $human_decision$
begin
  raise exception using errcode='P0001',message=
   'ROLLBACK BLOQUEADO: não restaurar grants amplos, policies true/authenticated/IS NOT NULL nem desligar RLS. Exigir decisão humana e preferir roll-forward.';
end $human_decision$;

-- Somente após decisão humana documentada, um rollback PARCIAL poderia remover
-- objetos novos que causassem regressão, sem recriar vulnerabilidades:
--   drop trigger if exists guard_usuarios_tenant_privilegios_v1 on public.usuarios;
--   drop function if exists public.guard_usuarios_tenant_privilegios_v1();
--   drop policy if exists usuarios_select_proprio_v1 on public.usuarios;
--   drop policy if exists usuarios_update_proprio_v1 on public.usuarios;
--   drop trigger if exists guard_empresas_campos_v1 on public.empresas;
--   drop function if exists public.guard_empresas_campos_v1();
--   drop policy if exists empresas_select_tenant_v1 on public.empresas;
--   drop policy if exists empresas_update_tenant_v1 on public.empresas;
--   drop policy if exists clientes_*_tenant_v1 ... (nominalmente, sem wildcard);
--   drop policy if exists contas_fixas_*_tenant_v1 ...;
--   drop policy if exists emprestimos_*_tenant_v1 ...;
--   drop policy if exists recebimentos_*_tenant_v1 ...;
--
-- Este arquivo NÃO automatiza esses comandos e NÃO:
--   * restaura as 19 policies anteriores;
--   * devolve privilégios a anon;
--   * devolve TRUNCATE/REFERENCES/TRIGGER a authenticated;
--   * desabilita RLS;
--   * toca em service_role.
-- Estratégia recomendada: migration roll-forward transacional, específica para a regressão.
commit;
