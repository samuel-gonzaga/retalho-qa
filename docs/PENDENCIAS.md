# Pendências

Itens que ficaram incompletos ou dependem de ação fora do código. Cada item informa a fase, o
impacto, o que falta e a situação atual.

## Abertas

| ID   | Fase | Pendência                                                                                                                                                                                                                                             | Impacto                                                        | Ação sugerida                                                                                                |
| ---- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| P-04 | 2    | Lacuna da especificação: um pedido finalizado com total de R$ 0,00 nunca pode ser faturado, porque a nota exige valor maior que zero (RF-32). A sessão C-01 (achado A-02) mostrou que a mensagem ainda pede "Informe até R$ 0,00", um valor recusado. | Caso raro; não é um dos defeitos intencionais.                 | Decisão de produto: levar o pedido de total zero direto a Faturado, ou impedir a finalização com total zero. |
| P-05 | 4    | Pergunta de produto (achado A-01): digitar `1.000` na quantidade grava 1 m, porque o ponto vale como vírgula (RNF-10). O usuário pode querer dizer mil.                                                                                               | Risco de pedido com quantidade errada por hábito de digitação. | Decidir se `1.000` deve ser recusado por ambíguo, com mensagem própria.                                      |
| P-06 | 4    | Sugestão de usabilidade (achado A-06): depois de um 409 por estado, o formulário de condições continua editável e não oferece recarregar o pedido.                                                                                                    | O usuário tenta de novo sem entender que o pedido mudou.       | Oferecer "Recarregar o pedido" junto do aviso.                                                               |

## Resolvidas

| ID   | Fase | Pendência                                                                           | Resolução                                                                                                                                                                   |
| ---- | ---- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | 0    | `git config user.name` não estava definido; os commits saíam com o autor `unknown`. | O autor configurou o nome em 2026-11-03. Os commits já publicados da Fase 0 mantêm o autor `unknown`, porque reescrever histórico publicado é proibido pelas regras de Git. |
| P-02 | 0    | `npm run seed` só exibia uma mensagem.                                              | Resolvida na Fase 2: o seed gera 18 produtos, 15 clientes, 12 pedidos em todos os estados e 8 notas, sempre iguais (RNF-03).                                                |
| P-03 | 1    | `PUT /api/qa/bugs` devolvia 422 para corpo que não é JSON.                          | Resolvida na Fase 2: a rota usa o tratamento de erro comum e devolve 400 `INVALID_JSON` (RNF-11).                                                                           |
