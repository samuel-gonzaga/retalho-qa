# Charters exploratórios

Três sessões de teste exploratório com tempo fixo, no formato de _session-based testing_:
missão, áreas, heurísticas e o registro da sessão (achados, perguntas e tempo).

**Como as sessões foram conduzidas.** As três sessões foram executadas em 04/11/2026 pelo agente
que construiu o projeto, sobre o build de produção (`next start`) com a massa do seed num banco
separado. As ações foram feitas com o navegador automatizado (Playwright) e com chamadas diretas
à API, que registram horário e resultado de cada passo. Os horários abaixo são os registrados
pelas sondas. O autor pode repetir cada sessão manualmente seguindo o charter.

## C-01 · Cálculos do pedido fora do caminho feliz

| Campo       | Valor                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Missão      | Explorar itens, quantidades, desconto, frete e parcelas com dados que fogem do caminho feliz, para descobrir valores errados ou escondidos por dados "redondos"    |
| Tempo       | Caixa de 30 min                                                                                                                                                    |
| Áreas       | Pedido (itens, condições, totais), Produtos (rolos)                                                                                                                |
| Requisitos  | RF-15 a RF-23, RF-32, RNF-10                                                                                                                                       |
| Heurísticas | Zero, um, muitos · valor limite nas duas bordas · "dados redondos escondem erros" · hábitos do usuário brasileiro ao digitar números · editar depois de configurar |
| Defeitos    | Nenhum na primeira parte; depois 2, 4 e 1, um por vez                                                                                                              |

### Sessão registrada

| Item                | Valor                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| Execução das sondas | 11:55:07 às 11:55:09 (horário de Brasília)                                   |
| Tempo               | Dentro da caixa de 30 min; o resto do tempo foi projeto das sondas e análise |
| Cobertura           | 1 pedido pela tela; 6 pedidos pela API; 2 produtos da massa                  |

| ID     | Tipo        | O que foi observado                                                                                                                                                                                                                                              |
| ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01   | Pergunta    | Digitar `1.000` (mil, no hábito brasileiro) na quantidade em metros gravou **1 m**. É o comportamento da RNF-10 (ponto vale como vírgula, sem separador de milhar), mas o usuário pode querer dizer mil                                                          |
| A-02   | Lacuna      | Pedido de total R$ 0,00 (desconto de 100 %, sem frete) finalizado: uma nota de R$ 0,01 devolve "passa do saldo a faturar (R$ 0,00). Informe até R$ 0,00." A mensagem pede um valor que a própria regra recusa (RF-32 exige valor maior que zero). Reforça a P-04 |
| A-03   | Pergunta    | Desconto de 100 % com frete de R$ 15,00: o valor líquido é zero, o frete grátis não se aplica e o total é R$ 15,00. Segue a RF-20, mas vale confirmar se o cliente deve pagar frete de um pedido 100 % descontado                                                |
| —      | Confirmação | Quantidade 2,345 m mostra "Use no máximo 2 casas decimais." junto do campo                                                                                                                                                                                       |
| BUG-02 | Defeito     | Com o defeito 2: Manta Acrílica (rolo de 10 m a R$ 6,50/m) tem unitário R$ 65,00 com 1 rolo e **R$ 32,50** com 2 rolos (total R$ 65,00). Com 1 rolo, nada a ver                                                                                                  |
| BUG-04 | Defeito     | Com o defeito 4: R$ 49,90 em 3 parcelas vira 16,63 + 16,63 + 16,63 = **R$ 49,89**                                                                                                                                                                                |
| BUG-01 | Defeito     | Com o defeito 1: 10 % de desconto e quantidade de 10 m para 20 m: desconto R$ 0,00 e total **R$ 998,00** (esperado R$ 898,20)                                                                                                                                    |

**Perguntas para o produto:** `1.000` deveria ser recusado por ambíguo? O pedido de total zero
deveria ir direto para Faturado? Desconto de 100 % deveria zerar também o frete?

## C-02 · Faturamento e painel ao longo do ciclo de vida

| Campo       | Valor                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missão      | Explorar emissão, cancelamento e nova emissão de notas, comparando pedido, lista de notas e painel, para descobrir saldos e totais que não fecham |
| Tempo       | Caixa de 30 min                                                                                                                                   |
| Áreas       | Faturamento, Pedido (seção Faturamento), Painel                                                                                                   |
| Requisitos  | RF-32 a RF-39                                                                                                                                     |
| Heurísticas | Oráculo de comparação entre telas · caminho de volta (desfazer o que foi feito) · interromper e retomar (seed, reinício) · ordem das ações        |
| Defeitos    | Nenhum no início; depois 5 e 6, um por vez                                                                                                        |

### Sessão registrada

| Item                | Valor                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Execução das sondas | 11:55:22 às 11:55:25; segunda tentativa do BUG-06 às 11:56:01; conferência da correção às 11:59:07 |
| Tempo               | Dentro da caixa de 30 min                                                                          |
| Cobertura           | 4 pedidos novos, 6 notas, 2 leituras do painel pela tela, 1 seed com o servidor aberto             |

| ID     | Tipo                    | O que foi observado                                                                                                                                                                                                                                                                                                                      |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —      | Confirmação             | Duas notas emitidas e as duas canceladas: o pedido volta a Finalizado com saldo R$ 500,00, e depois pode ser cancelado (T9, T3)                                                                                                                                                                                                          |
| A-04   | Defeito real, corrigido | Com os defeitos desligados, rodar o seed em outro processo com o servidor aberto deixou o painel em R$ 3.010,57 enquanto a lista mostrava R$ 2.010,57. O cache não percebia gravações de outro processo. Corrigido no commit `0c1d6c6` com teste de regressão; às 11:59:07 o painel acompanhou o seed (R$ 2.010,57 nos dois)             |
| A-05   | Observação              | A igualdade vendido = faturado + a faturar estava quebrada em R$ 550,00, não só nos R$ 500,00 da sessão. A diferença inclui pedidos gravados pelas evidências com defeitos ligados (+R$ 200,00 do BUG-05 e −R$ 150,00 do BUG-03). **Desligar um defeito não conserta os dados que ele já gravou**                                        |
| BUG-05 | Defeito                 | Com o defeito 5: nota total de R$ 500,00 cancelada; o pedido continua Faturado com saldo R$ 0,00                                                                                                                                                                                                                                         |
| BUG-06 | Defeito                 | Primeira tentativa **não reproduziu**: o painel foi de R$ 2.510,57 para R$ 3.010,57, igual à lista. No meio das sondas, finalizei um pedido, e a finalização limpa o cache (mascaramento previsto na SPEC). Na segunda tentativa, com a nota emitida num pedido já finalizado, o painel ficou em R$ 2.017,47 e a lista foi a R$ 2.027,47 |

**Perguntas para o produto:** depois de uma sessão com defeito ligado, a massa deve ser sempre
recriada? (Proposta adotada no plano de teste: sim.) O painel deveria mostrar a hora do último
cálculo, para quem compara telas?

## C-03 · Alterações concorrentes e repetidas

| Campo       | Valor                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missão      | Explorar duas abas, cliques repetidos e reenvio de requisições no pedido, para descobrir alterações aceitas fora do estado permitido ou efeitos duplicados |
| Tempo       | Caixa de 30 min                                                                                                                                            |
| Áreas       | Pedido (condições, finalizar, cancelar)                                                                                                                    |
| Requisitos  | RF-26 a RF-29, RF-31, RF-40                                                                                                                                |
| Heurísticas | Tela desatualizada (duas abas) · rajada e duplo clique · repetir a mesma requisição (idempotência) · convenções da plataforma (atalhos de teclado)         |
| Defeitos    | Nenhum no início; depois 3 e 7, um por vez                                                                                                                 |

### Sessão registrada

| Item                | Valor                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Execução das sondas | 11:55:26 às 11:55:31                                                                           |
| Tempo               | Dentro da caixa de 30 min                                                                      |
| Cobertura           | 5 pedidos; 1 aba desatualizada; 3 finalizações simultâneas; 2 cancelamentos e 2 PUTs repetidos |

| ID     | Tipo        | O que foi observado                                                                                                                                                        |
| ------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —      | Confirmação | Aba desatualizada salvando num pedido finalizado: "O pedido está finalizado e não aceita alterações. Só pedidos em rascunho podem ser alterados." Nada é gravado           |
| A-06   | Sugestão    | Depois desse aviso, o formulário continua editável e com o valor digitado (20 %). Não há oferta de recarregar o pedido; o usuário pode tentar de novo sem entender por quê |
| —      | Confirmação | Três finalizações simultâneas: 200, 200 e 200, com um único registro no histórico (RF-28)                                                                                  |
| —      | Confirmação | Cancelar duas vezes: 200 e 200, com o motivo original mantido (RF-29)                                                                                                      |
| —      | Confirmação | PUT repetido com o mesmo corpo: mesmo total (R$ 16,45) nas duas respostas                                                                                                  |
| BUG-03 | Defeito     | Com o defeito 3: a aba desatualizada gravou desconto de 50 % num pedido faturado; total R$ 3,45 contra R$ 6,90 faturados                                                   |
| BUG-07 | Defeito     | Com o defeito 7: o botão diz "Salvar (Ctrl+S)" e declara `aria-keyshortcuts="Control+S"`                                                                                   |

**Pergunta para o produto:** depois de um 409 por estado, a tela deveria recarregar o pedido
sozinha ou oferecer um botão para isso?

## Resumo das sessões

| Sessão | Defeitos encontrados   | Achados fora dos 7 defeitos | Perguntas |
| ------ | ---------------------- | --------------------------- | --------- |
| C-01   | BUG-01, BUG-02, BUG-04 | A-01, A-02, A-03            | 3         |
| C-02   | BUG-05, BUG-06         | A-04 (corrigido), A-05      | 2         |
| C-03   | BUG-03, BUG-07         | A-06                        | 1         |

Os achados que pedem decisão de produto ficaram em `docs/PENDENCIAS.md` (P-04 a P-06).
