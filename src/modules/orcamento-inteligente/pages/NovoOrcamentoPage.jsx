import { ModuleHeader } from "../../../components/operations/OperationsUI";
import OrcamentoForm from "../components/OrcamentoForm";
import useOrcamentoEditor from "../hooks/useOrcamentoEditor";
export default function NovoOrcamentoPage({ initial, onSave, onBack }) { const editor=useOrcamentoEditor(initial); return <main className="ops-page quote-page"><ModuleHeader eyebrow="Orçamento Inteligente" title="Novo Orçamento" description="Cadastro manual com itens mantidos somente em memória."/><OrcamentoForm editor={editor} onSave={onSave} onCancel={onBack}/></main>; }
