import PersonalFinanceHeader from "../components/PersonalFinanceHeader";
import BankReconciliationPanel from "../components/BankReconciliationPanel";
import { usePersonalExpensesRead, usePersonalIncomesRead, usePersonalPayablesRead } from "../hooks/usePersonalFinanceRead";

export default function ConferenciaExtratoPage({ empresaId, userId }) {
  const incomes = usePersonalIncomesRead(empresaId, userId);
  const expenses = usePersonalExpensesRead(empresaId, userId);
  const payables = usePersonalPayablesRead(empresaId, userId);
  const errors = [incomes.error, expenses.error, payables.error].filter(Boolean);

  return <main className="ops-page pf-page">
    <PersonalFinanceHeader title="Conferência de Extrato" description="Conciliação bancária dos lançamentos pessoais a partir do extrato." />
    {errors.length > 0 && <section className="ops-status-panel">Não foi possível carregar parte dos dados pessoais: {errors.join(" · ")}</section>}
    {(incomes.loading || expenses.loading || payables.loading) && <section className="ops-status-panel">Carregando dados pessoais existentes…</section>}
    <BankReconciliationPanel empresaId={empresaId} userId={userId} incomes={incomes.records} expenses={expenses.records} payables={payables.records} onImported={() => Promise.all([incomes.reload(), expenses.reload()])} />
  </main>;
}
