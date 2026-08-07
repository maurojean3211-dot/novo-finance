export default function CommercialAnalysisResult({ result }) {
  if (!result) return <div className="commercial-result commercial-result--empty"><span>✦</span><p>Descreva uma necessidade ou escolha uma sugestão rápida.</p></div>;
  return <article className="commercial-result"><header><span>{result.source}</span><h2>{result.title}</h2></header><p>{result.message}</p>{result.items?.length > 0 && <ul>{result.items.map((item) => <li key={item}>{item}</li>)}</ul>}<small>Resultado local sujeito à conferência humana.</small></article>;
}
