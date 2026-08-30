import { EnterpriseReportShell } from "./Relatorio";

export default function RelatorioUsuario({ empresaId, reportType }) {
  return <EnterpriseReportShell empresaId={empresaId} reportType={reportType} accessMode="user" />;
}
