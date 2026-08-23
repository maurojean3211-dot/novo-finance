# Preflight obrigatório — read-only

Registrar evidência, horário, projeto e aprovação de dois responsáveis. Qualquer item diferente de `OK` é STOP.

## Projeto e recuperação

- [ ] Project ref, URL e organização são o ambiente autorizado.
- [ ] Branch, commit e checksums aprovados; histórico remoto de migrations comparado, sem repair pendente.
- [ ] Janela, responsáveis, canal de incidente, backup e restauração/PITR confirmados.

## Identidades

- [ ] Mauro: empresa e usuário `8a85591b-2410-405f-8279-910dbcf61011`; `role=master`, `master_admin=true`.
- [ ] Karla: empresa `3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef`; perfil `c7670555-a2d7-4d03-b922-6fb5e7f87e7a` no tenant Karla e sem master global.
- [ ] Nenhum segundo `master_admin=true` inesperado.

## Schema, policies, grants e integridade

- [ ] Rodar, por conexão read-only, os preflights de RLS, backend e do saneamento independente correspondente à etapa.
- [ ] Exatamente as 29 policies nominais esperadas em `empresas`; demais policies, grants, colunas, constraints, triggers e RLS idênticos ao inventário.
- [ ] RPC, audit log e policies substitutas ausentes, salvo implantação formal registrada.
- [ ] Nenhum `empresa_id NULL` nas tabelas Fase 1.
- [ ] `recebimentos.empresa_id` coerente com `vendas.empresa_id`; órfãos conhecidos sem mudança.

## Legado

- [ ] `contas_fixas` IDs `3` e `5` ainda em `becf3dd8-33d2-4412-bab6-559b264bed07`.
- [ ] Quatro `contas_pagar` ainda em `becf`: `c17314e1-8279-4157-bdef-76eb15c77c84`, `40091009-11fb-4c5c-ac63-24a7c4070428`, `fd37b52a-69a1-4ad3-91c5-514b88c1a49c`, `f9aa8622-1204-48c6-99e8-dae4eb1469bb`.
- [ ] Grupo `8b15d30f-6dcb-487f-9fb8-9d387c7f8b1d`: duas vendas e dois recebimentos, intactos.
- [ ] Nenhum registro adicional nos tenants legados.

## Aplicação

- [ ] Build/lint do commit candidato aprovados; nenhum secret/service role no frontend/bundle.
- [ ] `VITE_SAFE_AUTH_BACKEND_ENABLED=false` e `VITE_ADMIN_USERS_EDGE_ENABLED=false`.
- [ ] Empréstimos sem `historico` e funcionalmente aprovado.
- [ ] Local × remoto sem divergência. Divergência exige nova auditoria, nunca ajuste durante a janela.
