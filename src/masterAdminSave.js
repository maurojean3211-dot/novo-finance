export function mergeSavedUser(users, draft, result = {}) {
  const current = users.find((user) => user.id === draft.id);
  if (!current) return users;

  const companyId = current.empresa_id || current.empresa_id_bloqueada || null;
  const status = result.status || draft.status;
  const companyName = draft.empresa_nome.trim();

  return users.map((user) => {
    const belongsToSameCompany = companyId && (user.empresa_id === companyId || user.empresa_id_bloqueada === companyId);
    const withCompanyName = belongsToSameCompany ? { ...user, empresa_nome: companyName } : user;
    if (user.id !== draft.id) return withCompanyName;

    return {
      ...withCompanyName,
      nome: draft.nome.trim(),
      role: draft.role,
      tipo_usuario: draft.role,
      permissoes: { ...draft.permissoes },
      valor_mensal: Number(draft.valor_mensal || 0),
      empresa_nome: companyName,
      empresa_solicitada: companyName,
      status,
      empresa_id: status === "ATIVO" ? companyId : null,
      empresa_id_bloqueada: status === "BLOQUEADO" ? companyId : null,
    };
  });
}

export function canApplyBackgroundRefresh(expectedRevision, currentRevision) {
  return expectedRevision === currentRevision;
}

export async function executeUserSave({ draft, updateUser, onSuccess, onError, onFinally }) {
  try {
    const result = await updateUser(draft);
    onSuccess(result);
    return true;
  } catch (error) {
    onError(error);
    return false;
  } finally {
    onFinally();
  }
}
