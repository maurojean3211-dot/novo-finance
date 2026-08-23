import { supabase } from "../../../supabase";

export const DOCUMENT_READER_MESSAGE =
  "Leitura automática indisponível. Você pode preencher os dados manualmente.";

const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const maxFileSize = 10 * 1024 * 1024;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

export function validateFinancialDocument(file) {
  if (!file) throw new Error("Selecione um arquivo para leitura.");
  if (!allowedTypes.has(file.type)) throw new Error("Formato não aceito. Use JPG, JPEG, PNG ou PDF.");
  if (file.size <= 0) throw new Error("O arquivo selecionado está vazio.");
  if (file.size > maxFileSize) throw new Error("O arquivo excede o limite de 10 MB.");
}

export async function analyzeFinancialDocument({ file, context, empresaId, destination, documentType }) {
  validateFinancialDocument(file);
  if (!empresaId) throw new Error("Não foi possível identificar a empresa ativa com segurança.");

  const base64 = await fileToBase64(file);
  if (!base64) throw new Error("Não foi possível preparar o arquivo para leitura.");

  const { data, error } = await supabase.functions.invoke("analyze-financial-document-v1", {
    body: {
      context,
      empresa_id: empresaId,
      destination,
      document_type: documentType,
      file: { name: file.name, type: file.type, size: file.size, base64 },
    },
  });

  if (error) throw new Error(error.message || DOCUMENT_READER_MESSAGE);
  if (!data?.extraction?.fields) throw new Error("O serviço não retornou uma leitura válida.");
  return data;
}
