export default function DailyCommercialSummary({ onGenerate, result }) {
  return <section className="daily-commercial-summary"><header><div><span>Resumo local</span><h2>Resumo comercial do dia</h2></div><button type="button" onClick={onGenerate}>Gerar resumo</button></header>{result ? <div><p>{result.message}</p>{result.items.length > 0 && <ul>{result.items.map((item) => <li key={item}>{item}</li>)}</ul>}</div> : <p>Consolide retornos, novos registros, vendas e alertas comprováveis.</p>}</section>;
}
