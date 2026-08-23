# Ordem exata futura

`../rls-multiempresa/02_migration_proposta.sql` é uma transação única para `empresas`, `usuarios`, `clientes`, `contas_fixas`, `emprestimos` e `recebimentos`. Este plano adota aplicação atômica. Rollout tabela a tabela exige outra tarefa para dividir, guardar e revisar os artefatos.

0. Backup lógico/ponto de restauração, exportações e restore verificável.
1. Preflight read-only completo; congelar escopo.
2. Criar somente `admin_audit_log`; validar RLS/grants/constraints.
3. Criar `provisionar_conta_v1` e grants restritos; validar owner, `SECURITY DEFINER`, `search_path` e EXECUTE.
4. Implantar `admin-users-v1` com ambas as flags OFF e segredo somente servidor.
5. Validar RPC/Edge isoladamente: JWT, target, tenant, usuário comum e auditoria; sem UI ou dados destrutivos.
6. Usar `../saneamento-legado-mauro-contas-fixas/` para sanear somente `contas_fixas` IDs `3` e `5`.
7. Gate funcional de empréstimos sem `historico`.
8. Aplicar a Fase 1 RLS atomicamente e executar validação nominal imediata.
9. Smoke tests com flags OFF.
10. Colocar `VITE_SAFE_AUTH_BACKEND_ENABLED` em TEST para fixture descartável.
11. Colocar `VITE_ADMIN_USERS_EDGE_ENABLED` em TEST somente para Mauro.
12. Executar matriz Mauro/Karla/comum e cross-tenant.
13. Ativar flags gradualmente: provisionamento primeiro, administração depois, com monitoramento.
14. Nova janela: usar `../saneamento-legado-mauro-contas-pagar/` para sanear somente os quatro IDs de contas a pagar Mauro.
15. Nova proposal/testes para contas a pagar, vendas, despesas, compras, lançamentos e produtos. Categorias e parcelas permanecem pendentes.

Cada etapa termina em checkpoint e aprovação humana; nunca há continuação automática.
