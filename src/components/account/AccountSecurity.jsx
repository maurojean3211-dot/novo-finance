import { useState } from "react";
import { supabase } from "../../supabase";

const MIN_PASSWORD_LENGTH = 8;

export default function AccountSecurity({ onClose }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);

  async function changePassword(event) {
    event.preventDefault();
    setFeedback(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFeedback({ type: "error", message: `A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "A confirmação não corresponde à nova senha." });
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Não foi possível alterar a senha." });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setFeedback({ type: "success", message: "Senha alterada com sucesso." });
  }

  return (
    <div className="account-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <header>
          <div><p>MINHA CONTA</p><h2 id="account-title">Segurança</h2></div>
          <button type="button" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <p className="account-modal__description">Altere a senha usada para acessar o Cunha Finance.</p>
        <form onSubmit={changePassword}>
          <label><span>Nova senha</span><input type="password" minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
          <label><span>Confirmar nova senha</span><input type="password" minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
          {feedback && <div className={`account-feedback account-feedback--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.message}</div>}
          <button className="account-submit" type="submit" disabled={busy}>{busy ? "Alterando..." : "Alterar senha"}</button>
        </form>
      </section>
    </div>
  );
}
