import { useCallback, useEffect, useRef, useState } from "react";
import { approveAdminUser, blockAdminUser, createAdminPlan, inviteAdminUser, listAdminUsers, rejectAdminUser, unblockAdminUser, updateAdminUser, updateCompanyAccess } from "./services/adminUsers.service";
import { CONTRACT_MODULES, modulesForClientType } from "./app/auth/moduleCatalog";
import UserPermissionsEditor from "./components/admin/UserPermissionsEditor";
import { createAdminClient } from "./adminClientFlow";
import { canApplyBackgroundRefresh, executeUserSave, mergeSavedUser } from "./masterAdminSave";
import "./MasterAdmin.css";

const emptyInvite = { nome: "", email: "", empresaNome: "" };
const emptyClient = { ...emptyInvite, tipo: "PJ", plano_id: "", modulos: [], permissoes: {} };
const emptyPlan = { nome: "", tipo_cliente: "PJ", valor_mensal: 0, modulos: [] };
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PLAN_MODULE_GROUPS = Object.freeze([
  { label: "Pessoal", modules: CONTRACT_MODULES.filter((module) => module.audience === "personal") },
  { label: "Empresariais", modules: CONTRACT_MODULES.filter((module) => module.audience === "company") },
  { label: "Futuros", modules: CONTRACT_MODULES.filter((module) => module.future) },
]);

export default function MasterAdmin() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("carregando");
  const [feedback, setFeedback] = useState("");
  const [busyId, setBusyId] = useState("");
  const [editing, setEditing] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [companyEditing, setCompanyEditing] = useState(null);
  const [planDraft, setPlanDraft] = useState(emptyPlan);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [clientDraft, setClientDraft] = useState(emptyClient);
  const [clientEditorOpen, setClientEditorOpen] = useState(false);
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

  async function submitClient(event) {
    event.preventDefault();
    if (!clientDraft.nome.trim() || !clientDraft.email.trim() || !clientDraft.empresaNome.trim()) return setFeedback("Preencha os dados da empresa e do usuário responsável.");
    const completed = await run("new-client", () => createAdminClient(clientDraft, { invite: inviteAdminUser, approve: approveAdminUser, updateCompany: updateCompanyAccess, updateUser: updateAdminUser }), "Cliente, empresa e permissões configurados.");
    if (completed) {
      setClientDraft(emptyClient);
      setClientEditorOpen(false);
    }
  }

  function closeClientEditor() {
    setClientDraft(emptyClient);
    setClientEditorOpen(false);
  }

  function openEdit(user, mode = "administrative") {
    const company = companyFor(user);
    setEditing({ mode, id: user.id, empresa_id: user.empresa_id, empresa_id_bloqueada: user.empresa_id_bloqueada, nome: user.nome || "", empresa_nome: user.empresa_nome || "", role: user.role || "cliente", permissoes: user.permissoes || {}, modulos_contratados: company?.modulos_efetivos || [], valor_mensal: Number(user.valor_mensal || 0), status: user.status });
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
    if (await run("plan", () => createAdminPlan(planDraft), "Plano criado.")) {
      setPlanDraft(emptyPlan);
      setPlanEditorOpen(false);
    }
  }

  function closePlanEditor() {
    setPlanDraft(emptyPlan);
    setPlanEditorOpen(false);
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

  if (clientEditorOpen) return <main className="master-admin master-admin__client-editor ops-page">
    <button type="button" className="master-admin__back-button" onClick={closeClientEditor}>← Voltar para Master Admin</button>
    <header className="master-admin__plan-editor-header"><div><span>CLIENTES E EMPRESAS</span><h1>Novo Cliente / Empresa</h1><p>Configure a empresa, o contrato e o acesso inicial do usuário responsável.</p></div></header>
    {feedback && <section className="master-admin__notice" role="status"><strong>{feedback}</strong></section>}
    <form className="master-admin__client-editor-form" onSubmit={submitClient}>
      <section className="ops-panel master-admin__editor-step"><header><b>1</b><div><h2>Dados da empresa</h2><p>Identificação e tipo do novo cliente.</p></div></header><div className="master-admin__plan-fields"><label>Empresa<input autoFocus value={clientDraft.empresaNome} onChange={(event) => setClientDraft({ ...clientDraft, empresaNome: event.target.value })} /></label><label>Tipo<select value={clientDraft.tipo} onChange={(event) => setClientDraft({ ...clientDraft, tipo: event.target.value, plano_id: "", modulos: [], permissoes: {} })}><option value="PJ">Empresa</option><option value="PF">Pessoa física</option></select></label></div></section>
      <section className="ops-panel master-admin__editor-step"><header><b>2</b><div><h2>Plano e módulos</h2><p>O contrato da empresa limita as permissões do responsável.</p></div></header><label className="master-admin__editor-plan-select">Plano<select value={clientDraft.plano_id} onChange={(event) => { const plan = plans.find((item) => item.id === event.target.value); setClientDraft({ ...clientDraft, plano_id: event.target.value, modulos: (plan?.plano_modulos || []).map((item) => item.modulo_key) }); }}><option value="">Sem plano</option>{plans.filter((plan) => plan.tipo_cliente === clientDraft.tipo && plan.ativo).map((plan) => <option key={plan.id} value={plan.id}>{plan.nome}</option>)}</select></label><div className="master-admin__plan-module-groups">{PLAN_MODULE_GROUPS.map((group) => <section key={group.label}><h3>{group.label}</h3><div className="master-admin__module-grid">{group.modules.map((module) => <label key={module.key}><input type="checkbox" disabled={module.future} checked={clientDraft.modulos.includes(module.key)} onChange={(event) => setClientDraft({ ...clientDraft, modulos: event.target.checked ? [...clientDraft.modulos, module.key] : clientDraft.modulos.filter((key) => key !== module.key) })} /><strong>{module.label}{module.future ? " · futuro" : ""}</strong></label>)}</div></section>)}</div></section>
      <section className="ops-panel master-admin__editor-step"><header><b>3</b><div><h2>Usuário responsável</h2><p>Primeiro administrador da empresa.</p></div></header><div className="master-admin__plan-fields"><label>Nome<input value={clientDraft.nome} onChange={(event) => setClientDraft({ ...clientDraft, nome: event.target.value })} /></label><label>E-mail<input type="email" value={clientDraft.email} onChange={(event) => setClientDraft({ ...clientDraft, email: event.target.value })} /></label></div></section>
      <section className="ops-panel master-admin__editor-step"><header><b>4</b><div><h2>Permissões do usuário responsável</h2><p>Nenhum módulo é concedido automaticamente.</p></div></header><UserPermissionsEditor permissions={clientDraft.permissoes} contractedModules={clientDraft.modulos} onChange={(permissoes) => setClientDraft({ ...clientDraft, permissoes })} /></section>
      <section className="ops-panel master-admin__editor-step master-admin__review-step"><header><b>5</b><div><h2>Revisão e salvar</h2><p>Confira os dados antes de enviar o convite e criar o vínculo.</p></div></header><div><span>Empresa</span><strong>{clientDraft.empresaNome || "Não informada"}</strong><span>Plano</span><strong>{plans.find((plan) => plan.id === clientDraft.plano_id)?.nome || "Sem plano"}</strong><span>Módulos</span><strong>{clientDraft.modulos.length ? clientDraft.modulos.join(", ") : "Nenhum"}</strong><span>Responsável</span><strong>{clientDraft.nome || "Não informado"}</strong></div></section>
      <footer className="master-admin__plan-editor-actions"><button type="button" onClick={closeClientEditor}>Cancelar</button><button type="submit" disabled={busyId === "new-client"}>{busyId === "new-client" ? "Salvando…" : "Salvar Cliente"}</button></footer>
    </form>
  </main>;

  if (planEditorOpen) return <main className="master-admin master-admin__plan-editor ops-page">
    <button type="button" className="master-admin__back-button" onClick={closePlanEditor}>← Voltar para Master Admin</button>
    <header className="master-admin__plan-editor-header"><div><span>PLANOS COMERCIAIS</span><h1>Novo Plano Comercial</h1><p>Defina os dados comerciais e os módulos incluídos no plano.</p></div></header>
    {feedback && <section className="master-admin__notice" role="status"><strong>{feedback}</strong></section>}
    <form className="ops-panel master-admin__plan-editor-form" onSubmit={submitPlan}>
      <div className="master-admin__plan-fields"><label>Nome do plano<input autoFocus value={planDraft.nome} onChange={(event) => setPlanDraft({ ...planDraft, nome: event.target.value })} /></label><label>Tipo<select value={planDraft.tipo_cliente} onChange={(event) => setPlanDraft({ ...planDraft, tipo_cliente: event.target.value, modulos: [] })}><option value="PF">Pessoa física</option><option value="PJ">Empresa</option></select></label><label>Valor mensal<input inputMode="decimal" value={planDraft.valor_mensal} onChange={(event) => setPlanDraft({ ...planDraft, valor_mensal: Number(event.target.value || 0) })} /></label></div>
      <section className="master-admin__plan-modules"><header><span>MÓDULOS DO PLANO</span><p>Selecione apenas os módulos incluídos neste plano.</p></header><div className="master-admin__plan-module-groups">{PLAN_MODULE_GROUPS.map((group) => <section key={group.label}><h3>{group.label}</h3><div className="master-admin__module-grid">{group.modules.map((module) => <label key={module.key}><input type="checkbox" disabled={module.future} checked={planDraft.modulos.includes(module.key)} onChange={(event) => setPlanDraft({ ...planDraft, modulos: event.target.checked ? [...planDraft.modulos, module.key] : planDraft.modulos.filter((key) => key !== module.key) })} /><strong>{module.label}{module.future ? " · futuro" : ""}</strong></label>)}</div></section>)}</div></section>
      <footer className="master-admin__plan-editor-actions"><button type="button" onClick={closePlanEditor}>Cancelar</button><button type="submit" disabled={busyId === "plan"}>{busyId === "plan" ? "Salvando…" : "Salvar Plano"}</button></footer>
    </form>
  </main>;

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

    <section className="ops-panel"><div className="ops-panel__header"><h2>Usuários administrados</h2><span>{managed.length} registro(s)</span></div>{managed.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Nome</th><th>Cliente</th><th>Plano / módulos</th><th>Permissões efetivas</th><th>Status</th><th>Ações</th></tr></thead><tbody>{managed.map((user) => { const company = companyFor(user); return <tr key={user.id}><td>{user.nome || "—"}<small>{user.email}</small></td><td>{user.empresa_nome || "—"}<small>{company?.tipo || "—"}</small></td><td>{company?.plano || "Sem plano"}<small>{(company?.modulos_efetivos || []).join(", ") || "Sem módulos"}</small></td><td>{permissions(user)}</td><td>{user.status}<small>{company?.status || "—"}</small></td><td><div className="master-admin__row-actions"><button disabled={busyId === user.id} onClick={() => openEdit(user, "administrative")}>Editar</button><button disabled={busyId === user.id} onClick={() => openEdit(user, "permissions")}>Usuário</button>{company && <button disabled={busyId === `company:${company.id}`} onClick={() => openCompany(company.id)}>Acessos</button>}{user.status === "ATIVO" && <button disabled={busyId === user.id} onClick={() => run(user.id, () => blockAdminUser(user.id), "Usuário bloqueado.")}>Bloquear</button>}{user.status === "BLOQUEADO" && <button disabled={busyId === user.id} onClick={() => run(user.id, () => unblockAdminUser(user.id), "Usuário desbloqueado.")}>Desbloquear</button>}</div></td></tr>; })}</tbody></table></div> : <p>Nenhum usuário administrado.</p>}</section>

    <section className="ops-panel master-admin__plans-summary"><div className="ops-panel__header"><div><h2>Planos comerciais</h2><span>{plans.length} plano(s) cadastrado(s)</span></div><button type="button" onClick={() => { setPlanDraft(emptyPlan); setPlanEditorOpen(true); }}>+ Novo Plano</button></div>{plans.length ? <div className="master-admin__plan-list">{plans.map((plan) => { const planModules = (plan.plano_modulos || []).map((item) => item.modulo_key); return <article key={plan.id}><header><div><strong>{plan.nome}</strong><small>{plan.tipo_cliente === "PF" ? "Pessoa física" : "Empresa"} · {plan.ativo ? "Ativo" : "Inativo"}</small></div><b>{money(plan.valor_mensal)}</b></header><p>{planModules.length ? `${planModules.length} módulo(s): ${planModules.join(", ")}` : "Sem módulos incluídos"}</p></article>; })}</div> : <p className="master-admin__empty-plans">Nenhum plano comercial cadastrado.</p>}</section>

    <section className="ops-panel master-admin__client-registration"><div className="ops-panel__header"><div><h2>Novo cliente / empresa</h2><span>Empresa, contrato e responsável em um único fluxo</span></div><button type="button" onClick={() => { setClientDraft(emptyClient); setClientEditorOpen(true); }}>+ Novo Cliente</button></div></section>
    {editing && <div className="ops-overlay" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}><section className="ops-modal master-admin__permissions-modal" role="dialog" aria-modal="true" aria-label={editing.mode === "permissions" ? "Permissões individuais do usuário" : "Editar cadastro do usuário"}><header><div><p>{editing.mode === "permissions" ? "ACESSOS DO USUÁRIO" : "Gestão do usuário"}</p><h2>{editing.mode === "permissions" ? "Permissões individuais do usuário" : "Editar cadastro e permissões"}</h2></div><button onClick={() => setEditing(null)} aria-label="Fechar">×</button></header><div className="ops-form">{editing.mode === "administrative" && <div className="master-admin__administrative-fields"><label className="ops-field"><span>Nome</span><input value={editing.nome} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} /></label><label className="ops-field"><span>Empresa</span><input value={editing.empresa_nome} onChange={(event) => setEditing({ ...editing, empresa_nome: event.target.value })} /></label><label className="ops-field"><span>Perfil</span><select value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value })}><option value="cliente">Cliente</option><option value="usuario">Usuário</option></select></label><label className="ops-field"><span>Status</span><select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })}><option value="ATIVO">Ativo</option><option value="BLOQUEADO">Bloqueado</option><option value="REPROVADO">Reprovado</option></select></label><label className="ops-field ops-field--wide"><span>Valor mensal</span><input inputMode="decimal" value={money(editing.valor_mensal)} onChange={(event) => setEditing({ ...editing, valor_mensal: Number(event.target.value.replace(/\D/g, "")) / 100 })} /></label></div>}<UserPermissionsEditor title={editing.mode === "administrative" ? "Permissões do usuário" : "Permissões dentro do contrato"} permissions={editing.permissoes} contractedModules={editing.modulos_contratados} onChange={(permissoes) => setEditing({ ...editing, permissoes })} /></div><footer><button onClick={() => setEditing(null)}>Cancelar</button><button disabled={busyId === editing.id || !editing.nome.trim() || !editing.empresa_nome.trim()} onClick={saveEdit}>Salvar</button></footer></section></div>}
    {companyEditing && <div className="ops-overlay" onMouseDown={(event) => event.target === event.currentTarget && setCompanyEditing(null)}><section className="ops-modal" role="dialog" aria-modal="true" aria-label="Acessos comerciais"><header><div><p>Assinatura</p><h2>{companyEditing.name}</h2></div><button onClick={() => setCompanyEditing(null)} aria-label="Fechar">×</button></header><div className="ops-form"><label className="ops-field"><span>Tipo</span><select value={companyEditing.tipo} onChange={(event) => setCompanyEditing({ ...companyEditing, tipo: event.target.value, plano_id: "", modulos: [] })}><option value="PF">Pessoa física</option><option value="PJ">Empresa</option></select></label><label className="ops-field"><span>Status da assinatura</span><select value={companyEditing.status} onChange={(event) => setCompanyEditing({ ...companyEditing, status: event.target.value })}><option value="ATIVO">Ativa</option><option value="SUSPENSO">Suspensa</option><option value="CANCELADO">Cancelada</option></select></label><label className="ops-field ops-field--wide"><span>Plano</span><select value={companyEditing.plano_id || ""} onChange={(event) => { const plan = plans.find((item) => item.id === event.target.value); setCompanyEditing({ ...companyEditing, plano_id: event.target.value || null, modulos: (plan?.plano_modulos || []).map((item) => item.modulo_key) }); }}><option value="">Sem plano</option>{plans.filter((plan) => plan.tipo_cliente === companyEditing.tipo && plan.ativo).map((plan) => <option key={plan.id} value={plan.id}>{plan.nome}</option>)}</select></label><div className="ops-field ops-field--wide"><span>Módulos efetivos e overrides</span><div className="master-admin__module-grid">{modulesForClientType(companyEditing.tipo).map((module) => <label key={module.key}><input type="checkbox" disabled={module.future} checked={companyEditing.modulos.includes(module.key)} onChange={(event) => setCompanyEditing({ ...companyEditing, modulos: event.target.checked ? [...companyEditing.modulos, module.key] : companyEditing.modulos.filter((key) => key !== module.key) })} /><strong>{module.label}{module.future ? " · futuro" : ""}</strong></label>)}</div></div></div><footer><button onClick={() => setCompanyEditing(null)}>Cancelar</button><button disabled={busyId === `company:${companyEditing.id}`} onClick={saveCompany}>Salvar acessos</button></footer></section></div>}
    {approval && <div className="ops-overlay" onMouseDown={(event) => event.target === event.currentTarget && setApproval(null)}><section className="ops-modal master-admin__client-modal" role="dialog" aria-modal="true" aria-label="Aprovar usuário"><header><div><p>Vínculo empresarial</p><h2>Aprovar usuário</h2></div><button onClick={() => setApproval(null)} aria-label="Fechar">×</button></header><div className="ops-form master-admin__client-modal-form"><label className="ops-field"><span>Destino</span><select value={approval.mode} onChange={(event) => setApproval({ ...approval, mode: event.target.value })}><option value="existing" disabled={!companies.length}>Empresa existente</option><option value="new">Criar nova empresa</option></select></label>{approval.mode === "existing" ? <label className="ops-field"><span>Empresa existente</span><select value={approval.empresaId} onChange={(event) => setApproval({ ...approval, empresaId: event.target.value })}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label> : <label className="ops-field"><span>Nome da nova empresa</span><input value={approval.empresaNome} onChange={(event) => setApproval({ ...approval, empresaNome: event.target.value })} /></label>}</div><footer><button onClick={() => setApproval(null)}>Cancelar</button><button disabled={busyId === approval.userId || (approval.mode === "existing" ? !approval.empresaId : !approval.empresaNome.trim())} onClick={confirmApproval}>Aprovar</button></footer></section></div>}
  </main>;
}

const containerStyle = { maxWidth: 760, margin: "40px auto", padding: 24, color: "#fff" };
