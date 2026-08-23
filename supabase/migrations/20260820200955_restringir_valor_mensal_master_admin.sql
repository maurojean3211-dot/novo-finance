revoke select on table public.usuarios from authenticated;

grant select (
  id, nome, email, created_at, role, isento, empresa_id, tipo_usuario,
  pix_chave, cpf, whatsapp, pix, permissoes, nivel, pode_financeiro,
  pode_emprestimos, pode_compras, pode_vendas, pode_contas_pagar,
  financeiro, emprestimos, vendas, compras, contas_pagar, master_admin,
  status, empresa_solicitada, empresa_id_bloqueada
) on table public.usuarios to authenticated;
