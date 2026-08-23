import { useMemo, useState } from "react";
import { simulatePricing } from "../services/pricing.service";

export default function usePricingSimulation(quote = {}) {
  const [inputs, setInputs] = useState({
    desconto: Number(quote.desconto || 0), frete: Number(quote.frete || 0),
    impostos: Number(quote.impostos || 0), despesas: Number(quote.despesas || 0),
  });
  const pricing = useMemo(() => simulatePricing({ ...inputs, items: quote.items || [] }), [inputs, quote.items]);
  return { inputs, update: (field, value) => setInputs((current) => ({ ...current, [field]: value })), pricing };
}
