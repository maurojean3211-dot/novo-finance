-- Mantém public.empresas exposta com RLS, mas retira operações destrutivas
-- e limita alterações diretas aos dados cadastrais usados pelo cliente.
alter table public.empresas enable row level security;

revoke truncate, delete on table public.empresas from authenticated;
revoke update on table public.empresas from authenticated;

grant update (name, email, tipo, cpf, whatsapp, pix_chave, pix)
on table public.empresas to authenticated;

drop policy if exists empresas_delete_v1 on public.empresas;
