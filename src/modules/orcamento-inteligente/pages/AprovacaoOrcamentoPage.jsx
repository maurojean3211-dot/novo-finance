import { ModuleHeader } from "../../../components/operations/OperationsUI";
import ApprovalPanel from "../components/ApprovalPanel";
export default function AprovacaoOrcamentoPage({ quote, onBack, onNext }) { return <main className="ops-page quote-page"><ModuleHeader eyebrow="Etapa 4" title="Aprovação Interna" description="Decisões locais por alçada, sem envio ou persistência."/><ApprovalPanel quote={quote}/><footer className="quote-page-actions"><button onClick={onBack}>Voltar</button><button onClick={onNext}>Visualizar proposta</button></footer></main>; }
