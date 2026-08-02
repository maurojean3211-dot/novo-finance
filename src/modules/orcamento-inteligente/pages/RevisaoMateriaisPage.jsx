import { ModuleHeader } from "../../../components/operations/OperationsUI";
import MaterialMatchPanel from "../components/MaterialMatchPanel";
import useMaterialMatching from "../hooks/useMaterialMatching";
export default function RevisaoMateriaisPage({ onBack, onNext }) { const matching=useMaterialMatching(); return <main className="ops-page quote-page"><ModuleHeader eyebrow="Etapa 2" title="Revisão dos Materiais Identificados" description="Extração e correspondências integralmente demonstrativas."/><MaterialMatchPanel extraction={matching.extraction} onDecide={matching.decide}/><footer className="quote-page-actions"><button onClick={onBack}>Voltar</button><button onClick={onNext}>Continuar para preços</button></footer></main>; }
