import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../supabase";
import AuthContext from "./AuthContext";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [empresaId, setEmpresaId] = useState(null);
  const [permissoes, setPermissoes] = useState({});
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [role, setRole] = useState("");
  const [authIssue, setAuthIssue] = useState(null);
  const requestIdRef = useRef(0);

  const clearProfile = useCallback(() => {
    setEmpresaId(null);
    setPermissoes({});
    setNomeUsuario("");
    setNomeEmpresa("");
    setRole("");
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
      .select("empresa_id, permissoes, nome, role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (requestId !== requestIdRef.current) return;
    if (error || data?.status !== "ATIVO" || !data?.empresa_id) {
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
    setPermissoes(perms);
    setNomeUsuario(data?.nome || user.email);
    setRole(data?.role || "");

    const { data: company } = await supabase.from("empresas").select("name").eq("id", data.empresa_id).maybeSingle();
    if (requestId !== requestIdRef.current) return;
    setNomeEmpresa(company?.name || user.user_metadata?.empresa_nome || "Empresa vinculada");
    setLoadingSession(false);
  }, [clearProfile]);

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

  const value = { session, loadingSession, empresaId, permissoes, nomeUsuario, nomeEmpresa, role, authIssue, sair };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
