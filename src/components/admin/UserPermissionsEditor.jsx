import { USER_PERMISSION_GROUPS } from "./userPermissions";

export default function UserPermissionsEditor({ permissions, contractedModules, onChange, title = "Permissões do usuário" }) {
  return <section className="master-admin__permissions-field">
    <span>{title}</span>
    <p className="master-admin__permissions-help">Marque somente os módulos liberados para este usuário. Módulos fora do plano da empresa aparecem desabilitados e não podem ser concedidos.</p>
    <div className="master-admin__permission-groups">{USER_PERMISSION_GROUPS.map((group) => {
      const available = contractedModules.includes(group.key) && !group.future;
      const enabled = available && permissions[group.key] === true;
      return <section className={`master-admin__permission-group${available ? "" : " is-unavailable"}${enabled ? " is-enabled" : ""}`} key={group.key}>
        <header><div><strong>{group.label}</strong><small>{group.future ? "Módulo futuro" : !available ? "Não contratado" : enabled ? "Liberado para o usuário" : "Disponível, não liberado"}</small></div></header>
        <div className="master-admin__permission-options">{group.permissions.map((permission, index) => <label key={permission.key}><input type="checkbox" disabled={!available} checked={available && permissions[permission.key] === true} onChange={(event) => onChange({ ...permissions, [permission.key]: event.target.checked })} /><span>{index === 0 ? "Acesso ao módulo" : permission.label}</span></label>)}</div>
      </section>;
    })}</div>
  </section>;
}
