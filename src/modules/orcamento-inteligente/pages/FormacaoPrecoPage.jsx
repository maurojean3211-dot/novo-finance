import { ModuleHeader } from "../../../components/operations/OperationsUI";
import PricingSummary from "../components/PricingSummary";
import usePricingSimulation from "../hooks/usePricingSimulation";
export default function FormacaoPrecoPage({ onBack, onNext }) { const simulation=usePricingSimulation(); return <main className="ops-page quote-page"><ModuleHeader eyebrow="Etapa 3" title="Formação de Preço" description="Simulador comercial local, sem fórmulas definitivas ou atualização externa."/><PricingSummary simulation={simulation}/><footer className="quote-page-actions"><button onClick={onBack}>Voltar</button><button onClick={onNext}>Solicitar aprovação</button></footer></main>; }
