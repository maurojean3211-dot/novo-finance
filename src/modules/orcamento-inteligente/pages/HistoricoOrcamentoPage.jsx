import { ModuleHeader } from "../../../components/operations/OperationsUI";
import VersionHistory from "../components/VersionHistory";
export default function HistoricoOrcamentoPage({ onBack, onHome }) { return <main className="ops-page quote-page"><ModuleHeader eyebrow="Auditoria demonstrativa" title="Histórico e Versões" description="Linha do tempo e comparação mantidas somente em memória."/><VersionHistory/><footer className="quote-page-actions"><button onClick={onBack}>Voltar</button><button onClick={onHome}>Central de Orçamentos</button></footer></main>; }
