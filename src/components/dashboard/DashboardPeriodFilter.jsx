import { PERIOD_OPTIONS } from "./dashboardMetrics";

export default function DashboardPeriodFilter({ dashboard }) {
  return <section className="dashboard-period" aria-label="Período do Dashboard">
    <div className="dashboard-period__options">{PERIOD_OPTIONS.map(([value, label]) => <button type="button" className={dashboard.period === value ? "is-active" : ""} onClick={() => dashboard.setPeriod(value)} key={value}>{label}</button>)}</div>
    {dashboard.period === "custom" && <div className="dashboard-period__custom">
      <label><span>Data inicial</span><input type="date" value={dashboard.customStart} max={dashboard.customEnd || undefined} onChange={(event) => dashboard.setCustomStart(event.target.value)} /></label>
      <label><span>Data final</span><input type="date" value={dashboard.customEnd} min={dashboard.customStart || undefined} onChange={(event) => dashboard.setCustomEnd(event.target.value)} /></label>
    </div>}
  </section>;
}
