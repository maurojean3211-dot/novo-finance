import { useEffect, useState } from "react";
import { OperationModal } from "../operations/OperationsUI";

export default function CustomerModal({ customer, onClose, onSave }) {
  const [form, setForm] = useState({ nome: "", telefone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({ nome: customer?.nome || "", telefone: customer?.telefone || "", email: customer?.email || "" });
  }, [customer]);

  async function submit() {
    if (!form.nome.trim()) { setError("Digite o nome do cliente."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(form, customer?.id || null);
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Erro ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  return <OperationModal title={customer ? "Editar cliente" : "Novo cliente"} editing={Boolean(customer)} onClose={onClose} onSubmit={submit} submitLabel={saving ? "Salvando..." : customer ? "Salvar alterações" : "Salvar cliente"} disabled={saving}>
    {error && <div className="ops-preview">{error}</div>}
    <label className="ops-field"><span>Nome</span><input value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} /></label>
    <label className="ops-field"><span>Telefone</span><input value={form.telefone} onChange={(event) => setForm((current) => ({ ...current, telefone: event.target.value }))} /></label>
    <label className="ops-field ops-field--wide"><span>E-mail</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
  </OperationModal>;
}
