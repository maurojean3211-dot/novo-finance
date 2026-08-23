# Proposal RLS multiempresa — ajustada ao schema e grants reais

## Status

Proposal local, **não executada**, integrada com `../backend-seguro-auth-admin/`. Classificação local: **A — PRONTA PARA TESTE CONTROLADO**. Inventário/policies concretas de `empresas`, Edge/auditoria local e frontend por RPC/Edge sem fallback estão preparados; nada foi aplicado.

## Modelo da Fase 1

O isolamento usa `auth.uid() → usuarios.id → usuarios.empresa_id → tabela.empresa_id`, com policies separadas `TO authenticated` e `WITH CHECK` em INSERT/UPDATE. `empresas` deve ser antecipada e endurecida na mesma etapa transacional de `usuarios`; depois entram `clientes`, `contas_fixas`, `recebimentos` e, condicionalmente, `emprestimos`. `parcelas` permanece fora.

### Usuários e cadastro

O guard usa somente as 25 colunas reais; `is_admin` foi removida. Um usuário autenticado só atualiza `nome`, `pix`, `pix_chave`, `cpf` e `whatsapp` da própria linha. Email, tenant e todos os campos de privilégio são imutáveis pelo cliente comum.

O desenho integrado remove INSERT direto de `usuarios`: após confirmação e login, o frontend deverá chamar `provisionar_conta_v1` da proposal irmã. A migration RLS só pode ser aplicada depois dessa troca e de teste controlado, evitando quebra de cadastro.

### MasterAdmin e outros fluxos

A auditoria local encontrou leitura, criação, exclusão de usuários e atualização de `permissoes` diretamente pelo frontend em `MasterAdmin`; `PainelSistema` lista usuários e atualiza PIX; `AuthProvider` lê o perfil próprio; `ContasReceber` atualiza PIX. A proposal preserva perfil próprio e PIX, mas deliberadamente não mantém SELECT/UPDATE/DELETE global para `authenticated`.

Administração legítima usa a futura Edge Function `admin-users-v1` da proposal irmã. `master_admin=true` define administrador global; Mauro, tenant `8a85591b-2410-405f-8279-910dbcf61011`, é o usuário esperado para esse papel, sem alteração remota nesta etapa. Todo acesso global exige target explícito. `role=master` sem a flag continua tenant-only.

## Grants propostos

- `anon`: `REVOKE ALL` nas cinco tabelas da Fase 1.
- `authenticated`: revogação total seguida de `SELECT, UPDATE` em `usuarios` e CRUD em `clientes`, `contas_fixas`, `emprestimos`, `recebimentos`; nunca `TRUNCATE`, `REFERENCES` ou `TRIGGER`. Provisionamento usa somente a RPC.
- `service_role`: intocado, privilegiado e fora do modelo RLS comum.

## Policies propostas

| Tabela | SELECT | INSERT | UPDATE | DELETE | Observação |
|---|---|---|---|---|---|
| usuarios | própria linha | somente RPC `provisionar_conta_v1` | própria linha + guard de colunas | sem grant/policy | admin depende da Edge servidor |
| clientes | tenant do usuário | tenant + `WITH CHECK` | tenant + `WITH CHECK` | tenant | impede troca de tenant |
| contas_fixas | tenant do usuário | tenant + `WITH CHECK` | tenant + `WITH CHECK` | tenant | policies antes de ENABLE RLS |
| emprestimos | tenant do usuário | tenant + `WITH CHECK` | tenant + `WITH CHECK` | tenant | Fase 1 condicional |
| recebimentos | tenant + venda no mesmo tenant | tenant + venda + `WITH CHECK` | tenant + venda + `WITH CHECK` | tenant + venda | não depende de cliente órfão |

As policies antigas de `usuarios`, `clientes`, `emprestimos` e as 29 policies inventariadas de `empresas` são removidas nominalmente; policies abertas, redundantes ou baseadas apenas em `authenticated`, email ou `empresa_id IS NOT NULL` não são restauradas.

## Recebimentos

Os cinco registros remotos inventariados têm `empresa_id`, venda existente e tenant coerente. As policies exigem simultaneamente empresa do usuário e `vendas.empresa_id = recebimentos.empresa_id`. `cliente_id` não participa porque os cinco vínculos atuais não encontram linha correspondente em `clientes`. Nenhum dado é alterado.

## Parcelas fora da Fase 1

`parcelas` permanece com RLS desligado e sem alteração: tabela vazia, ownership misto, FK simples para venda sem chave tenant composta e fluxo legado em `Atrasos.jsx`. Exige auditoria funcional e decisão sobre ownership herdado versus direto antes de proteção.

## Empréstimos — Fase 1

Estruturalmente pode receber grants mínimos e RLS por `empresa_id`; a tabela está vazia e não possui tenant nulo. O frontend foi corrigido localmente para não inserir, atualizar, ler nem renderizar `historico`, coluna inexistente no remoto. Sua inclusão permanece condicionada aos testes funcionais controlados da aplicação futura, como todas as demais tabelas da fase.

## Preflight e aplicação

O preflight somente leitura registra RLS, policies nominais (incluindo as 29 de `empresas`), 25 colunas de `usuarios`, ausência de `is_admin`, constraints, triggers, empresas/usuários, nulos, coerência recebimento-venda, grants e estado de parcelas. A migration contém guards transacionais equivalentes e deve abortar se o remoto divergir. Isso não substitui revisão humana da saída.

## Empresas antecipada para a Fase 1

`empresas` não pode permanecer apenas na Fase 2. AuthProvider lê `name`; Financeiro/Admin leem ou atualizam PIX; provisionamento cria empresa; o backend administrativo valida tenant. A proteção concreta agora remove nominalmente as 29 policies remotas e concede somente SELECT/UPDATE do próprio tenant, sem INSERT/DELETE direto comum. A RPC `SECURITY DEFINER` cria empresa e a Edge servidor usa privilégio próprio.

Inventário confirmado: RLS ativo, FORCE desativado, grants completos para anon/authenticated e 29 policies permissivas. Policies abertas/temporárias incluíam `Liberar select temporario`, `Teste liberar leitura`, `empresa_insert`, `empresas liberado select/update`, `empresas_*` abertas, `liberar empresas`, `select_all_auth` e `teste_total_select`. Todas são removidas pelo nome exato; não há DROP dinâmico.

## Fase 2 obrigatória

Permanecem: `contas_pagar`, `vendas`, `despesas`, `compras`, `lancamentos` e `produtos`. `categorias` continua pendente. `empresas` foi movida para a Fase 1 integrada.

## Pendências antes de teste controlado

1. Revisar/aprovar a Edge Function e auditoria locais; não implantar ainda.
2. Aplicar futuramente RPC/RLS somente em ambiente de teste autorizado.
3. Executar fixtures Mauro, Karla, comum e cross-tenant.
4. Revisar Fase 2 e ownership de `parcelas`.

## Ordem integrada e GO/NO-GO

Ordem futura: preflight completo; trilha/Edge implementadas; RPC criada com grants; frontend migrado/testado; `empresas+usuarios` endurecidas na mesma transação; clientes; saneamento das 2 contas_fixas Mauro e RLS de contas_fixas; recebimentos; empréstimos condicional; testes; saneamento das 4 contas_pagar Mauro antes da Fase 2 de contas_pagar; demais Fase 2.

GO exige preflight integral, nenhuma policy aberta, grants mínimos, RPC e Edge disponíveis, auditoria ativa antes do primeiro uso administrativo, empresas protegida, testes Mauro/Karla/comum e cross-tenant aprovados, nenhum segredo no frontend e roll-forward documentado. Qualquer falha é NO-GO.

## Rollback

O rollback automático é fail-closed. Não restaura grants amplos, policies `true`, acesso global a `authenticated`, checks apenas `IS NOT NULL` nem desliga RLS. Preferir migration roll-forward específica. Qualquer remoção parcial dos objetos novos exige decisão humana documentada e nunca deve recriar a exposição anterior.
