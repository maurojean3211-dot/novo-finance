import { ModuleHeader } from "../../../components/operations/OperationsUI";
import ProposalPreview from "../components/ProposalPreview";
import { getDemoProposal } from "../services/proposal.service";
export default function PropostaPreviewPage({ quote, onBack, onHistory }) { return <main className="ops-page quote-page"><ModuleHeader eyebrow="Etapa 5" title="Visualização da Proposta" description="Prévia comercial; o botão de PDF é apenas informativo."/><ProposalPreview proposal={getDemoProposal(quote)}/><footer className="quote-page-actions"><button onClick={onBack}>Voltar</button><button onClick={onHistory}>Histórico e versões</button></footer></main>; }
