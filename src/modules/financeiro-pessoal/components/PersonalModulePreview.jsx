import PersonalFinanceHeader from "./PersonalFinanceHeader";
import PersonalFinanceMetrics from "./PersonalFinanceMetrics";

export default function PersonalModulePreview({ title, description, notice, metrics, columns, rows, emptyMessage, emptyDescription, actionLabel, onAction, feedback, toolbar, modal }) {
  return (
    <main className="ops-page pf-page">
      <PersonalFinanceHeader title={title} description={description} actionLabel={actionLabel} onAction={onAction} />
      <div className="pf-demo-badge">Núcleo pessoal isolado · sem leitura ou escrita no financeiro empresarial</div>
      <PersonalFinanceMetrics items={metrics} />
      <section className="ops-status-panel pf-isolation-notice" role="status">{notice}</section>
      {feedback?.message && <section className={`pf-feedback pf-feedback--${feedback.type}`} role="status">{feedback.message}</section>}
      {toolbar}
      <section className="ops-panel pf-data-panel">
        <div className="ops-panel__header"><h2>{title}</h2><span>{rows.length} registro(s)</span></div>
        {rows.length === 0 ? <div className="pf-safe-empty"><strong>{emptyMessage}</strong><p>{emptyDescription || "Use o botão acima para cadastrar o primeiro lançamento pessoal."}</p></div> : (
          <div className="ops-table-wrap"><table className="ops-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{row[column.key]}</td>)}</tr>)}</tbody></table></div>
        )}
      </section>
      {modal}
    </main>
  );
}
