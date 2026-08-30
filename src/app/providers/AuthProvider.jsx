import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../supabase";
import { CONTRACT_MODULE_KEYS } from "../auth/moduleCatalog";
import { hasPlatformAdminAccess } from "../auth/accessPolicy";
import AuthContext from "./AuthContext";

const PERSONAL_KEYS = ["pessoal_visao_geral", "pessoal_receitas", "pessoal_despesas", "pessoal_contas_pagar", "pessoal_contas_fixas", "pessoal_orcamentos", "pessoal_recorrencias", "pessoal_relatorios"];
const COMPANY_KEYS = CONTRACT_MODULE_KEYS.filter((key) => !["financas_pessoais", "energia", "representacoes"].includes(key));

function effectivePermissions(raw, contracted, clientType, master, userType, masterContext) {
  if (master && masterContext !== "empresa") return {};
  const modules = new Set(contracted);
  const effective = Object.fromEntries(CONTRACT_MODULE_KEYS.map((key) => [key, modules.has(key) && raw[key] === true]));
  const personalEnabled = effective.financas_pessoais === true;
  for (const key of PERSONAL_KEYS) effective[key] = personalEnabled && (raw[key] === true || raw.pessoal === true);
  effective.dashboard = clientType === "PJ" && COMPANY_KEYS.some((key) => effective[key] === true);
  effective.gerenciar_usuarios = clientType === "PJ" && ["cliente", "admin_empresa"].includes(String(userType || "").toLowerCase());
  return effective;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [empresaId, setEmpresaId] = useState(null);
  const [permissoes, setPermissoes] = useState({});
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [role, setRole] = useState("");
  const [masterAdmin, setMasterAdmin] = useState(false);
  const [contextoMaster, setContextoMaster] = useState(() => window.localStorage.getItem("cunha-finance:master-context") === "empresa" ? "empresa" : "administracao");
  const [tipoCliente, setTipoCliente] = useState("");
  const [plano, setPlano] = useState("");
  const [statusAssinatura, setStatusAssinatura] = useState("");
  const [modulosContratados, setModulosContratados] = useState([]);
  const [authIssue, setAuthIssue] = useState(null);
  const requestIdRef = useRef(0);

  const clearProfile = useCallback(() => {
    setEmpresaId(null);
    setPermissoes({});
    setNomeUsuario("");
    setNomeEmpresa("");
    setRole("");
    setMasterAdmin(false);
    setTipoCliente("");
    setPlano("");
    setStatusAssinatura("");
    setModulosContratados([]);
  }, []);

  const carregarSessao = useCallback(async (eventUser) => {
    const requestId = ++requestIdRef.current;
    setLoadingSession(true);
    setAuthIssue(null);
    let user = eventUser;

    if (typeof eventUser === "undefined") {
      const { data, error } = await supabase.auth.getUser();
      if (requestId !== requestIdRef.current) return;
      if (error) {
        setSession(null);
        clearProfile();
        setAuthIssue("Não foi possível validar a sessão. Entre novamente.");
        setLoadingSession(false);
        return;
      }
      user = data.user;
    }

    if (!user) {
      setSession(null);
      clearProfile();
      setLoadingSession(false);
      return;
    }

    setSession({ user });

    const { data, error } = await supabase
      .from("usuarios")
      .select("empresa_id, permissoes, nome, role, tipo_usuario, master_admin, status")
      .eq("id", user.id)
      .maybeSingle();

    if (requestId !== requestIdRef.current) return;
    const loginMaster = hasPlatformAdminAccess(data?.master_admin);
    if (error || data?.status !== "ATIVO" || (!data?.empresa_id && !loginMaster)) {
      clearProfile();
      setAuthIssue(error ? "Não foi possível carregar seu perfil e suas permissões." : data?.status === "BLOQUEADO" ? "Seu acesso está bloqueado. Contate o administrador." : data?.status === "REPROVADO" ? "Seu cadastro não foi aprovado." : "Seu cadastro está pendente de aprovação administrativa.");
      setLoadingSession(false);
      return;
    }

    let perms = {};

    try {
      perms =
        typeof data?.permissoes === "string"
          ? JSON.parse(data.permissoes)
          : data?.permissoes || {};
    } catch {
      perms = {};
    }

    setEmpresaId(data?.empresa_id || null);
    setNomeUsuario(data?.nome || user.email);
    setRole(data?.role || "");
    setMasterAdmin(data?.master_admin === true);

    if (!data.empresa_id && loginMaster) {
      setNomeEmpresa("Administração global");
      setStatusAssinatura("ATIVO");
      setPermissoes({});
      setLoadingSession(false);
      return;
    }

    const { data: company, error: companyError } = await supabase.from("empresas").select("id,name,tipo,status,plano,plano_id").eq("id", data.empresa_id).maybeSingle();
    if (requestId !== requestIdRef.current) return;
    if (companyError || ((!loginMaster || contextoMaster === "empresa") && company?.status !== "ATIVO")) {
      clearProfile();
      setAuthIssue(companyError ? "Não foi possível carregar a assinatura da empresa." : "A assinatura está suspensa ou cancelada. Contate o administrador.");
      setLoadingSession(false);
      return;
    }

    const [planModulesResult, overridesResult] = await Promise.all([
      company?.plano_id ? supabase.from("plano_modulos").select("modulo_key").eq("plano_id", company.plano_id) : Promise.resolve({ data: [], error: null }),
      company?.id ? supabase.from("empresa_modulos").select("modulo_key,habilitado").eq("empresa_id", company.id) : Promise.resolve({ data: [], error: null }),
    ]);
    if (requestId !== requestIdRef.current) return;
    if (planModulesResult.error || overridesResult.error) {
      clearProfile();
      setAuthIssue("Não foi possível carregar os módulos contratados.");
      setLoadingSession(false);
      return;
    }

    const contracted = new Set((planModulesResult.data || []).map((item) => item.modulo_key));
    for (const item of overridesResult.data || []) item.habilitado ? contracted.add(item.modulo_key) : contracted.delete(item.modulo_key);
    const contractedList = [...contracted];
    setTipoCliente(company?.tipo || "PJ");
    setPlano(company?.plano || "Sem plano");
    setStatusAssinatura(company?.status || "");
    setModulosContratados(contractedList);
    setPermissoes(effectivePermissions(perms, contractedList, company?.tipo || "PJ", loginMaster, data?.tipo_usuario, contextoMaster));
    setNomeEmpresa(company?.name || user.user_metadata?.empresa_nome || "Empresa vinculada");
    setLoadingSession(false);
  }, [clearProfile, contextoMaster]);

  useEffect(() => {
    void Promise.resolve().then(() => carregarSessao());

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      window.setTimeout(() => void carregarSessao(currentSession?.user || null), 0);
    });

    return () => {
      requestIdRef.current += 1;
      subscription?.unsubscribe();
    };
  }, [carregarSessao]);

  async function sair() {
    requestIdRef.current += 1;
    setSession(null);
    clearProfile();
    sessionStorage.removeItem("cunha-finance:quote-draft");
    localStorage.removeItem("empresaId");
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("/");
  }

  function alterarContextoMaster(contexto) {
    const next = contexto === "empresa" ? "empresa" : "administracao";
    window.localStorage.setItem("cunha-finance:master-context", next);
    setContextoMaster(next);
  }

  const value = { session, loadingSession, empresaId, permissoes, nomeUsuario, nomeEmpresa, role, masterAdmin, contextoMaster, alterarContextoMaster, tipoCliente, plano, statusAssinatura, modulosContratados, authIssue, sair };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
