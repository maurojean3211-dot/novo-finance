# analyze-financial-document-v1

Edge Function autenticada para leitura conservadora de JPG/JPEG, PNG e PDF. Ela valida o JWT, confirma `usuarios.id = auth.uid()` e `usuarios.empresa_id = empresa_id` usando o contexto RLS do chamador, envia o arquivo à Responses API e devolve campos estruturados com confiança e evidência.

Esta função não executa `INSERT`, `UPDATE`, `DELETE`, upload em Storage ou qualquer gravação financeira. O resultado serve somente para revisão humana.

## Secrets e configuração

- `OPENAI_API_KEY` (obrigatória, somente no ambiente da Edge Function)
- `OPENAI_DOCUMENT_MODEL` (opcional; padrão `gpt-4o-mini`)
- `FINANCIAL_DOCUMENT_ALLOWED_ORIGINS` (obrigatória em produção; lista separada por vírgulas)
- `SUPABASE_URL` e `SUPABASE_ANON_KEY` são fornecidas pelo ambiente Supabase

Ao implantar futuramente, manter a verificação JWT habilitada (`verify_jwt = true`). Não usar `service_role` e não expor `OPENAI_API_KEY` no frontend.

Limites locais: arquivo único, máximo de 10 MB. O conteúdo não é armazenado pela aplicação e a chamada usa `store: false` na API.
