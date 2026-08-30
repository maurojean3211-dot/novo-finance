import { useCallback, useEffect, useRef, useState } from "react";
import { approveAdminUser, blockAdminUser, createAdminPlan, inviteAdminUser, listAdminUsers, rejectAdminUser, unblockAdminUser, updateAdminUser, updateCompanyAccess } from "./services/adminUsers.service";
import { MODULE_CATALOG, modulesForClientType } from "./app/auth/moduleCatalog";
import { canApplyBackgroundRefresh, executeUserSave, mergeSavedUser } from "./masterAdminSave";
import "./MasterAdmin.css";

const emptyInvite = { nome: "", email: "", empresaNome: "" };
const emptyPlan = { nome: "", tipo_cliente: "PJ", valor_mensal: 0, modulos: [] };
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MasterAdmin() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("carregando");
  const [feedback, setFeedback] = useState("");
  const [busyId, setBusyId] = useState("");
  const [invite, setInvite] = useState(emptyInvite);
  const [editing, setEditing] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [companyEditing, setCompanyEditing] = useState(null);
  const [planDraft, setPlanDraft] = useState(emptyPlan);
  const [approval, setApproval] = useState(null);
  const dataRevisionRef = useRef(0);

  const load = useCallback(async ({ rethrow = false, background = false, expectedRevision = dataRevisionRef.current } = {}) => {
    if (!background) setStatus("carregando");
    try {
      const data = await listAdminUsers();
      if (!canApplyBackgroundRefresh(expectedRevision, dataRevisionRef.current)) return false;
      setUsers(data?.users || []);
      setCompanies(data?.companies || []);
      setPlans(data?.plans || []);
      if (!background) setStatus("pronto");
      return true;
    } catch (error) {
      if (background) return false;
      setFeedback(error.message || "Acesso administrativo não autorizado.");
      setStatus("negado");
      if (rethrow) throw error;
      return false;
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function run(userId, action, success) {
    const revision = ++dataRevisionRef.current;
    setBusyId(userId);
    setFeedback("");
    try { await action(); await load({ rethrow: true, expectedRevision: revision }); setFeedback(success); return true; }
    catch (error) { setFeedback(error.message || "Não foi possível concluir a ação."); return false; }
    finally { setBusyId(""); }
  }

  function approve(user) {
    setApproval({
      userId: user.id,
      mode: companies.length ? "existing" : "new",
      empresaId: companies[0]?.id || "",
      empresaNome: user.empresa_nome || "",
    });
  }

  async function confirmApproval() {
    const company = approval.mode === "existing"
      ? { empresaId: approval.empresaId }
      : { empresaNome: approval.empresaNome.trim() };
    if (!company.empresaId && !company.empresaNome) return;
    if (await run(approval.userId, () => approveAdminUser(approval.userId, company), "Cadastro aprovado.")) {
      setApproval(null);
    }
  }

  async function submitInvite(event) {
    event.preventDefault();
    if (!invite.nome.trim() || !invite.email.trim() || !invite.empresaNome.trim()) return setFeedback("Preencha nome, e-mail e empresa.");
    await run("invite", () => inviteAdminUser(invite), "Convite enviado; usuário permanecerá pendente até aprovação.");
    setInvite(emptyInvite);
  }

  function openEdit(user) {
    const company = companyFor(user);
    setEditing({ id: user.id, empresa_id: user.empresa_id, empresa_id_bloqueada: user.empresa_id_bloqueada, nome: user.nome || "", empresa_nome: user.empresa_nome || "", role: user.role || "cliente", permissoes: user.permissoes || {}, modulos_contratados: company?.modulos_efetivos || [], valor_mensal: Number(user.valor_mensal || 0), status: user.status });
  }

  function openCompany(companyId) {
    const company = companies.find((item) => item.id === companyId);
    if (company) setCompanyEditing({ ...company, modulos: [...(company.modulos_efetivos || [])] });
  }

  async function saveCompany() {
    if (!companyEditing) return;
    if (await run(`company:${companyEditing.id}`, () => updateCompanyAccess(companyEditing), "Acesso comercial atualizado.")) setCompanyEditing(null);
  }

  async function submitPlan(event) {
    event.preventDefault();
    if (!planDraft.nome.trim()) return setFeedback("Informe o nome do plano.");
    if (await run("plan", () => createAdminPlan(planDraft), "Plano criado.")) setPlanDraft(emptyPlan);
  }

  async function saveEdit() {
    const draft = { ...editing, permissoes: { ...editing.permissoes } };
    const revision = ++dataRevisionRef.current;
    setBusyId(draft.id);
    setFeedback("");
    await executeUserSave({
      draft,
      updateUser: updateAdminUser,
      onSuccess: (result) => {
        setUsers((current) => mergeSavedUser(current, draft, result));
        setCompanies((current) => current.map((company) => company.id === (draft.empresa_id || draft.empresa_id_bloqueada) ? { ...company, name: draft.empresa_nome.trim() } : company));
        setEditing(null);
        setFeedback("Cliente atualizado.");
        setBusyId("");
        void load({ background: true, expectedRevision: revision });
      },
      onError: (error) => setFeedback(error.message || "Não foi possível concluir a ação."),
      onFinally: () => setBusyId(""),
    });
  }

  if (status === "carregando" && !users.length) return <div style={containerStyle}>Carregando gestão administrativa...</div>;
  if (status === "negado") return <div style={containerStyle}>Acesso administrativo não autorizado. {feedback}</div>;

  const pending = users.filter((user) => user.status === "PENDENTE");
  const managed = users.filter((user) => user.status !== "PENDENTE" && user.role !== "master" && !user.master_admin);
  const companyFor = (user) => companies.find((company) => company.id === (user.empresa_id || user.empresa_id_bloqueada));
  const permissions = (user) => {
    const contracted = new Set(companyFor(user)?.modulos_efetivos || []);
    return Object.entries(user.permissoes || {}).filter(([key, enabled]) => enabled && (contracted.has(key) || (key.startsWith("pessoal_") && contracted.has("financas_pessoais")))).map(([key]) => key).join(", ") || "Sem acesso efetivo";
  };

  return <main className="master-admin ops-page">
    <header className="master-admin__header"><div><span>SISTEMA</span><h1>Master Admin</h1><p>Aprovação e controle de clientes e usuários.</p></div><span className="master-admin__safe">Backend administrativo protegido</span></header>
    {feedback && <section className="master-admin__notice" role="status"><strong>{feedback}</strong></section>}
    <section className="master-admin__metrics"><article><span>Pendentes</span><strong>{pending.length}</strong><small>aguardando aprovação</small></article><article><span>Ativos</span><strong>{managed.filter((user) => user.status === "ATIVO").length}</strong><small>acesso liberado</small></article><article><span>Bloqueados</span><strong>{managed.filter((user) => user.status === "BLOQUEADO").length}</strong><small>sem empresa ativa</small></article><article><span>Reprovados</span><strong>{managed.filter((user) => user.status === "REPROVADO").length}</strong><small>sem acesso</small></article></section>

    <section className="ops-panel"><div className="ops-panel__header"><h2>Cadastros pendentes</h2><span>{pending.length} registro(s)</span></div>{pending.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Empresa</th><th>Cadastro</th><th>Status</th><th>Ações</th></tr></thead><tbody>{pending.map((user) => <tr key={user.id}><td>{user.nome || "—"}</td><td>{user.email}</td><td>{user.empresa_nome || "Não informada"}</td><td>{new Date(user.created_at).toLocaleDateString("pt-BR")}</td><td>{user.status}</td><td><button disabled={busyId === user.id} onClick={() => approve(user)}>Aprovar</button><button disabled={busyId === user.id} onClick={() => run(user.id, () => rejectAdminUser(user.id), "Cadastro reprovado.")}>Reprovar</button></td></tr>)}</tbody></table></div> : <p>Nenhum cadastro aguardando aprovação.</p>}</section>

    <section className="ops-panel"><div className="ops-panel__header"><h2>Usuários administrados</h2><span>{managed.length} registro(s)</span></div>{managed.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Nome</th><th>Cliente</th><th>Plano / módulos</th><th>Permissões efetivas</th><th>Status</th><th>Ações</th></tr></thead><tbody>{managed.map((user) => { const company = companyFor(user); return <tr key={user.id}><td>{user.nome || "—"}<small>{user.email}</small></td><td>{user.empresa_nome || "—"}<small>{company?.tipo || "—"}</small></td><td>{company?.plano || "Sem plano"}<small>{(company?.modulos_efetivos || []).join(", ") || "Sem módulos"}</small></td><td>{permissions(user)}</td><td>{user.status}<small>{company?.status || "—"}</small></td><td><button disabled={busyId === user.id} onClick={() => openEdit(user)}>Usuário</button>{company && <button disabled={busyId === `company:${company.id}`} onClick={() => openCompany(company.id)}>Acessos</button>}{user.status === "ATIVO" && <button disabled={busyId === user.id} onClick={() => run(user.id, () => blockAdminUser(user.id), "Usuário bloqueado.")}>Bloquear</button>}{user.status === "BLOQUEADO" && <button disabled={busyId === user.id} onClick={() => run(user.id, () => unblockAdminUser(user.id), "Usuário desbloqueado.")}>Desbloquear</button>}</td></tr>; })}</tbody></table></div> : <p>Nenhum usuário administrado.</p>}</section>

    <section className="ops-panel"><div className="ops-panel__header"><h2>Planos comerciais</h2><span>{plans.length} plano(s)</span></div><form className="master-admin__form-grid" onSubmit={submitPlan}><label>Nome<input value={planDraft.nome} onChange={(event) => setPlanDraft({ ...planDraft, nome: event.target.value })} /></label><label>Tipo<select value={planDraft.tipo_cliente} onChange={(event) => setPlanDraft({ ...planDraft, tipo_cliente: event.target.value, modulos: [] })}><option value="PF">Pessoa física</option><option value="PJ">Empresa</option></select></label><label>Valor mensal<input inputMode="decimal" value={planDraft.valor_mensal} onChange={(event) => setPlanDraft({ ...planDraft, valor_mensal: Number(event.target.value || 0) })} /></label><div className="ops-field ops-field--wide"><span>Módulos do plano</span><div className="master-admin__module-grid">{modulesForClientType(planDraft.tipo_cliente).map((module) => <label key={module.key}><input type="checkbox" disabled={module.future} checked={planDraft.modulos.includes(module.key)} onChange={(event) => setPlanDraft({ ...planDraft, modulos: event.target.checked ? [...planDraft.modulos, module.key] : planDraft.modulos.filter((key) => key !== module.key) })} /><strong>{module.label}{module.future ? " · futuro" : ""}</strong></label>)}</div></div><button className="master-admin__invite-button" type="submit" disabled={busyId === "plan"}>Criar plano</button></form></section>

    <section className="ops-panel"><div className="ops-panel__header"><h2>Convidar cliente</h2><span>Cadastro manual seguro</span></div><form className="master-admin__form-grid" onSubmit={submitInvite}><label>Nome<input value={invite.nome} onChange={(event) => setInvite({ ...invite, nome: event.target.value })} /></label><label>E-mail<input type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} /></label><label>Empresa<input value={invite.empresaNome} onChange={(event) => setInvite({ ...invite, empresaNome: event.target.value })} /></label><button className="master-admin__invite-button" type="submit" disabled={busyId === "invite"}>{busyId === "invite" ? "Enviando…" : "Enviar convite"}</button></form></section>
    {editing && <div className="ops-overlay" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}><section className="ops-modal" role="dialog" aria-modal="true" aria-label="Editar cliente"><header><div><p>Gestão do usuário</p><h2>Permissões individuais</h2></div><button onClick={() => setEditing(null)} aria-label="Fechar">×</button></header><div className="ops-form"><label className="ops-field"><span>Nome</span><input value={editing.nome} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} /></label><label className="ops-field"><span>Empresa</span><input value={editing.empresa_nome} onChange={(event) => setEditing({ ...editing, empresa_nome: event.target.value })} /></label><label className="ops-field"><span>Perfil</span><select value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value })}><option value="cliente">Cliente</option><option value="usuario">Usuário</option></select></label><label className="ops-field"><span>Status</span><select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })}><option value="ATIVO">Ativo</option><option value="BLOQUEADO">Bloqueado</option><option value="REPROVADO">Reprovado</option></select></label><label className="ops-field ops-field--wide"><span>Valor mensal</span><input inputMode="decimal" value={money(editing.valor_mensal)} onChange={(event) => setEditing({ ...editing, valor_mensal: Number(event.target.value.replace(/\D/g, "")) / 100 })} /></label><div className="ops-field ops-field--wide"><span>Permissões dentro do contrato</span><div className="master-admin__module-grid">{MODULE_CATALOG.map((module) => { const available = module.permissionOnly ? editing.modulos_contratados.includes("financas_pessoais") : editing.modulos_contratados.includes(module.key); return <label key={module.key}><input type="checkbox" disabled={!available || module.future} checked={available && editing.permissoes[module.key] === true} onChange={(event) => setEditing({ ...editing, permissoes: { ...editing.permissoes, [module.key]: event.target.checked } })} /><strong>{module.label}{!available ? " · não contratado" : ""}</strong></label>; })}</div></div></div><footer><button onClick={() => setEditing(null)}>Cancelar</button><button disabled={busyId === editing.id || !editing.nome.trim() || !editing.empresa_nome.trim()} onClick={saveEdit}>Salvar</button></footer></section></div>}
    {companyEditing && <div className="ops-overlay" onMouseDown={(event) => event.target === event.currentTarget && setCompanyEditing(null)}><section className="ops-modal" role="dialog" aria-modal="true" aria-label="Acessos comerciais"><header><div><p>Assinatura</p><h2>{companyEditing.name}</h2></div><button onClick={() => setCompanyEditing(null)} aria-label="Fechar">×</button></header><div className="ops-form"><label className="ops-field"><span>Tipo</span><select value={companyEditing.tipo} onChange={(event) => setCompanyEditing({ ...companyEditing, tipo: event.target.value, plano_id: "", modulos: [] })}><option value="PF">Pessoa física</option><option value="PJ">Empresa</option></select></label><label className="ops-field"><span>Status da assinatura</span><select value={companyEditing.status} onChange={(event) => setCompanyEditing({ ...companyEditing, status: event.target.value })}><option value="ATIVO">Ativa</option><option value="SUSPENSO">Suspensa</option><option value="CANCELADO">Cancelada</option></select></label><label className="ops-field ops-field--wide"><span>Plano</span><select value={companyEditing.plano_id || ""} onChange={(event) => { const plan = plans.find((item) => item.id === event.target.value); setCompanyEditing({ ...companyEditing, plano_id: event.target.value || null, modulos: (plan?.plano_modulos || []).map((item) => item.modulo_key) }); }}><option value="">Sem plano</option>{plans.filter((plan) => plan.tipo_cliente === companyEditing.tipo && plan.ativo).map((plan) => <option key={plan.id} value={plan.id}>{plan.nome}</option>)}</select></label><div className="ops-field ops-field--wide"><span>Módulos efetivos e overrides</span><div className="master-admin__module-grid">{modulesForClientType(companyEditing.tipo).map((module) => <label key={module.key}><input type="checkbox" disabled={module.future} checked={companyEditing.modulos.includes(module.key)} onChange={(event) => setCompanyEditing({ ...companyEditing, modulos: event.target.checked ? [...companyEditing.modulos, module.key] : companyEditing.modulos.filter((key) => key !== module.key) })} /><strong>{module.label}{module.future ? " · futuro" : ""}</strong></label>)}</div></div></div><footer><button onClick={() => setCompanyEditing(null)}>Cancelar</button><button disabled={busyId === `company:${companyEditing.id}`} onClick={saveCompany}>Salvar acessos</button></footer></section></div>}
    {approval && <div className="ops-overlay" onMouseDown={(event) => event.target === event.currentTarget && setApproval(null)}><section className="ops-modal" role="dialog" aria-modal="true" aria-label="Aprovar usuário"><header><div><p>Vínculo empresarial</p><h2>Aprovar usuário</h2></div><button onClick={() => setApproval(null)} aria-label="Fechar">×</button></header><div className="ops-form"><label className="ops-field ops-field--wide"><span>Destino</span><select value={approval.mode} onChange={(event) => setApproval({ ...approval, mode: event.target.value })}><option value="existing" disabled={!companies.length}>Empresa existente</option><option value="new">Criar nova empresa</option></select></label>{approval.mode === "existing" ? <label className="ops-field ops-field--wide"><span>Empresa existente</span><select value={approval.empresaId} onChange={(event) => setApproval({ ...approval, empresaId: event.target.value })}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label> : <label className="ops-field ops-field--wide"><span>Nome da nova empresa</span><input value={approval.empresaNome} onChange={(event) => setApproval({ ...approval, empresaNome: event.target.value })} /></label>}</div><footer><button onClick={() => setApproval(null)}>Cancelar</button><button disabled={busyId === approval.userId || (approval.mode === "existing" ? !approval.empresaId : !approval.empresaNome.trim())} onClick={confirmApproval}>Aprovar</button></footer></section></div>}
  </main>;
}

const containerStyle = { maxWidth: 760, margin: "40px auto", padding: 24, color: "#fff" };
