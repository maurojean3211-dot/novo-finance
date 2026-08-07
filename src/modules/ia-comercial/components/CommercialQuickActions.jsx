const actions = [
  "Gerar resumo comercial do dia",
  "Mostrar prospects com retorno próximo",
  "Quais oportunidades precisam de atenção?",
  "Preparar análise comercial deste cliente",
  "Localizar produtos compatíveis com esta necessidade",
  "Preparar um resumo para orçamento",
];

export default function CommercialQuickActions({ onSelect }) {
  return <section className="commercial-quick-actions"><span>Sugestões rápidas</span><div>{actions.map((action) => <button type="button" key={action} onClick={() => onSelect(action)}>{action}<b>→</b></button>)}</div></section>;
}
