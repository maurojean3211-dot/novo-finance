import { useEffect, useMemo, useState } from "react";
import { EmptyState, FilterBar, LoadingState, MetricGrid, ModuleHeader } from "./components/operations/OperationsUI";
import { buildEnterpriseReport, loadEnterpriseReport } from "./services/enterpriseReports.service";
import { generateEnterpriseReport } from "./services/reportPdf.service";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 7)}-01`;

function metricValue(item) {
  if (item.money) return money.format(item.value || 0);
  return `${number.format(item.value || 0)}${item.suffix || ""}`;
}

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function EnterpriseReportShell({ empresaId, reportType, accessMode }) {
  const [loadState, setLoadState] = useState({ key: "", data: null, error: "" });
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [pdfFeedback, setPdfFeedback] = useState("");

  useEffect(() => {
    let active = true;
    const key = `${empresaId}:${reportType}`;
    loadEnterpriseReport(reportType, empresaId)
      .then((data) => { if (active) setLoadState({ key, data, error: "" }); })
      .catch((cause) => { if (active) setLoadState({ key, data: null, error: cause.message || "Não foi possível carregar o relatório." }); });
    return () => { active = false; };
  }, [empresaId, reportType]);

  const loadKey = `${empresaId}:${reportType}`;
  const loading = loadState.key !== loadKey;
  const rawData = loading ? null : loadState.data;
  const error = loading ? "" : loadState.error;

  const report = useMemo(() => rawData ? buildEnterpriseReport({
    reportType,
    data: rawData,
    startDate,
    endDate,
    accessMode,
  }) : null, [accessMode, endDate, rawData, reportType, startDate]);

  if (loading) return <LoadingState>Carregando relatório empresarial...</LoadingState>;
  if (error) return <div className="ops-status-panel" role="alert"><strong>Relatório indisponível</strong><p>{error}</p></div>;
  if (!report) return <EmptyState title="Relatório indisponível" description="Não foi possível preparar os dados deste relatório." />;

  const financial = report.config.type === "financial";
  const commercial = report.config.type === "commercial";

  function generatePdf() {
    const generated = generateEnterpriseReport({ report, reportType, accessMode, startDate, endDate });
    setPdfFeedback(generated ? "PDF gerado com os dados empresariais filtrados." : "Nenhum registro encontrado para gerar o PDF.");
  }

  return (
    <div className="ops-page">
      <ModuleHeader eyebrow="Inteligência gerencial" title={report.config.title} description={report.config.description} />
      <FilterBar>
        <label><span>De</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label><span>Até</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <button type="button" onClick={() => { setStartDate(monthStart()); setEndDate(today()); }}>Mês atual</button>
        <button type="button" className="primary" onClick={generatePdf}>Gerar PDF</button>
      </FilterBar>
      {pdfFeedback && <div className="ops-status-panel" role="status">{pdfFeedback}</div>}
      <MetricGrid items={report.metrics.map((item) => ({ ...item, value: metricValue(item) }))} />
      {!report.rows.length ? <EmptyState title="Nenhum resultado" description={report.empty} /> : (
        <section className="ops-panel">
          <div className="ops-panel__header"><h2>{financial ? "Títulos do período" : commercial ? "Contrapartes consolidadas" : "Operações do período"}</h2><span>{report.rows.length} registro(s)</span></div>
          <div className="ops-table-wrap"><table className="ops-table">
            <thead><tr>
              {!commercial && <th>Data operacional</th>}
              <th>{financial ? "Contraparte" : report.config.type === "sales" ? "Cliente" : commercial ? "Contraparte" : "Fornecedor"}</th>
              <th>Detalhes</th>
              {!financial && <th>Volume</th>}
              <th>{financial ? "Saldo" : "Valor"}</th>
              {accessMode === "master" && !financial && <th>Comissão</th>}
              <th>Fonte</th>
            </tr></thead>
            <tbody>{report.rows.map((item) => <tr key={item.key}>
              {!commercial && <td>{formatDate(item.date)}</td>}
              <td><strong>{item.party}</strong></td>
              <td>{item.detail}</td>
              {!financial && <td>{number.format(item.volume || 0)}</td>}
              <td>{money.format(item.value || 0)}</td>
              {accessMode === "master" && !financial && <td>{money.format(item.commission || 0)}</td>}
              <td>{item.source}</td>
            </tr>)}</tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}

export default function Relatorio({ empresaId, reportType }) {
  return <EnterpriseReportShell empresaId={empresaId} reportType={reportType} accessMode="master" />;
}
