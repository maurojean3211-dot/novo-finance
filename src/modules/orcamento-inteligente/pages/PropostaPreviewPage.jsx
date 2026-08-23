import { useEffect, useState } from "react";
import { ModuleHeader } from "../../../components/operations/OperationsUI";
import ProposalPreview from "../components/ProposalPreview";
import { loadProposal } from "../services/proposal.service";

export default function PropostaPreviewPage({ empresaId, quote, onBack, onHistory }) {
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void loadProposal({ empresaId, quote })
      .then((data) => { if (active) setProposal(data); })
      .catch((reason) => { if (active) setError(reason.message || "Não foi possível carregar os dados da empresa."); });
    return () => { active = false; };
  }, [empresaId, quote]);
  return <main className="ops-page quote-page">
    <ModuleHeader eyebrow="Proposta comercial" title="Visualização e PDF" description="Documento gerado com os dados persistidos da empresa e do orçamento." />
    {error && <div className="ops-status-panel">{error}</div>}
    {!proposal && !error && <div className="ops-status-panel">Carregando proposta...</div>}
    {proposal && <ProposalPreview proposal={proposal} />}
    <footer className="quote-page-actions"><button onClick={onBack}>Voltar</button><button onClick={onHistory}>Histórico</button></footer>
  </main>;
}
