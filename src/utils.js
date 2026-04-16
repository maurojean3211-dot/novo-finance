// utils.js

export function formatarData(data) {
  if (!data) return "-";

  const d = new Date(data);

  if (isNaN(d)) return data;

  return d.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}