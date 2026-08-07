import { useState } from "react";
import { OperationModal } from "../../../components/operations/OperationsUI";
import { INTERACTION_TYPES } from "../types/prospeccao";

export default function InteractionModal({ prospect, defaultResponsible, onClose, onSave }) {
  const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const [form, setForm] = useState({ tipo: INTERACTION_TYPES[0], dataHora: now.toISOString().slice(0, 16), responsavel: prospect.responsavel || defaultResponsible || "", resumo: "", resultado: "", proximoPasso: "", proximoRetornoEm: "", observacoes: "" });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <OperationModal title={`Registrar interação · ${prospect.nomeFantasia || prospect.razaoSocial}`} onClose={onClose} onSubmit={() => { if (form.resumo.trim()) onSave(form); }} submitLabel="Registrar interação" disabled={!form.resumo.trim()}>
    <label className="ops-field"><span>Tipo</span><select value={form.tipo} onChange={(e) => update("tipo", e.target.value)}>{INTERACTION_TYPES.map((v) => <option key={v}>{v}</option>)}</select></label><label className="ops-field"><span>Data e hora</span><input type="datetime-local" value={form.dataHora} onChange={(e) => update("dataHora", e.target.value)} /></label>
    <label className="ops-field"><span>Responsável</span><input value={form.responsavel} onChange={(e) => update("responsavel", e.target.value)} /></label><label className="ops-field"><span>Resultado</span><input value={form.resultado} onChange={(e) => update("resultado", e.target.value)} /></label>
    <label className="ops-field ops-field--wide"><span>Resumo</span><textarea value={form.resumo} onChange={(e) => update("resumo", e.target.value)} /></label><label className="ops-field"><span>Próximo passo</span><input value={form.proximoPasso} onChange={(e) => update("proximoPasso", e.target.value)} /></label><label className="ops-field"><span>Próximo retorno</span><input type="datetime-local" value={form.proximoRetornoEm} onChange={(e) => update("proximoRetornoEm", e.target.value)} /></label>
    <label className="ops-field ops-field--wide"><span>Observações</span><textarea value={form.observacoes} onChange={(e) => update("observacoes", e.target.value)} /></label>
  </OperationModal>;
}
