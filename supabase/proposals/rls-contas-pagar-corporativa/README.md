# Hardening RLS — `public.contas_pagar`

Proposta local independente e não executada.

Diagnóstico: a policy `ler contas pagar` usa `USING (true)` para `authenticated`, permitindo leitura de todos os tenants. A proposta troca apenas essa policy por uma verificação do vínculo `usuarios.id = auth.uid()` e `usuarios.empresa_id = contas_pagar.empresa_id`.

Impacto esperado: usuários autenticados deixam de ler contas de outros tenants; consultas corretamente filtradas continuam funcionando. Risco: usuários sem perfil válido em `public.usuarios` passam a receber zero linhas. Executar preflight e teste por identidade antes de qualquer aplicação.

Este pacote não cria nem popula `contas_pagar_pessoais` e exige aprovação separada.
