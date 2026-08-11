import { useEffect, useRef, useState } from "react";
import { authErrorMessage } from "./app/auth/authMessages";
import { supabase } from "./supabase";
import "./Login.css";

function recoveryCallbackState() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (params.get("error") || hash.get("error")) return "error";
  if (params.get("code") || hash.get("access_token")) return "present";
  return "absent";
}

export default function ResetPassword() {
  const callbackStateRef = useRef(recoveryCallbackState());
  const recoveryLinkRef = useRef(callbackStateRef.current === "present");
  const [state, setState] = useState(callbackStateRef.current === "error" ? "invalid" : "checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    const invalidTimer = window.setTimeout(() => {
      if (active) setState((current) => current === "checking" ? "invalid" : current);
    }, 2500);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") {
        recoveryLinkRef.current = true;
        setState("ready");
      } else if (recoveryLinkRef.current && session?.user) setState("ready");
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setMessage({ type: "erro", text: authErrorMessage(error, "Não foi possível validar o link de recuperação.") });
        setState("invalid");
      } else if (recoveryLinkRef.current && data.session?.user) setState("ready");
    });

    return () => {
      active = false;
      window.clearTimeout(invalidTimer);
      subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event) {
    event.preventDefault();
    setMessage(null);
    if (password.length < 6) return setMessage({ type: "erro", text: "A senha deve ter pelo menos 6 caracteres." });
    if (password !== confirmation) return setMessage({ type: "erro", text: "A confirmação deve ser igual à nova senha." });

    setState("saving");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmation("");
      setMessage({ type: "sucesso", text: "Senha atualizada com sucesso. Volte ao login para entrar." });
      setState("success");
    } catch (error) {
      setMessage({ type: "erro", text: authErrorMessage(error, "Não foi possível atualizar a senha.") });
      setState("ready");
    }
  }

  async function returnToLogin() {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      window.location.replace("/");
    }
  }

  return (
    <main className="login-page login-page--reset">
      <section className="login-showcase login-reset-showcase">
        <div className="login-brand"><span>CF</span><div><strong>Cunha Finance</strong><small>Gestão inteligente</small></div></div>
        <div className="login-presentation"><p className="login-eyebrow">Recuperação segura</p><h1>Crie uma nova senha para sua conta.</h1><p className="login-description">O link é validado pelo Supabase antes de qualquer alteração.</p></div>
      </section>
      <section className="login-access">
        <div className="login-card">
          <div className="login-card__heading"><span>Acesso seguro</span><h2>Redefinir senha</h2><p>Use pelo menos 6 caracteres e confirme a nova senha.</p></div>
          {message && <div className={`login-message login-message--${message.type}`} role="status">{message.text}</div>}
          {state === "checking" && <div className="login-reset-status" role="status"><span className="login-spinner" /> Validando link...</div>}
          {state === "invalid" && <><div className="login-message login-message--erro" role="alert">Link inválido ou expirado. Solicite uma nova recuperação na tela de login.</div><button className="login-secondary" type="button" onClick={returnToLogin}>Voltar para o login</button></>}
          {["ready", "saving"].includes(state) && <form onSubmit={updatePassword}>
            <label className="login-field"><span>Nova senha</span><div><b>●</b><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={state === "saving"} /></div></label>
            <label className="login-field"><span>Confirmar nova senha</span><div><b>●</b><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={state === "saving"} /></div></label>
            <button className="login-submit" type="submit" disabled={state === "saving"}>{state === "saving" ? "Atualizando..." : "Atualizar senha"}</button>
          </form>}
          {state === "success" && <button className="login-submit" type="button" onClick={returnToLogin}>Voltar para o login</button>}
        </div>
      </section>
    </main>
  );
}
