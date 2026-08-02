# Roadmap de Reconstrução

## 0 — Preservação e auditoria

- **Objetivo:** conhecer e preservar o sistema atual.
- **Entregas:** documentação, inventário, auditoria remota somente leitura, mapa de dados e plano de migração.
- **Dependências:** acesso autorizado ao repositório e, depois, ao ambiente remoto.
- **Riscos:** inferir o banco pelo frontend ou perder regras implícitas.
- **Conclusão:** arquitetura aprovada, esquema inventariado e reversão definida.

## 1 — Fundação SaaS

- **Objetivo:** estabelecer isolamento, identidade e autorização.
- **Entregas:** empresas, vínculos, papéis, permissões, empresa ativa, RLS, políticas versionadas, planos e módulos habilitados.
- **Dependências:** Fase 0.
- **Riscos:** vazamento entre empresas e migração incorreta.
- **Conclusão:** testes de isolamento aprovados e consultas sempre limitadas por empresa.

## 2 — Arquitetura frontend

- **Objetivo:** criar base modular e testável.
- **Entregas:** React, TypeScript, React Router, layouts, serviços, repositórios, schemas, testes e base visual corporativa, premium, responsiva e sem rolagens desnecessárias.
- **Dependências:** contratos da Fase 1.
- **Riscos:** regressão visual e duplicação temporária de regras.
- **Conclusão:** autenticação, navegação e um fluxo vertical na nova arquitetura.

## 3 — Catálogo Inteligente

- **Objetivo:** criar o núcleo técnico de produtos.
- **Entregas:** produtos, categorias, especificações, unidades, pesos, modalidades configuráveis por produto e empresa, preços, sinônimos, pesquisa e contratos para regras futuras baseadas em indicadores de mercado.
- **Dependências:** Fases 1 e 2.
- **Riscos:** variações técnicas não representadas e conversões imprecisas.
- **Conclusão:** perfis, tarugos, silício e insumos cadastráveis e pesquisáveis.

## 4 — CRM

- **Objetivo:** centralizar relacionamento e oportunidades.
- **Entregas:** clientes, fornecedores, leads, contatos, oportunidades, atividades, responsáveis, equipes, regiões, deduplicação, qualificação, histórico, opt-out e motivos de perda.
- **Dependências:** Fases 1 e 2.
- **Riscos:** duplicidade e acesso indevido entre vendedores.
- **Conclusão:** funil rastreável conforme permissões.

## 5 — Estoque

- **Objetivo:** controlar disponibilidade, reservas e previsões.
- **Entregas:** locais, saldos, lotes, movimentações, reservas, ajustes e inventário.
- **Dependências:** Catálogo.
- **Riscos:** concorrência, saldo negativo e confusão entre físico e futuro.
- **Conclusão:** saldo reproduzível e reservas testadas.

## 6 — Compras

- **Objetivo:** controlar aquisição e recebimento.
- **Entregas:** solicitações, cotações, pedidos, recebimentos, custos, fretes e integração financeira.
- **Dependências:** fornecedores, catálogo e estoque.
- **Riscos:** recebimentos parciais e duplicidade.
- **Conclusão:** compra rastreável até estoque e contas a pagar.

## 7 — Orçamento Inteligente

- **Objetivo:** transformar solicitações em propostas revisáveis.
- **Entregas:** entrada por PDF, planilha, imagem, lista ou cotação; correspondência exata, semelhante ou ausente; estoque; cálculos; versões; aprovação; PDF e conversão em pedido ou venda.
- **Dependências:** catálogo, CRM e estoque.
- **Riscos:** correspondência ou cálculo incorreto e perda de histórico.
- **Conclusão:** orçamento versionado, revisado e reproduzível.

## 8 — Vendas

- **Objetivo:** converter propostas em pedidos.
- **Entregas:** pedidos, reservas, separação, encomendas, comissões e integração financeira.
- **Dependências:** orçamento, estoque e CRM.
- **Riscos:** reserva duplicada e pedido parcialmente atendido.
- **Conclusão:** fluxo completo até estoque e contas a receber.

## 9 — Financeiro

- **Objetivo:** consolidar obrigações, recebimentos e caixa.
- **Entregas:** contas a pagar e receber, parcelas, caixa, categorias, conciliação, inadimplência e Financeiro Pessoal opcional e segregado.
- **Dependências:** compras e vendas.
- **Riscos:** valores inconsistentes e baixa duplicada.
- **Conclusão:** totais conciliáveis e lançamentos auditáveis.

## 10 — Processamento documental

- **Objetivo:** importar catálogos e pedidos.
- **Entregas:** Central de Importações para PDF, Excel, CSV, imagens, catálogos e listas; OCR, extração, normalização, correspondência, revisão e aprovação conforme a finalidade escolhida.
- **Dependências:** catálogo e armazenamento seguro.
- **Riscos:** OCR incorreto, arquivos maliciosos, vazamento e custo.
- **Conclusão:** origem, confiança e aprovação registradas.

## 11 — Painel Executivo

- **Objetivo:** apoiar decisões por empresa.
- **Entregas:** faturamento por vendedor, metas, conversão, ticket médio, margem, comissões, clientes novos e inativos, produtos mais vendidos, vendas por região e período, propostas pendentes e perdidas, motivos de perda, PDF, planilha, filtros e Indicadores de Mercado com dólar, LME, variações, fonte, atualização e histórico.
- **Dependências:** CRM, orçamento, vendas e financeiro.
- **Riscos:** métricas divergentes ou exposição indevida.
- **Conclusão:** indicadores reconciliados, fontes de cotação rastreáveis, histórico preservado e exportações validadas.

### Marco complementar — Governança de preços

- **Objetivo:** permitir simulação segura de impacto das cotações nos preços e margens.
- **Entregas:** fontes configuráveis, regras por empresa, atualização manual e futura automática, alertas, simulação, aprovação e histórico.
- **Dependências:** Catálogo Inteligente, permissões, auditoria e Indicadores de Mercado.
- **Riscos:** fonte indisponível, cotação incorreta e atualização comercial sem autorização.
- **Conclusão:** nenhuma tabela comercial é alterada sem aprovação humana e cada orçamento preserva a cotação utilizada.

## 12 — IA Comercial

- **Objetivo:** apoiar identificação e preparação comercial com supervisão.
- **Entregas:** consulta ao catálogo, painel assistido de pendências, sugestões explicáveis, resumos, alertas, próximos passos e preparação de comunicações com envio controlado.
- **Dependências:** catálogo, CRM e documentos.
- **Riscos:** alucinação, exposição de dados, custo e ações sem autorização.
- **Conclusão:** fontes rastreáveis, aprovação humana obrigatória e nenhuma alteração de estoque, produto, orçamento, venda ou envio autônomo.

## 13 — Master Admin e operação SaaS

- **Objetivo:** administrar a plataforma preservando a privacidade empresarial.
- **Entregas:** empresas, planos, limites, consumo, bloqueios, saúde e suporte auditado.
- **Dependências:** Fundação SaaS e observabilidade.
- **Riscos:** privilégios excessivos e acesso comercial indevido.
- **Conclusão:** controles segregados, testados e auditáveis.
