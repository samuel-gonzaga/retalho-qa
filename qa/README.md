# Artefatos de QA

| Artefato                                                             | Conteúdo                                                                | Como é mantido                       |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| [`01-plano-de-teste.md`](01-plano-de-teste.md)                       | Escopo, estratégia, ambiente, critérios de entrada e saída, riscos      | Escrito à mão                        |
| [`02-casos-de-teste.md`](02-casos-de-teste.md)                       | 73 casos e 4 tabelas formais: partição, valor limite, decisão e estados | Escrito à mão                        |
| [`03-bug-reports/`](03-bug-reports/README.md)                        | Um relatório por defeito (BUG-01 a BUG-07), com evidência               | Evidências por `scripts/evidence.ts` |
| [`04-matriz-de-rastreabilidade.md`](04-matriz-de-rastreabilidade.md) | Requisito → caso → teste automatizado → defeito                         | `npm run qa:rastreabilidade`         |
| [`05-charters-exploratorios.md`](05-charters-exploratorios.md)       | 3 charters com as sessões registradas: achados, perguntas e tempo       | Escrito à mão, a partir das sessões  |
| [`06-relatorio-de-execucao.md`](06-relatorio-de-execucao.md)         | Resultado real das suítes, da matriz de defeitos e da cobertura         | `npm run qa:relatorio`               |

Os documentos gerados por script não devem ser editados à mão: rode o comando de novo depois de
mudar a especificação, os casos ou os testes. O `npm run docs:check` confere que nenhum documento
cita um ID inexistente e que a matriz cobre todos os requisitos.
