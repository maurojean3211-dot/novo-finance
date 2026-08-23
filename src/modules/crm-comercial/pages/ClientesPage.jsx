import { ModuleHeader } from "../../../components/operations/OperationsUI";
import CrmCustomerBase from "../components/CrmCustomerBase";
import "../crm-comercial.css";

export default function ClientesPage({ empresaId, navigationContext, onNavigationConsumed, onNavigate }) {
  function openOpportunity(opportunityId) {
    onNavigate?.("crm", { opportunityId });
  }

  return <main className="ops-page crm-page customers-page">
    <ModuleHeader eyebrow="Comercial" title="Clientes" description="Cadastro permanente, contatos e relacionamento comercial de cada cliente." actionLabel="Abrir CRM" onAction={() => onNavigate?.("crm")} />
    <CrmCustomerBase empresaId={empresaId} initialCustomerId={navigationContext?.customerId || null} onInitialCustomerOpen={onNavigationConsumed} onOpenOpportunity={openOpportunity} />
  </main>;
}
