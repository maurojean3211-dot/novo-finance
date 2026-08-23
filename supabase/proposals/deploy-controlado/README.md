# Implantação controlada — runbook documental

Este diretório não autoriza aplicação e não contém migration oficial nova. Classificação local: **A1 — PRONTA PARA JANELA DE TESTE CONTROLADO**. Os dois saneamentos independentes estão preparados; backup, configuração externa, aprovação humana e preflight continuam obrigatórios.

Toda etapa exige aprovação humana explícita. Divergência, falha ou resultado inconclusivo significa `STOP / NO-GO`; nunca avançar automaticamente.

## Inventário e dependências

- `../rls-multiempresa/`: preflight, transação RLS Fase 1, validação e rollback fail-closed.
- `../backend-seguro-auth-admin/`: RPC, grants, audit log, contrato, testes e Edge Function.
- `../saneamento-legado-mauro-contas-fixas/`: dois IDs explícitos, Fase 1 antes do RLS de contas fixas.
- `../saneamento-legado-mauro-contas-pagar/`: quatro UUIDs explícitos, Fase 2 antes do endurecimento de contas a pagar.
- `../saneamento-legado-mauro/`: artefato combinado legado preservado; não usar no runbook dividido.
- Edge fonte: `../backend-seguro-auth-admin/edge-function/admin-users-v1/`; destino futuro convencional: `supabase/functions/admin-users-v1/`.
- Frontend: `src/Login.jsx`, `src/Cadastro.jsx`, `src/MasterAdmin.jsx`, `src/PainelSistema.jsx`, `src/Emprestimos.jsx`.
- Serviços: `src/services/secureAuth.service.js`, `src/services/adminUsers.service.js`.

`admin_audit_log` precede a Edge; RPC precede a retirada do INSERT direto; Edge validada precede UI; duas contas fixas saneadas precedem RLS. A proposal RLS atual é atômica para seis tabelas. Empréstimos precisa passar no gate funcional antes dela, ou a proposal deve ser dividida e revista em tarefa futura.

Arquivos deste runbook: `01_preflight_checklist.md`, `02_ordem_implantacao.md`, `03_checkpoints_stop_go.md`, `04_plano_testes.md`, `05_plano_recuperacao.md`, `06_comandos_futuros.md`.
