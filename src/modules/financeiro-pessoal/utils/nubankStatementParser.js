const MONTHS = { jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06", jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12" };

function moneyValue(value) {
  const normalized = String(value || "").replace(/R\$\s*/i, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return Number(normalized.replace(/[^0-9.-]/g, ""));
}

function isoDate(day, month, year) {
  const monthNumber = /^\d+$/.test(month) ? String(month).padStart(2, "0") : MONTHS[String(month).slice(0, 3).toLocaleLowerCase("pt-BR")];
  return monthNumber ? `${year}-${monthNumber}-${String(day).padStart(2, "0")}` : "";
}

export async function extractPdfLinesLocally(file) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const grouped = new Map();
    content.items.forEach((item) => {
      const y = Math.round(Number(item.transform?.[5] || 0) / 2) * 2;
      const row = grouped.get(y) || [];
      row.push({ x: Number(item.transform?.[4] || 0), text: item.str });
      grouped.set(y, row);
    });
    [...grouped.entries()].sort((a, b) => b[0] - a[0]).forEach(([, row]) => lines.push(row.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim()));
  }
  return lines.filter(Boolean);
}

export function parseNubankStatement(lines = []) {
  const fullText = lines.join(" ").replace(/\s+/g, " ");
  const initialMatch = fullText.match(/Saldo inicial\s+(?:R\$\s*)?(-?[\d.]+,\d{2})/i);
  const printedEntries = fullText.match(/Total de entradas\s+\+\s*([\d.]+,\d{2})/i);
  const printedOutgoings = fullText.match(/Total de saídas\s+-\s*([\d.]+,\d{2})/i);
  const finalMatch = fullText.match(/Saldo final do período\s+(?:R\$\s*)?(-?[\d.]+,\d{2})/i);
  const accountHolder = lines.find((line) => line && !/CPF|Agência|Conta|DE \d{4}|VALORES EM/i.test(line)) || "";
  const statement = {
    bank: "Nubank", accountHolder, initialBalance: initialMatch ? moneyValue(initialMatch[1]) : null,
    printedIncoming: printedEntries ? moneyValue(printedEntries[1]) : null,
    printedOutgoing: printedOutgoings ? moneyValue(printedOutgoings[1]) : null,
    finalBalance: finalMatch ? moneyValue(finalMatch[1]) : null, transactions: [], warnings: [],
  };
  let currentDate = "";
  let currentDirection = "";
  let lastTransaction = null;
  let movementsStarted = false;
  const ignored = (line) => line === accountHolder || /^(CPF|Agência|Conta|\d{2} DE |VALORES EM R\$|Tem alguma dúvida|Caso a solução|Extrato gerado|O saldo líquido|Não nos responsabilizamos|Asseguramos|Nu Financeira|Investimento Pagamento|CNPJ:)/i.test(line);

  const parseTransactionLine = (line) => {
    const amountMatch = String(line).match(/(?:R\$\s*)?([\d.]+,\d{2})\s*$/i);
    if (!amountMatch || !currentDate || !currentDirection) return false;
    const description = line.slice(0, amountMatch.index).trim().replace(/[+-]\s*$/, "").trim();
    if (!description || /^Total de (entradas|saídas)/i.test(description)) return false;
    const normalizedHolder = accountHolder.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    const normalizedDescription = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    lastTransaction = { id: `nubank-${statement.transactions.length + 1}`, date: currentDate, description, direction: currentDirection, amount: Math.abs(moneyValue(amountMatch[1])), isOwnTransfer: /^transferência enviada pelo pix/i.test(description) && normalizedHolder && normalizedDescription.includes(normalizedHolder) };
    statement.transactions.push(lastTransaction);
    return true;
  };

  lines.forEach((line) => {
    if (/^Movimentações$/i.test(line)) { movementsStarted = true; lastTransaction = null; return; }
    if (!movementsStarted) return;
    const date = line.match(/^\s*(\d{1,2})[\s/-]+([A-Za-zÀ-ÿ]{3,}|\d{1,2})[\s/-]+(\d{4})\b/i);
    if (date) {
      currentDate = isoDate(date[1], date[2], date[3]);
      currentDirection = "";
      lastTransaction = null;
      const remainder = line.slice(date[0].length).trim();
      const total = remainder.match(/^Total de (entradas|saídas)\s+[+-]\s*[\d.]+,\d{2}$/i);
      if (total) currentDirection = /^entradas$/i.test(total[1]) ? "entrada" : "saida";
      return;
    }
    const total = line.match(/^Total de (entradas|saídas)\s+[+-]\s*[\d.]+,\d{2}$/i);
    if (total) { currentDirection = /^entradas$/i.test(total[1]) ? "entrada" : "saida"; lastTransaction = null; return; }
    if (ignored(line)) { lastTransaction = null; return; }
    if (!parseTransactionLine(line) && lastTransaction && !/^\d+\s+de\s+\d+$/i.test(line)) lastTransaction.description = `${lastTransaction.description} ${line}`.replace(/\s+/g, " ").trim();
  });
  if (!statement.transactions.length) statement.warnings.push("Nenhuma movimentação reconhecida. Confirme se o arquivo é um extrato Nubank em PDF com texto selecionável.");
  if (statement.initialBalance == null) statement.warnings.push("Saldo inicial não identificado no extrato.");
  if (statement.finalBalance == null) statement.warnings.push("Saldo final não identificado no extrato.");
  if (statement.printedIncoming == null || statement.printedOutgoing == null) statement.warnings.push("Totais impressos de entradas ou saídas não identificados.");
  return statement;
}
