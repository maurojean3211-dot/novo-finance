import { ModuleHeader } from "../../../components/operations/OperationsUI";
export default function PersonalFinanceHeader({ title, description, actionLabel, onAction }) { return <ModuleHeader eyebrow="Financeiro Pessoal" title={title} description={description} actionLabel={actionLabel} onAction={onAction} />; }
