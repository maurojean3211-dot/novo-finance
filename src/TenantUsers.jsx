import { useEffect, useMemo, useState } from "react";
import { MODULE_CATALOG } from "./app/auth/moduleCatalog";
import { blockTenantUser, inviteTenantUser, listTenantUsers, removeTenantUser, unblockTenantUser, updateTenantUser } from "./services/adminUsers.service";
import "./TenantUsers.css";

const profiles = {
  admin_empresa: { label: "Administrador da Empresa", modules: "all" },
  vendedor: { label: "Vendedor", modules: ["crm", "prospeccao", "vendas", "orcamentos"] },
  financeiro: { label: "Financeiro", modules: ["financeiro", "relatorios"] },
  compras_estoque: { label: "Compras/Estoque", modules: ["compras", "estoque", "catalogo"] },
  producao: { label: "Produção", modules: ["pcp", "estoque", "catalogo"] },
  consulta: { label: "Consulta", modules: ["relatorios"] },
  personalizado: { label: "Personalizado", modules: [] },
};
const empty = { nome: "", email: "", perfil: "vendedor", permissoes: {} };

export default function TenantUsers() {
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const available = useMemo(() => MODULE_CATALOG.filter((item) => modules.includes(item.key) && !item.future && item.contract), [modules]);

  async function load() {
    const data = await listTenantUsers();
    setUsers(data.users || []);
    const loadedModules = data.modules || [];
    setModules(loadedModules);
    setDraft((current) => current.email || Object.keys(current.permissoes || {}).length
      ? current
      : { ...current, permissoes: Object.fromEntries(loadedModules.map((key) => [key, profiles[current.perfil]?.modules.includes?.(key) === true])) });
  }
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  function applyProfile(perfil, current = {}) {
    const template = profiles[perfil]?.modules;
    const allowed = template === "all" ? modules : template || [];
    return { ...current, perfil, permissoes: Object.fromEntries(modules.map((key) => [key, allowed.includes(key)])) };
  }
  async function run(task, success) {
    setBusy(true); setMessage("");
    try { await task(); await load(); setMessage(success); return true; }
    catch (error) { setMessage(error.message); return false; }
    finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault();
    if (await run(() => inviteTenantUser(draft), "Convite enviado.")) setDraft(empty);
  }
  async function save() {
    if (await run(() => updateTenantUser(editing), "Usuário atualizado.")) setEditing(null);
  }
  const permissionChecks = (value, setValue) => <div className="tenant-users__modules">{available.map((item) => <label key={item.key}><input type="checkbox" checked={value.permissoes?.[item.key] === true} onChange={(event) => setValue({ ...value, perfil: "personalizado", permissoes: { ...value.permissoes, [item.key]: event.target.checked } })} /><span>{item.label}</span></label>)}</div>;

  return <main className="tenant-users ops-page">
    <header><div><span>EMPRESA</span><h1>Usuários</h1><p>Administre sua equipe dentro dos módulos contratados.</p></div><b>{users.length} usuário(s)</b></header>
    {message && <p className="tenant-users__message">{message}</p>}
    <section className="ops-panel"><div className="ops-panel__header"><h2>Adicionar usuário</h2><span>Convite por e-mail</span></div><form onSubmit={submit} className="tenant-users__form"><label>Nome<input required value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} /></label><label>E-mail<input required type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label><label>Perfil<select value={draft.perfil} onChange={(e) => setDraft(applyProfile(e.target.value, draft))}>{Object.entries(profiles).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>{permissionChecks(draft, setDraft)}<button disabled={busy}>Adicionar usuário</button></form></section>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Equipe</h2><span>Somente sua empresa</span></div><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Usuário</th><th>Perfil</th><th>Permissões</th><th>Status</th><th>Ações</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.nome}<small>{user.email}</small></td><td>{profiles[user.nivel]?.label || user.nivel || "Personalizado"}</td><td>{Object.entries(user.permissoes || {}).filter(([,v]) => v).map(([k]) => k).join(", ") || "Sem módulos"}</td><td>{user.status}</td><td><button onClick={() => setEditing({ ...user, perfil: user.nivel || "personalizado" })}>Editar</button>{user.status === "ATIVO" ? <button disabled={busy} onClick={() => run(() => blockTenantUser(user.id), "Usuário bloqueado.")}>Bloquear</button> : <button disabled={busy} onClick={() => run(() => unblockTenantUser(user.id), "Usuário ativado.")}>Ativar</button>}<button disabled={busy} onClick={() => confirm("Remover o vínculo deste usuário?") && run(() => removeTenantUser(user.id), "Vínculo removido.")}>Remover</button></td></tr>)}</tbody></table></div></section>
    {editing && <div className="ops-overlay" onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}><section className="ops-modal"><header><h2>Editar usuário</h2><button onClick={() => setEditing(null)}>×</button></header><label>Nome<input value={editing.nome || ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></label><label>Perfil<select value={editing.perfil} onChange={(e) => setEditing(applyProfile(e.target.value, editing))}>{Object.entries(profiles).map(([key,item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>{permissionChecks(editing, setEditing)}<button disabled={busy} onClick={save}>Salvar permissões</button></section></div>}
  </main>;
}
