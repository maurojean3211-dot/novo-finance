import { ModuleHeader } from "../../../components/operations/OperationsUI";
import VersionHistory from "../components/VersionHistory";
export default function HistoricoOrcamentoPage({ quote, onBack, onHome }) { return <main className="ops-page quote-page"><ModuleHeader eyebrow="Auditoria" title={`Histórico ${quote.numero}`} description="Eventos persistentes de criação, edição e status."/><VersionHistory history={quote.historico}/><footer className="quote-page-actions"><button onClick={onBack}>Voltar</button><button onClick={onHome}>Central de Orçamentos</button></footer></main>; }
