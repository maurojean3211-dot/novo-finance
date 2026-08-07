import { useState } from "react";
import CommercialQuickActions from "./CommercialQuickActions";

export default function CommercialAssistant({ loading, onAnalyze }) {
  const [command, setCommand] = useState("");
  function submit(event) { event?.preventDefault(); if (command.trim()) onAnalyze(command.trim()); }
  function quickAction(value) { setCommand(value); onAnalyze(value); }
  return <section className="commercial-assistant"><div className="commercial-assistant__title"><span>✦</span><div><small>Assistente baseado em regras locais</small><h2>Como posso apoiar sua atividade comercial?</h2></div></div><form onSubmit={submit}><textarea value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Ex.: Mostrar prospects com retorno próximo." aria-label="Necessidade comercial" /><button type="submit" disabled={loading || !command.trim()}>{loading ? "Carregando contexto…" : "Analisar solicitação"}</button></form><CommercialQuickActions onSelect={quickAction} /></section>;
}
