import { useState } from "react";
import useAuth from "../../../app/providers/useAuth";
import { clearOperationKey, getOperationKey } from "../../../utils";
import {
  analyzeFinancialDocument,
  validateFinancialDocument,
} from "../services/financialDocumentExtraction.service";

import "../financial-document-prototype.css";
import "../financial-document-modal-layout.css";
import "../financial-document-reader.css";

const documentTypes = [
  ["receipt", "Foto de cupom/recibo"],
  ["utility", "Boleto ou conta de consumo"],
  ["proof", "Comprovante bancário/PIX"],
  ["statement", "Print/PDF de extrato"],
  ["invoice", "PDF de fatura/nota"],
];

const fieldDefinitions = [
  ["establishment", "Estabelecimento/favorecido"],
  ["tax_id", "CNPJ/CPF"],
  ["date", "Data"],
  ["time", "Hora"],
  ["total_amount", "Valor total"],
  ["payment_method", "Forma de pagamento"],
  ["bank", "Banco/instituição"],
  ["description", "Descrição"],
  ["transaction_number", "Número da transação"],
  ["nsu", "NSU"],
  ["authorization", "Autorização"],
  ["document_identifier", "Identificador/documento"],
  ["installments", "Parcelas"],
];

const emptyReview = Object.fromEntries(
  fieldDefinitions.map(([key]) => [key, ""])
);

const confidenceLabel = (value) =>
  value == null
    ? "Confiança não informada"
    : `Confiança ${Math.round(value * 100)}%`;

function payableAmount(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^\d,.-]/g, "");

  const decimal = normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized;

  const amount = Number(decimal);

  return amount > 0 ? String(amount) : "";
}

/*
 * Converte:
 * 15/08/2026 -> 2026-08-15
 *
 * Se já vier:
 * 2026-08-15
 *
 * mantém como está.
 */
function databaseDate(value) {
  const normalized = String(value ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const match = normalized.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (!match) {
    return "";
  }

  const [, day, month, year] = match;

  return `${year}-${month}-${day}`;
}

/*
 * Identifica formas de pagamento que normalmente
 * representam pagamento já realizado.
 *
 * Não considera cartão de crédito como pago aqui,
 * porque crédito deve seguir o fluxo de cartão/fatura.
 */
function isAlreadyPaidPaymentMethod(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) return false;

  const paidTerms = [
    "debito",
    "cartao de debito",
    "compra no debito",
    "pix",
    "pagamento pix",
    "pix realizado",
    "pix enviado",
    "dinheiro",
    "especie",
  ];

  return paidTerms.some((term) =>
    normalized.includes(term)
  );
}

/*
 * Texto amigável usado na revisão humana.
 */
function paymentSituation(review) {
  if (
    isAlreadyPaidPaymentMethod(review.payment_method)
  ) {
    return {
      paid: true,
      label: "Pago / realizado",
      message: `Pagamento identificado como “${
        review.payment_method
      }”. Este documento representa um gasto já realizado.`,
    };
  }

  return {
    paid: false,
    label: "Não confirmado como pago",
    message:
      "A forma de pagamento não permite concluir automaticamente que a obrigação já foi quitada.",
  };
}

function payableNotes(review) {
  return [
    ["Banco", review.bank],
    [
      "Forma de pagamento",
      review.payment_method,
    ],
    [
      "Número da transação",
      review.transaction_number,
    ],
    ["NSU", review.nsu],
    ["Autorização", review.authorization],
    [
      "Identificador/documento",
      review.document_identifier,
    ],
  ]
    .filter(([, value]) =>
      String(value || "").trim()
    )
    .map(
      ([label, value]) =>
        `${label}: ${String(value).trim()}`
    )
    .join(" · ");
}

export default function FinancialDocumentPrototype({
  context = "personal",
  empresaId,
  destination,
  companyName,
  onConfirmPayable,
  onConfirmExpense,
}) {
  const { empresaId: authenticatedEmpresaId } =
    useAuth();

  const scopedEmpresaId =
    empresaId || authenticatedEmpresaId;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("source");
  const [documentType, setDocumentType] =
    useState("receipt");

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const [result, setResult] = useState(null);

  const [readState, setReadState] =
    useState("idle");

  const [readError, setReadError] = useState("");

  const [review, setReview] =
    useState(emptyReview);

  const [confirming, setConfirming] =
    useState(false);

  const [confirmError, setConfirmError] =
    useState("");

  const contextLabel =
    context === "personal"
      ? "Pessoa Física · Financeiro Pessoal"
      : `Empresa · Financeiro Empresarial — ${
          companyName || "empresa ativa"
        }`;

  const situation = paymentSituation(review);

  function reset(nextType = "receipt") {
    setStep("source");
    setDocumentType(nextType);

    setFile(null);
    setFileError("");

    setResult(null);

    setReadState("idle");
    setReadError("");

    setReview(emptyReview);

    setConfirming(false);
    setConfirmError("");
  }

  function close() {
    setOpen(false);
    reset();
  }

  function selectFile(selected) {
    setFileError("");
    setResult(null);
    setReadState("idle");

    try {
      validateFinancialDocument(selected);
      setFile(selected);
    } catch (error) {
      setFile(null);
      setFileError(error.message);
    }
  }

  async function startReading() {
    setStep("reading");
    setReadState("loading");
    setReadError("");
    setResult(null);

    try {
      if (
        empresaId &&
        authenticatedEmpresaId &&
        empresaId !== authenticatedEmpresaId
      ) {
        throw new Error(
          "O contexto da tela não corresponde à empresa autenticada."
        );
      }

      const response =
        await analyzeFinancialDocument({
          file,
          context,
          empresaId: scopedEmpresaId,
          destination,
          documentType,
        });

      setResult(response);

      const extractedReview =
        Object.fromEntries(
          fieldDefinitions.map(([key]) => [
            key,
            response.extraction.fields[key]
              ?.value ?? "",
          ])
        );

      /*
       * Se a IA identificou o estabelecimento,
       * mas não conseguiu criar uma descrição,
       * usamos o estabelecimento como descrição
       * inicial para revisão humana.
       *
       * O usuário continua podendo editar.
       */
      if (
        !String(
          extractedReview.description || ""
        ).trim() &&
        String(
          extractedReview.establishment || ""
        ).trim()
      ) {
        extractedReview.description =
          extractedReview.establishment;
      }

      setReview(extractedReview);

      setReadState(
        response.extraction.completeness ===
          "complete"
          ? "complete"
          : "partial"
      );
    } catch (error) {
      setReadError(
        error.message ||
          "Não foi possível realizar a leitura automática."
      );

      setReadState("error");
      setReview(emptyReview);
    }
  }

  /*
   * CONTAS A PAGAR
   *
   * Se o documento já comprova pagamento por
   * débito / PIX / dinheiro, NÃO criamos uma
   * conta pendente.
   *
   * Isso evita:
   * débito pago -> Conta a Pagar Pendente
   *
   * Pagamentos de contas continuam usando as RPCs
   * específicas existentes no sistema.
   */
  async function confirmPayable() {
    if (!onConfirmPayable || confirming) return;

    if (situation.paid) {
      setConfirmError(
        `Este documento indica pagamento já realizado (${review.payment_method}). Não deve ser criado como Conta a Pagar pendente. Lance-o em Despesas Pessoais.`
      );

      return;
    }

    const operationScope = `documento-pagar:${scopedEmpresaId}:${destination}`;
    const values = {
      modo: "unico",

      fornecedor:
        review.establishment.trim(),

      descricao:
        review.description.trim() ||
        review.establishment.trim(),

      valor: payableAmount(
        review.total_amount
      ),

      vencimento: databaseDate(
        review.date
      ),

      categoria: "",

      observacoes:
        payableNotes(review),

      status: "Pendente",
      idempotency_key: getOperationKey(operationScope),
    };

    if (
      !values.descricao ||
      !values.valor ||
      !values.vencimento
    ) {
      setConfirmError(
        "Preencha a descrição, informe um valor maior que zero e uma data válida antes de confirmar."
      );

      return;
    }

    setConfirming(true);
    setConfirmError("");

    try {
      await onConfirmPayable(values);
      clearOperationKey(operationScope);
      close();
    } catch (error) {
      setConfirmError(
        error.message ||
          "Não foi possível lançar a conta a pagar."
      );
    } finally {
      setConfirming(false);
    }
  }

  /*
   * DESPESA PESSOAL
   *
   * A tabela despesas representa gastos realizados.
   * Portanto, débito/PIX/dinheiro entram normalmente
   * aqui depois da confirmação humana.
   */
  async function confirmExpense() {
    if (!onConfirmExpense || confirming) return;

    const operationScope = `documento-despesa:${scopedEmpresaId}:${destination}`;
    const values = {
      descricao:
        review.description.trim() ||
        review.establishment.trim(),

      valor: payableAmount(
        review.total_amount
      ),

      data: databaseDate(
        review.date
      ),

      categoria: "",
      idempotency_key: getOperationKey(operationScope),
    };

    if (
      !values.descricao ||
      !values.valor ||
      !values.data
    ) {
      setConfirmError(
        "Preencha a descrição, informe um valor maior que zero e uma data válida antes de confirmar."
      );

      return;
    }

    setConfirming(true);
    setConfirmError("");

    try {
      await onConfirmExpense(values);
      clearOperationKey(operationScope);
      close();
    } catch (error) {
      setConfirmError(
        error.message ||
          "Não foi possível lançar a despesa."
      );
    } finally {
      setConfirming(false);
    }
  }

  const readingCopy =
    readState === "loading"
      ? [
          "LENDO DOCUMENTO",
          "Lendo documento...",
          "O arquivo está sendo analisado com segurança. Nenhum lançamento será criado.",
        ]
      : readState === "complete"
        ? [
            "LEITURA CONCLUÍDA",
            "Leitura automática concluída. Confira os dados antes de salvar.",
            "Somente dados acompanhados de evidência foram preenchidos.",
          ]
        : readState === "partial"
          ? [
              "LEITURA PARCIAL",
              "Alguns dados não puderam ser identificados. Confira e complete os campos.",
              "Campos sem confiança suficiente permaneceram vazios.",
            ]
          : [
              "LEITURA NÃO CONCLUÍDA",
              "Não foi possível realizar a leitura automática. Você pode preencher os dados manualmente.",
              readError,
            ];

  return (
    <>
      <button
        type="button"
        className="doc-prototype-launcher"
        onClick={() => {
          reset(
            destination?.includes(
              "Conciliação"
            )
              ? "statement"
              : "receipt"
          );

          setOpen(true);
        }}
      >
        ▣ Lançar por Foto/PDF/Print
      </button>

      {open && (
        <div
          className="doc-prototype-overlay"
          onMouseDown={(event) =>
            event.target ===
              event.currentTarget && close()
          }
        >
          <section
            className="doc-prototype-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Leitura de documento financeiro"
          >
            <header>
              <div>
                <span>
                  LEITURA AUTOMÁTICA · REVISÃO
                  OBRIGATÓRIA
                </span>

                <h2>
                  Lançar por Foto/PDF/Print
                </h2>

                <p>
                  O documento será lido, mas
                  nada será gravado sem sua
                  confirmação.
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <div className="doc-prototype-context">
              <span>
                Contexto de destino
              </span>

              <strong>
                {contextLabel}
              </strong>

              <small>
                Tela de origem: {destination}
              </small>
            </div>

            <nav
              className="doc-prototype-steps"
              aria-label="Etapas"
            >
              <span
                className={
                  step === "source"
                    ? "active"
                    : "done"
                }
              >
                1. Upload
              </span>

              <span
                className={
                  step === "reading"
                    ? "active"
                    : step === "review"
                      ? "done"
                      : ""
                }
              >
                2. Leitura/OCR
              </span>

              <span
                className={
                  step === "review"
                    ? "active"
                    : ""
                }
              >
                3. Revisão humana
              </span>
            </nav>

            {step === "source" && (
              <div className="doc-prototype-body">
                <section className="doc-prototype-types">
                  <h3>
                    Qual documento deseja ler?
                  </h3>

                  <div>
                    {documentTypes.map(
                      ([value, label]) => (
                        <button
                          type="button"
                          className={
                            documentType ===
                            value
                              ? "active"
                              : ""
                          }
                          key={value}
                          onClick={() =>
                            setDocumentType(
                              value
                            )
                          }
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                </section>

                <label className="doc-prototype-drop">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(event) =>
                      selectFile(
                        event.target
                          .files?.[0]
                      )
                    }
                  />

                  <b>
                    {file
                      ? file.name
                      : "Selecionar foto, print ou PDF"}
                  </b>

                  <span>
                    {file
                      ? `${(
                          file.size / 1024
                        ).toFixed(1)} KB · ${
                          file.type
                        }`
                      : "JPG, JPEG, PNG ou PDF · até 10 MB"}
                  </span>

                  <small>
                    O arquivo só será enviado
                    ao serviço de leitura após
                    clicar em “Ler documento”.
                  </small>
                </label>

                {fileError && (
                  <div
                    className="doc-prototype-file-error"
                    role="alert"
                  >
                    {fileError}
                  </div>
                )}

                <div className="doc-prototype-safety">
                  <strong>
                    {file
                      ? "Arquivo válido para leitura"
                      : "Nenhum arquivo válido selecionado"}
                  </strong>

                  <p>
                    O contexto
                    pessoal/empresarial e a
                    empresa ativa serão
                    validados novamente no
                    servidor.
                  </p>
                </div>
              </div>
            )}

            {step === "reading" && (
              <div className="doc-prototype-body doc-prototype-reading">
                <div
                  className={`doc-prototype-reading-card ${readState}`}
                  aria-live="polite"
                >
                  <span>
                    {readingCopy[0]}
                  </span>

                  <strong>
                    {readingCopy[1]}
                  </strong>

                  <p>{readingCopy[2]}</p>

                  <small>
                    {file?.name} ·{" "}
                    {file?.type}
                  </small>

                  {readState ===
                    "loading" && (
                    <i
                      className="doc-prototype-spinner"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {result?.extraction
                  ?.conflicts?.length > 0 && (
                  <div className="doc-prototype-conflicts">
                    <strong>
                      Conflitos encontrados —
                      revisão necessária
                    </strong>

                    {result.extraction.conflicts.map(
                      (conflict, index) => (
                        <span
                          key={`${conflict.field}-${index}`}
                        >
                          {conflict.field}:{" "}
                          {conflict.candidates.join(
                            " × "
                          )}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {step === "review" && (
              <div className="doc-prototype-body">
                <div className="doc-prototype-review-title">
                  <div>
                    <span>
                      REVISAR ANTES DE SALVAR
                    </span>

                    <h3>
                      Dados do documento
                    </h3>
                  </div>

                  <b>Nada foi gravado</b>
                </div>

                {readState === "error" && (
                  <div className="doc-prototype-no-extraction">
                    <strong>
                      Preenchimento manual
                    </strong>

                    <span>
                      A leitura falhou; todos
                      os campos começaram
                      vazios.
                    </span>
                  </div>
                )}

                {result?.extraction
                  ?.suggested_destination
                  ?.value && (
                  <div className="doc-prototype-destination">
                    <span>
                      Destino sugerido dentro
                      do contexto autorizado
                    </span>

                    <strong>
                      {
                        result.extraction
                          .suggested_destination
                          .value
                      }
                    </strong>
                  </div>
                )}

                {review.payment_method && (
                  <div
                    className={
                      situation.paid
                        ? "doc-prototype-destination"
                        : "doc-prototype-safety"
                    }
                  >
                    <span>
                      Situação do pagamento
                    </span>

                    <strong>
                      {situation.label}
                    </strong>

                    <small>
                      {situation.message}
                    </small>
                  </div>
                )}

                <div className="doc-prototype-fields">
                  {fieldDefinitions.map(
                    ([key, label]) => {
                      const metadata =
                        result?.extraction
                          ?.fields?.[key];

                      return (
                        <label
                          className={
                            key ===
                            "description"
                              ? "wide"
                              : ""
                          }
                          key={key}
                        >
                          <span>
                            {label}
                          </span>

                          <input
                            value={
                              review[key]
                            }
                            placeholder="Não identificado"
                            onChange={(
                              event
                            ) =>
                              setReview(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [key]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                          />

                          {metadata && (
                            <small
                              className={
                                metadata.value ==
                                null
                                  ? "uncertain"
                                  : ""
                              }
                            >
                              {confidenceLabel(
                                metadata.confidence
                              )}

                              {metadata.evidence
                                ? ` · Evidência: “${metadata.evidence}”`
                                : " · Sem evidência segura"}
                            </small>
                          )}
                        </label>
                      );
                    }
                  )}
                </div>

                {result?.extraction
                  ?.warnings?.length > 0 && (
                  <div className="doc-prototype-warnings">
                    {result.extraction.warnings.map(
                      (warning) => (
                        <span
                          key={warning}
                        >
                          {warning}
                        </span>
                      )
                    )}
                  </div>
                )}

                {confirmError && (
                  <div
                    className="doc-prototype-file-error"
                    role="alert"
                  >
                    {confirmError}
                  </div>
                )}
              </div>
            )}

            <footer>
              <button
                type="button"
                disabled={
                  readState === "loading" ||
                  confirming
                }
                onClick={
                  step === "review"
                    ? () =>
                        setStep("reading")
                    : step === "reading"
                      ? () =>
                          setStep("source")
                      : close
                }
              >
                {step === "source"
                  ? "Cancelar"
                  : "Voltar"}
              </button>

              {step === "source" ? (
                <button
                  type="button"
                  className="primary"
                  disabled={!file}
                  onClick={() =>
                    void startReading()
                  }
                >
                  Ler documento
                </button>
              ) : step === "reading" ? (
                <button
                  type="button"
                  className="primary"
                  disabled={
                    readState === "loading"
                  }
                  onClick={() =>
                    setStep("review")
                  }
                >
                  {readState === "error"
                    ? "Preencher manualmente"
                    : "Revisar dados extraídos"}
                </button>
              ) : onConfirmExpense ? (
                <button
                  type="button"
                  className="primary"
                  disabled={confirming}
                  onClick={() =>
                    void confirmExpense()
                  }
                >
                  {confirming
                    ? "Lançando…"
                    : situation.paid
                      ? "Confirmar despesa paga"
                      : "Confirmar e lançar despesa"}
                </button>
              ) : (
                <button
                  type="button"
                  className="primary"
                  disabled={
                    !onConfirmPayable ||
                    confirming ||
                    situation.paid
                  }
                  onClick={() =>
                    void confirmPayable()
                  }
                >
                  {confirming
                    ? "Lançando…"
                    : situation.paid
                      ? "Documento já pago"
                      : "Confirmar e lançar"}
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
