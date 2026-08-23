import { useCallback, useEffect, useState } from "react";

const PTAX_ENDPOINT = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)";
const UNAVAILABLE_MESSAGE = "Dados de mercado indisponíveis";

const marketDefinitions = [
  { id: "usd", icon: "$", name: "Dólar", pair: "USD/BRL", currency: "USD" },
  { id: "eur", icon: "€", name: "Euro", pair: "EUR/BRL", currency: "EUR" },
  { id: "lme", icon: "Al", name: "LME Alumínio", pair: "USD/TON", currency: null },
];

function apiDate(date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", month: "2-digit", day: "2-digit", year: "numeric" }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${value.month}-${value.day}-${value.year}`;
}

function referenceDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

function unavailableQuote(definition, error = null) {
  return { ...definition, status: "unavailable", value: null, reference: null, source: null, message: UNAVAILABLE_MESSAGE, error };
}

export const initialMarketData = {
  status: "loading",
  quotes: marketDefinitions.map((definition) => ({ ...unavailableQuote(definition), status: definition.currency ? "loading" : "unavailable" })),
};

export async function fetchPtaxQuote(currency, { fetchImpl = fetch, now = new Date() } = {}) {
  const start = new Date(now);
  start.setDate(start.getDate() - 15);
  const params = new URLSearchParams({ "@moeda": `'${currency}'`, "@dataInicial": `'${apiDate(start)}'`, "@dataFinalCotacao": `'${apiDate(now)}'`, "$format": "json" });
  const response = await fetchImpl(`${PTAX_ENDPOINT}?${params}`);
  if (!response.ok) throw new Error(`PTAX respondeu com status ${response.status}`);

  const payload = await response.json();
  const closingBulletins = (payload.value ?? [])
    .filter((item) => item.tipoBoletim === "Fechamento" && Number.isFinite(Number(item.cotacaoVenda)))
    .sort((a, b) => String(b.dataHoraCotacao).localeCompare(String(a.dataHoraCotacao)));
  const latest = closingBulletins[0];
  if (!latest) throw new Error("Nenhum boletim de fechamento PTAX disponível no período");

  return { value: Number(latest.cotacaoVenda), reference: referenceDate(latest.dataHoraCotacao), source: "Banco Central do Brasil · Fechamento PTAX", bulletin: latest.tipoBoletim };
}

export async function loadMarketData(options = {}) {
  const results = await Promise.allSettled([fetchPtaxQuote("USD", options), fetchPtaxQuote("EUR", options)]);
  const quotes = marketDefinitions.map((definition) => {
    if (!definition.currency) return unavailableQuote(definition);
    const result = results[definition.currency === "USD" ? 0 : 1];
    if (result.status === "rejected") return unavailableQuote(definition, result.reason?.message ?? "Falha de rede");
    return { ...definition, status: "available", ...result.value, message: null, error: null };
  });
  return { status: quotes.some((quote) => quote.status === "available") ? "available" : "unavailable", quotes };
}

export function formatMarketValue(quote) {
  if (quote.status !== "available") return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(quote.value);
}

export function marketQuoteDetail(quote) {
  if (quote.status === "loading") return "Carregando cotação oficial…";
  if (quote.status !== "available") return UNAVAILABLE_MESSAGE;
  return `PTAX ref. ${quote.reference}`;
}

export function useMarketData() {
  const [marketData, setMarketData] = useState(initialMarketData);
  const reload = useCallback(async () => {
    setMarketData(initialMarketData);
    setMarketData(await loadMarketData());
  }, []);

  useEffect(() => {
    let active = true;
    loadMarketData().then((data) => { if (active) setMarketData(data); });
    return () => { active = false; };
  }, []);

  return { ...marketData, reload };
}
