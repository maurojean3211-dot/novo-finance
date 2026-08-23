# Hardening de privilégios — contas_pagar_pessoais

Status: **proposta local revisada; hardening remoto ainda não executado**.

## Objetivo autorizado

Remover exclusivamente de `authenticated` os privilégios `TRUNCATE`, `REFERENCES`, `TRIGGER` e `MAINTAIN` sobre
`public.contas_pagar_pessoais`, preservando `SELECT`, `INSERT`, `UPDATE` e `DELETE`. Não alterar RLS,
policies, dados, RPCs, constraints, índices, `service_role`, `postgres` ou outras tabelas.

## Baseline remoto readonly — 16/08/2026

- 43 registros; 21 `Pago`; 22 `Pendente`; total R$ 41.574,73.
- fingerprint dos dados: `66e1af3fb3bd3acdd7482f0b8f1335f8`.
- RLS habilitada; quatro policies proprietárias preservadas.
- fingerprint das policies: `1a4a637e8a62c5d9c6de391deffdb43d`.
- fingerprint das constraints: `feb963cf66a3fdf8c703cf0b3c188679`.
- fingerprint dos índices: `4849d3d3ae3570eb137eb85dc1d5fe58`.
- fingerprint das sete RPCs relacionadas, após a integração Eventos → Despesas: `c63955ec4c28032ec34283369cce06f5`.
- ACL atual: `postgres=arwdDxtm`, `authenticated=arwdDxtm`, `service_role=arwdDxtm`.
- `anon` e `PUBLIC`: sem privilégios na tabela.

## Guard fail-closed revisado

O remoto concede `TRUNCATE`, `REFERENCES`, `TRIGGER` e `MAINTAIN` (`Dxtm`) a `authenticated`.
A autorização atual inclui explicitamente os quatro excessos. O preflight exige CRUD + os quatro
excessos antes da escrita; a validação exige exatamente CRUD depois dela. Qualquer ACL diferente aborta.

A integração Eventos → Despesas atualizou RPCs relacionadas. O fingerprint antigo não é aceito: os
guards agora usam as sete assinaturas atuais, incluindo `materializar_despesa_evento_entrada_pessoal`.

## Ordem futura, após resolver o bloqueio

1. executar `01_preflight_readonly.sql`;
2. confirmar todos os guards em `true`;
3. executar `02_hardening_privilegios_proposta.sql` em janela controlada;
4. executar imediatamente `03_validacao_readonly.sql`;
5. usar `04_rollback_proposto.sql` somente com autorização específica e após novo preflight.

O rollback restaura exclusivamente os quatro privilégios autorizados. Não toca em dados,
RLS, policies, RPCs, constraints, índices, `service_role` ou `postgres`.
