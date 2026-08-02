// utils.js

export function formatarData(data) {
  if (!data) return "-";

  const d = new Date(data);

  if (isNaN(d)) return data;

  return d.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

export function formatarMoeda(valor, options = {}) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", ...options });
}

export function formatarNumero(valor, options = {}) {
  return Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, ...options });
}

export function converterValor(valor) {
  return Number(String(valor || "").trim().replace(/\./g, "").replace(",", "."));
}

export function dataAtualIso() {
  return new Date().toISOString().slice(0, 10);
}

export function confirmarAcao(mensagem) {
  return window.confirm(mensagem);
}
