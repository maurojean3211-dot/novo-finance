# Modelo de Permissões

## Princípios

- Permissões serão concedidas no contexto de uma empresa.
- Ocultar menus ou botões não representa segurança.
- A autorização será aplicada também no banco por RLS e, quando necessário, no servidor.
- Menor privilégio será o padrão; permissões adicionais serão explícitas e auditáveis.
- O mesmo usuário poderá ter papéis diferentes em empresas diferentes.

## Perfis iniciais

### Vendedor

Vê apenas seus clientes, oportunidades, orçamentos e vendas, salvo permissão adicional. Não altera preços mínimos, margens ou limites de desconto sem autorização.

### Supervisor

Vê a equipe sob sua responsabilidade e revisa negociações dentro de sua alçada, sem acesso automático a outras equipes.

### Diretor

Vê toda a operação da empresa e os indicadores comerciais e financeiros autorizados. Define metas, políticas comerciais e alçadas.

### Estoque

Consulta catálogo e pedidos relacionados e registra recebimentos, separações, inventários e ajustes conforme alçada.

### Compras

Gerencia fornecedores, cotações e pedidos. Consulta necessidades e catálogo, mas não realiza baixas financeiras ou ajustes fora do fluxo.

### Financeiro

Gerencia contas a pagar, contas a receber, baixas, conciliação e caixa. O acesso comercial limita-se ao necessário.

### Administrador da empresa

Gerencia usuários, papéis e configurações internas da própria empresa. Não administra outras empresas ou a plataforma.

### Somente leitura

Consulta apenas os módulos e registros explicitamente autorizados, sem criar, editar, excluir, aprovar, importar ou exportar dados quando a exportação não estiver concedida separadamente.

### Master Admin da plataforma

Gerencia empresas, planos, limites e funcionamento do SaaS. Não acessa indiscriminadamente dados comerciais. Suporte excepcional será autorizado, temporário, justificado e auditado.

## Escopos de visibilidade

- O vendedor visualiza seus próprios dados.
- O supervisor visualiza sua equipe sob responsabilidade.
- O diretor visualiza toda a operação da empresa.
- O administrador da empresa gerencia usuários e configurações internas.
- O Master Admin administra empresas, planos e plataforma, sem acesso comercial privado fora de mecanismo formal, autorizado e auditado.

O Painel do Vendedor e o Painel Executivo deverão respeitar esses mesmos escopos em consultas, gráficos, relatórios e exportações.

## Modelo recomendado

```text
crm.clientes.ler_proprios
crm.clientes.ler_equipe
crm.clientes.ler_empresa
orcamentos.criar
orcamentos.aprovar_desconto
estoque.ajustar
financeiro.baixar
empresa.usuarios.gerenciar
plataforma.empresas.gerenciar
plataforma.planos.gerenciar
relatorios.exportar
financeiro_pessoal.ler
mercado.cotacoes.visualizar
mercado.cotacoes.atualizar_manual
mercado.fontes.configurar
mercado.regras_preco.configurar
mercado.impacto.simular
mercado.precos.aprovar_atualizacao
mercado.cotacoes.consultar_historico
```

Papéis serão conjuntos de permissões, não condições fixas espalhadas pelas telas. Propriedade, equipe e empresa serão verificadas sobre cada registro.

## Controles obrigatórios

- `empresa_id` derivado do vínculo autenticado, nunca confiado apenas ao frontend.
- RLS explícita por operação.
- Chaves estrangeiras restritas à mesma empresa.
- Auditoria de permissões e ações sensíveis.
- Expiração de convites e sessões administrativas especiais.
- Revisão periódica de usuários e privilégios.
- Testes negativos entre empresas, equipes e perfis.
- Separação entre visualizar cotação, simular impacto e aprovar atualização comercial.
- Aprovação de preços limitada a usuários com alçada expressa e registrada em auditoria.
