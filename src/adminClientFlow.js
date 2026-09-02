import { limitPermissionsToModules } from "./components/admin/userPermissions.js";

export async function createAdminClient(draft, operations) {
  let stage = "convite do responsável";
  try {
    const invited = await operations.invite(draft);
    stage = "criação e vínculo da empresa";
    const approved = await operations.approve(invited.user_id, { empresaNome: draft.empresaNome.trim() });
    stage = "plano e módulos da empresa";
    await operations.updateCompany({ id: approved.empresa_id, tipo: draft.tipo, status: "ATIVO", plano_id: draft.plano_id || null, modulos: draft.modulos });
    stage = "permissões do responsável";
    await operations.updateUser({ id: invited.user_id, nome: draft.nome.trim(), empresa_nome: draft.empresaNome.trim(), role: "cliente", status: "ATIVO", valor_mensal: 0, permissoes: limitPermissionsToModules(draft.permissoes, draft.modulos) });
    return { userId: invited.user_id, companyId: approved.empresa_id };
  } catch (error) {
    throw new Error(`Cadastro interrompido na etapa ${stage}: ${error?.message || "falha inesperada"}.`);
  }
}
