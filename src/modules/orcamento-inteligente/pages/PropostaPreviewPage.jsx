import { ModuleHeader } from "../../../components/operations/OperationsUI";
import ProposalPreview from "../components/ProposalPreview";
import { getDemoProposal } from "../services/proposal.service";
export default function PropostaPreviewPage({ quote, onBack, onHistory }) { return <main className="ops-page quote-page"><ModuleHeader eyebrow="Proposta comercial" title="Visualização e PDF" description="Documento profissional pronto para impressão ou salvamento como PDF."/><ProposalPreview proposal={getDemoProposal(quote)}/><footer className="quote-page-actions"><button onClick={onBack}>Voltar</button><button onClick={onHistory}>Histórico</button></footer></main>; }
