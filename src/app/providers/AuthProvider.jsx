import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import AuthContext from "./AuthContext";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [empresaId, setEmpresaId] = useState(null);
  const [permissoes, setPermissoes] = useState({});
  const [nomeUsuario, setNomeUsuario] = useState("");

  async function carregarSessao() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSession(null);
      setLoadingSession(false);
      return;
    }

    setSession({ user });

    const { data } = await supabase
      .from("usuarios")
      .select("empresa_id, permissoes, nome")
      .eq("email", user.email)
      .maybeSingle();

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
    setLoadingSession(false);
  }

  useEffect(() => {
    void Promise.resolve().then(carregarSessao);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      carregarSessao();
    });

    return () => subscription?.unsubscribe();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const value = { session, loadingSession, empresaId, permissoes, nomeUsuario, sair };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
