# Especificação do Retalho

O Retalho é uma loja de tecidos fictícia. Ela vende tecido por metro, rolos de comprimento fixo
e aviamentos por unidade. Este documento é a fonte da verdade do sistema: cada comportamento
esperado tem um ID, e os testes, os casos de teste e os bug reports citam esses IDs.

Com todos os defeitos intencionais desligados, o sistema deve seguir esta especificação à risca.
Os defeitos estão descritos na seção [Defeitos intencionais](#12-defeitos-intencionais).

## 1. Convenções

### 1.1 Identificadores

| Prefixo  | Significado                 | Onde é definido           |
| -------- | --------------------------- | ------------------------- |
| `RF-nn`  | Requisito funcional         | Este documento            |
| `RNF-nn` | Requisito não funcional     | Este documento            |
| `BUG-0n` | Defeito intencional (1 a 7) | Este documento (seção 12) |
| `CT-nn`  | Caso de teste               | `qa/02-casos-de-teste.md` |
| `D-nn`   | Decisão tomada sem consulta | `docs/DECISOES.md`        |
| `P-nn`   | Pendência                   | `docs/PENDENCIAS.md`      |

No código, o ponto onde um defeito é injetado é marcado com o comentário `// BUG-n` (sem o zero à
esquerda). Todo requisito tem um **critério de aceite** verificável. O comando `npm run
docs:check` confirma que os IDs são únicos, que todo requisito tem critério de aceite e que
nenhum documento cita um ID inexistente.

### 1.2 Valores, quantidades e arredondamento

- **Dinheiro** é guardado em centavos inteiros e exibido como `R$ 1.234,56`.
- **Quantidades** têm até 2 casas decimais e são exibidas com vírgula (`2,35 m`).
- **Arredondamento:** meio para cima, no centavo (R$ 0,005 vira R$ 0,01). Ele é aplicado em
  três pontos: no preço do rolo, no total de cada item e no valor do desconto. Nenhum outro
  cálculo arredonda.

### 1.3 Glossário

| Termo           | Definição                                                                |
| --------------- | ------------------------------------------------------------------------ |
| Subtotal        | Soma dos totais dos itens do pedido                                      |
| Desconto        | Valor em reais obtido do percentual de desconto global sobre o subtotal  |
| Valor líquido   | Subtotal − desconto                                                      |
| Frete informado | Valor de frete digitado no pedido                                        |
| Frete cobrado   | O frete informado, ou R$ 0,00 quando o pedido tem frete grátis (RF-20)   |
| Total           | Valor líquido + frete cobrado                                            |
| Saldo           | Parte do total ainda não faturada: total − notas emitidas não canceladas |
| Nota            | Nota interna fictícia de faturamento (não é documento fiscal)            |

## 2. Produtos

### RF-01 · Cadastrar produto

Um produto tem código, nome, unidade de venda, preço e, se for rolo, comprimento.

| Campo               | Regra                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| Código              | 3 a 12 caracteres, só letras maiúsculas (A–Z) e dígitos                   |
| Nome                | 2 a 80 caracteres, sem contar espaços nas pontas                          |
| Unidade             | `metro`, `rolo` ou `unidade`                                              |
| Preço               | R$ 0,01 a R$ 99.999,99. Por metro (metro e rolo) ou por unidade (unidade) |
| Comprimento do rolo | Obrigatório só para rolo: de 0,01 a 500 m, até 2 casas decimais           |

Enviar comprimento para um produto que não é rolo é um erro.

**Aceite:** um cadastro válido devolve 201 com o produto criado. Cada campo fora da regra devolve
422 `VALIDATION_ERROR`, com a mensagem do campo (seção 11.2), e nada é gravado.

### RF-02 · Código de produto único

Dois produtos não podem ter o mesmo código, nem no cadastro nem na edição.

**Aceite:** cadastrar ou editar um produto com um código já usado devolve 409
`DUPLICATE_PRODUCT_CODE` e nada é gravado.

### RF-03 · Editar produto

A edição segue as mesmas regras do cadastro. Os itens já lançados em pedidos guardam nome, unidade,
comprimento e preço do momento da inclusão. Editar o produto não altera esses itens.

**Aceite:** alterar o preço de um produto que já está num pedido em rascunho não muda o item
lançado. Um item incluído depois da alteração usa o preço novo.

### RF-04 · Buscar produtos

A busca encontra produtos por trecho do nome ou do código, sem diferenciar maiúsculas,
minúsculas e acentos. Sem termo de busca, a lista mostra todos os produtos em ordem alfabética.
Cada resultado mostra código, nome, unidade e preço com a unidade (`R$ 4,00/m`,
`R$ 20,00 o rolo de 5 m`, `R$ 1,50/un`).

**Aceite:** `linho` encontra "Linho Misto"; `algodao` encontra "Algodão Cru"; `tec10` encontra o
código `TEC1001`. Uma busca sem resultado mostra um estado vazio que repete o termo buscado e
sugere conferir a grafia ou cadastrar o produto.

### RF-05 · Preço do rolo

O preço de um rolo é o comprimento multiplicado pelo preço por metro, arredondado ao centavo.

**Aceite:** rolo de 5 m a R$ 4,00/m custa R$ 20,00. Rolo de 2,5 m a R$ 3,33/m custa R$ 8,33
(R$ 8,325 arredondado para cima).

## 3. Clientes

### RF-06 · Cadastrar cliente

Um cliente é pessoa física (PF) ou jurídica (PJ). Tem nome (2 a 120 caracteres, sem contar
espaços nas pontas), documento e CEP. O documento de PF é o CPF e o de PJ é o CNPJ.

**Aceite:** um cadastro válido devolve 201. Um CPF num cliente PJ, ou um CNPJ num cliente PF,
devolve 422 com a mensagem do campo documento.

### RF-07 · Validar CPF

O CPF tem 11 dígitos e é aceito com ou sem máscara (`000.000.000-00`). Os dois dígitos
verificadores seguem o algoritmo público de módulo 11:

1. Some os 9 primeiros dígitos multiplicados pelos pesos 10 a 2.
2. Calcule o resto da divisão da soma por 11. Se o resto for menor que 2, o dígito é 0; senão, é
   11 − resto.
3. Repita com os 10 primeiros dígitos e os pesos 11 a 2 para obter o segundo dígito.

Sequências de 11 dígitos iguais são rejeitadas, mesmo com dígitos verificadores coerentes. O
CPF é gravado só com dígitos e exibido com máscara.

**Aceite:** um CPF com dígitos verificadores corretos é aceito com e sem máscara. Alterar um dígito
verificador, enviar 11 dígitos iguais ou enviar 10 ou 12 dígitos devolve 422.

### RF-08 · Validar CNPJ

O CNPJ tem 14 caracteres: 12 alfanuméricos (A–Z e 0–9) e 2 dígitos verificadores numéricos. O
formato alfanumérico convive com o numérico, que é o caso em que os 12 primeiros caracteres são
dígitos. O CNPJ é aceito com ou sem máscara (`00.000.000/0000-00`), e letras minúsculas são
convertidas para maiúsculas. O cálculo dos dígitos verificadores:

1. Cada caractere vale o seu código ASCII menos 48. Os dígitos valem de 0 a 9, e `A` vale 17.
2. Some os 12 primeiros valores multiplicados pelos pesos 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2.
3. Se o resto da divisão por 11 for menor que 2, o dígito é 0; senão, é 11 − resto.
4. Repita com os 13 primeiros valores e os pesos 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2.

Exemplo do algoritmo: a base `12ABC34501DE` gera os dígitos `35` (`12.ABC.345/01DE-35`).
Sequências de 14 caracteres iguais são rejeitadas.

**Aceite:** `12.ABC.345/01DE-35` e um CNPJ numérico com dígitos corretos são aceitos. Alterar um
dígito verificador, usar caractere fora de A–Z e 0–9, enviar `00.000.000/0000-00` ou enviar 13 ou
15 caracteres devolve 422.

### RF-09 · Validar CEP

O CEP tem 8 dígitos, com ou sem hífen. Ele é gravado e exibido no formato `00000-000`.

**Aceite:** `12345678` e `12345-678` são aceitos e gravados como `12345-678`. `1234-567`,
`123456789` e `12345-67a` devolvem 422.

### RF-10 · Documento único

Dois clientes não podem ter o mesmo documento. A comparação ignora a máscara.

**Aceite:** cadastrar ou editar um cliente com um documento já usado, com ou sem máscara, devolve
409 `DUPLICATE_DOCUMENT` e nada é gravado.

### RF-11 · Editar e buscar clientes

A edição segue as regras do cadastro (RF-06 a RF-10). A busca encontra clientes por trecho do
nome, sem diferenciar maiúsculas, minúsculas e acentos, ou pelos dígitos do documento.

**Aceite:** `joao` encontra "João"; digitar parte dos dígitos do CPF, sem máscara, encontra o
cliente. Uma busca sem resultado mostra um estado vazio que repete o termo buscado.

## 4. Pedido

### RF-12 · Listar pedidos

A lista mostra número, cliente, estado, total e saldo de cada pedido, do mais recente para o mais
antigo. Pode ser filtrada por estado.

**Aceite:** o filtro "Faturado" mostra só pedidos faturados. Sem pedidos, a lista mostra um estado
vazio que oferece a ação "Novo pedido".

### RF-13 · Criar pedido

Um pedido nasce em **rascunho** para um cliente cadastrado, com número sequencial a partir de 1.
Começa com desconto de 0 %, frete informado de R$ 0,00, pagamento por Pix e 1 parcela.

**Aceite:** criar um pedido devolve 201 em rascunho com esses valores. Informar um cliente
inexistente devolve 422 com a mensagem do campo cliente.

### RF-14 · Incluir item

Um item é um produto cadastrado mais uma quantidade (RF-15). Ao incluir, o item copia nome,
unidade, comprimento e preço do produto (RF-03). Cada produto aparece no máximo uma vez no
pedido.

**Aceite:** incluir um item devolve 201 e recalcula os totais. Incluir um produto que já está no
pedido devolve 409 `DUPLICATE_ITEM`. Incluir um produto inexistente devolve 422.

### RF-15 · Quantidade do item

A quantidade vai de 0,01 a 1.000, com os dois limites incluídos. Para metro, aceita até 2 casas
decimais. Rolo e unidade aceitam só quantidades inteiras.

**Aceite:** a tabela de valores limite abaixo, em que "aceita" devolve 201 (inclusão) ou 200
(edição) e "422" devolve `VALIDATION_ERROR` sem gravar nada.

| Quantidade | Metro         | Rolo ou unidade |
| ---------- | ------------- | --------------- |
| 0          | 422           | 422             |
| 0,01       | aceita        | 422 (inteiro)   |
| 1          | aceita        | aceita          |
| 2          | aceita        | aceita          |
| 1,25       | aceita        | 422 (inteiro)   |
| 1,255      | 422 (3 casas) | 422             |
| 1.000      | aceita        | aceita          |
| 1.000,01   | 422           | 422             |
| 1.001      | 422           | 422             |

### RF-16 · Preço unitário e total do item

O preço unitário depende da unidade:

- **metro:** o preço por metro;
- **rolo:** o preço do rolo (RF-05);
- **unidade:** o preço por unidade.

O total do item é a quantidade vezes o preço unitário, arredondado ao centavo.

**Aceite:** 2,35 m a R$ 12,99/m somam R$ 30,53 (R$ 30,5265 arredondado). 4 rolos de 5 m a
R$ 4,00/m mostram unitário de R$ 20,00 e total de R$ 80,00. 1 rolo do mesmo produto mostra
unitário e total de R$ 20,00. 3 unidades a R$ 1,50 somam R$ 4,50.

### RF-17 · Editar quantidade e remover item

Em rascunho, a quantidade de um item pode ser alterada (RF-15) e o item pode ser removido. Toda
alteração recalcula o pedido inteiro, com desconto, frete e parcelas (RF-18 a RF-23).

**Aceite:** um pedido com desconto de 10 %, cliente com CEP na área local e pagamento por Pix tem
um item de 50 m a R$ 50,00/m (total de R$ 2.250,00, com frete grátis). Alterar a quantidade para
100 m deixa o total em R$ 4.500,00. Remover o item deixa o subtotal e o total em R$ 0,00 mais o
frete cobrado.

### RF-18 · Desconto global

O desconto é um percentual de 0 a 100, com os dois limites incluídos e até 2 casas decimais. O
valor do desconto é o subtotal vezes o percentual, arredondado ao centavo. O valor líquido é o
subtotal menos o desconto.

**Aceite:** −1 e 101 devolvem 422; 12,345 devolve 422 (3 casas). 0 não desconta nada. 100 deixa o
valor líquido em R$ 0,00. 12,5 é aceito. Um subtotal de R$ 10,05 com 10 % tem desconto de
R$ 1,01 (R$ 1,005 arredondado) e valor líquido de R$ 9,04.

### RF-19 · Frete informado

O frete informado vai de R$ 0,00 a R$ 9.999,99, com os dois limites incluídos.

**Aceite:** R$ 0,00 e R$ 9.999,99 são aceitos. −R$ 0,01 e R$ 10.000,00 devolvem 422.

### RF-20 · Frete grátis

O frete cobrado é R$ 0,00 quando as três condições abaixo são verdadeiras ao mesmo tempo. Nos
demais casos, o frete cobrado é igual ao frete informado.

| Condição | Descrição                                                               |
| -------- | ----------------------------------------------------------------------- |
| C1       | Valor líquido (subtotal − desconto) de pelo menos R$ 300,00             |
| C2       | Forma de pagamento Pix                                                  |
| C3       | CEP do cliente na área de entrega própria: de `01000-000` a `09999-999` |

Tabela de decisão completa (S = sim, N = não):

| Regra             | R1  | R2  | R3  | R4  | R5  | R6  | R7  | R8  |
| ----------------- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 líquido ≥ 300  | S   | S   | S   | S   | N   | N   | N   | N   |
| C2 Pix            | S   | S   | N   | N   | S   | S   | N   | N   |
| C3 CEP local      | S   | N   | S   | N   | S   | N   | S   | N   |
| **Frete grátis**  | X   |     |     |     |     |     |     |     |
| **Frete cobrado** |     | X   | X   | X   | X   | X   | X   | X   |

Na forma reduzida, basta uma condição falsa para o frete ser cobrado: R1 (todas verdadeiras),
C1 falsa (R5 a R8), C2 falsa (R3 e R4) e C3 falsa (R2).

**Aceite:** com Pix e CEP `01000-000`, um valor líquido de R$ 300,00 tem frete grátis e um de
R$ 299,99 paga o frete informado. Com valor líquido de R$ 300,00 e Pix, os CEPs `01000-000` e
`09999-999` têm frete grátis, e os CEPs `00999-999` e `10000-000` pagam o frete. Com valor
líquido de R$ 300,00 e CEP local, boleto e cartão pagam o frete. A tela do pedido mostra "Frete
grátis" quando a regra se aplica.

### RF-21 · Total do pedido

O total é o valor líquido mais o frete cobrado. Isso equivale a `soma dos itens × (1 − desconto)

- frete`, com os arredondamentos da seção 1.2.

**Aceite:** subtotal de R$ 5.000,00, desconto de 10 %, frete informado de R$ 50,00 e CEP local:
com Pix o total é R$ 4.500,00 (frete grátis); com boleto, R$ 4.550,00.

### RF-22 · Forma de pagamento e número de parcelas

A forma de pagamento é Pix, boleto ou cartão. O número de parcelas é um inteiro de 1 a 3,
para qualquer forma de pagamento.

**Aceite:** 1 e 3 parcelas são aceitas. 0, 4 e 1,5 devolvem 422. Uma forma de pagamento fora da
lista devolve 422.

### RF-23 · Valor das parcelas

As parcelas somam exatamente o total. Cada parcela, exceto a última, vale o total dividido pelo
número de parcelas, truncado no centavo. A última parcela absorve a diferença de centavos.

**Aceite:**

| Total       | Parcelas | Valores                        |
| ----------- | -------- | ------------------------------ |
| R$ 100,00   | 1        | R$ 100,00                      |
| R$ 100,00   | 2        | R$ 50,00 + R$ 50,00            |
| R$ 100,00   | 3        | R$ 33,33 + R$ 33,33 + R$ 33,34 |
| R$ 10,00    | 3        | R$ 3,33 + R$ 3,33 + R$ 3,34    |
| R$ 0,10     | 3        | R$ 0,03 + R$ 0,03 + R$ 0,04    |
| R$ 4.500,00 | 3        | R$ 1.500,00 nas três parcelas  |

### RF-24 · Valores congelados na finalização

Em rascunho, o pedido é recalculado a cada alteração (itens, desconto, frete, pagamento,
parcelas ou cliente). Ao finalizar, total, frete cobrado e parcelas ficam fixos. Alterações
posteriores no produto ou no cliente não mudam o pedido.

**Aceite:** finalizar um pedido com frete grátis e depois mudar o CEP do cliente para fora da área
local não muda o frete cobrado nem o total do pedido.
