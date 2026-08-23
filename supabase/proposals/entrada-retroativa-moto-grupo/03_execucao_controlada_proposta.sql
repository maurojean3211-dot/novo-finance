-- OPERAÇÃO FUTURA. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPLÍCITA.
-- Deve ser chamada em sessão autenticada de Mauro para que auth.uid() seja validado pela RPC.
select public.registrar_entrada_retroativa_grupo_conta_pessoal(
 '8a85591b-2410-405f-8279-910dbcf61011'::uuid,
 '8a85591b-2410-405f-8279-910dbcf61011'::uuid,
 '0fcb172c-524c-4499-b93a-5d8d68203165'::uuid,
 date '2026-04-27',
 '52e20038-b0fc-4465-8727-cb1a48072c37'::uuid
);
