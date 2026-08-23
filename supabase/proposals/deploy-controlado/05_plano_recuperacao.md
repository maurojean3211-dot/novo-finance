# Backup e recuperação

Antes da primeira escrita:

1. Confirmar backups e PITR disponíveis no plano do projeto.
2. Backup lógico consistente de schema e dados críticos: empresas, usuários, clientes, contas fixas, empréstimos, recebimentos, vendas e contas a pagar.
3. Exportar policies, grants, funções, triggers, constraints, owners e histórico de migrations.
4. Registrar checksums dos artefatos.
5. Versionar fonte/configuração não secreta da Edge e nomes das variáveis. Segredos ficam no cofre, nunca no repositório/backup textual.
6. Ensaiar restore isolado ou confirmar procedimento oficial com RTO/RPO aceitos.

Recuperação:

- antes de escrita: cancelar;
- transação abortada: confirmar ausência de efeitos e repetir apenas preflight;
- RPC/audit sem uso: revogar/remover por change aprovado;
- Edge defeituosa: flags OFF, desabilitar e preservar logs;
- RLS commitada: roll-forward mínimo, nunca restaurar abertura anterior;
- dados afetados: parar tráfego, localizar timestamp e decidir restore/PITR;
- segredo exposto: desabilitar Edge e rotacionar segredo/tokens.

Rollback SQL não substitui backup. Roll-forward deve ter guard do estado observado, dupla revisão, teste isolado e validação pós-aplicação.

