import { useState } from "react";
import { ModuleHeader } from "../../../components/operations/OperationsUI";
import { clearCustomerFlow, consumeCustomerFlow, startCustomerOpportunityFlow } from "../../../app/integrations/customerCrmFlow";
import CrmCustomerBase from "../components/CrmCustomerBase";
import "../crm-comercial.css";

export default function ClientesPage({ empresaId, onNavigate }) {
  const [selectedCustomerId] = useState(() => consumeCustomerFlow({ empresaId }));
  function openOpportunity(opportunityId) {
    startCustomerOpportunityFlow({ empresaId, opportunityId });
    onNavigate?.("crm");
  }

  return <main className="ops-page crm-page customers-page">
    <ModuleHeader eyebrow="Comercial" title="Clientes" description="Cadastro permanente, contatos e relacionamento comercial de cada cliente." actionLabel="Abrir CRM" onAction={() => onNavigate?.("crm")} />
    <CrmCustomerBase empresaId={empresaId} initialCustomerId={selectedCustomerId} onInitialCustomerOpen={clearCustomerFlow} onOpenOpportunity={openOpportunity} />
  </main>;
}
