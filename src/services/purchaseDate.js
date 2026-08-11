const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getOriginalPurchaseDate(purchase) {
  const dateOnly = String(purchase?.data_compra || "").slice(0, 10);
  const match = ISO_DATE.exec(dateOnly);
  if (!match) return "";

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isValid = date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);

  return isValid ? dateOnly : "";
}

export function formatOriginalPurchaseDate(purchase) {
  const date = getOriginalPurchaseDate(purchase);
  if (!date) return "Data não informada";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function countPurchasesWithoutOriginalDate(purchases) {
  return (purchases || []).filter((purchase) => !getOriginalPurchaseDate(purchase)).length;
}
