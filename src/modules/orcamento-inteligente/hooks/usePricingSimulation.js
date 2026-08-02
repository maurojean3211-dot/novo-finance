import { useMemo, useState } from "react";
import { simulatePricing } from "../services/pricing.service";
export default function usePricingSimulation() { const [inputs, setInputs] = useState({ desconto: 1.5, frete: 6850, condicaoPagamento: "28 dias", quantidade: 100, fornecedor: "Liga Brasil" }); const pricing = useMemo(() => simulatePricing(inputs), [inputs]); return { inputs, update: (field, value) => setInputs((current) => ({ ...current, [field]: value })), pricing }; }
