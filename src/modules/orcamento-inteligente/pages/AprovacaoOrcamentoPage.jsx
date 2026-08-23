import { useState } from "react";
import { ModuleHeader } from "../../../components/operations/OperationsUI";
import ApprovalPanel from "../components/ApprovalPanel";

export default function AprovacaoOrcamentoPage({ quote, onBack, onDecision }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function decide(decision, observation) {
    setSaving(true);
    setError("");
    try {
      await onDecision(decision, observation);
    } catch (reason) {
      setError(reason.message || "Não foi possível registrar a decisão.");
      setSaving(false);
    }
  }
  return <main className="ops-page quote-page"><ModuleHeader eyebrow="Aprovação persistente" title="Aprovação Interna" description="A decisão será registrada no histórico do orçamento." />{error && <div className="ops-status-panel">{error}</div>}<ApprovalPanel quote={quote} onDecision={decide} saving={saving} /><footer className="quote-page-actions"><button onClick={onBack} disabled={saving}>Voltar</button></footer></main>;
}
