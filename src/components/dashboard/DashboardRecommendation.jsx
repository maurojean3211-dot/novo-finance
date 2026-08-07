export default function DashboardRecommendation({ children, tone = "neutral" }) {
  return <li className={`dashboard-recommendation dashboard-recommendation--${tone}`}><span aria-hidden="true">✦</span><p>{children}</p></li>;
}
