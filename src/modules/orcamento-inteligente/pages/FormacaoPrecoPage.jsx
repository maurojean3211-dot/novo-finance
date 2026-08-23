import { ModuleHeader } from "../../../components/operations/OperationsUI";
import PricingSummary from "../components/PricingSummary";
import usePricingSimulation from "../hooks/usePricingSimulation";
export default function FormacaoPrecoPage({ quote, onBack, onNext }) { const simulation=usePricingSimulation(quote); return <main className="ops-page quote-page"><ModuleHeader eyebrow="Etapa 3" title="Formação de Preço" description="Cálculo baseado nos itens e custos cadastrados no orçamento."/><PricingSummary simulation={simulation}/><footer className="quote-page-actions"><button onClick={onBack}>Voltar</button><button onClick={onNext}>Solicitar aprovação</button></footer></main>; }
