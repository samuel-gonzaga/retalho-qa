# Plano de teste do Retalho

| Item          | Valor                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| Sistema       | Retalho, loja de tecidos fictícia (Next.js, API REST, SQLite)           |
| Base de teste | `docs/SPEC.md`: 40 requisitos funcionais (RF) e 11 não funcionais (RNF) |
| Versão        | Branch `main` do repositório `retalho-qa`                               |
| Artefatos     | `qa/02` a `qa/06` desta pasta                                           |

## 1. Objetivo

Verificar que o Retalho cumpre a especificação com todos os defeitos intencionais desligados, e
demonstrar que a suíte encontra cada um dos 7 defeitos quando ele está ligado. Cada defeito precisa
ser detectado por pelo menos um caso de teste projetado com técnica formal, por um teste
automatizado e por exploração da interface.

## 2. Escopo

### 2.1 Dentro do escopo

| Área        | Requisitos      | O que se verifica                                                                     |
| ----------- | --------------- | ------------------------------------------------------------------------------------- |
| Produtos    | RF-01 a RF-05   | Cadastro, código único, edição sem afetar pedidos, busca, preço do rolo               |
| Clientes    | RF-06 a RF-11   | PF e PJ, CPF, CNPJ numérico e alfanumérico, CEP, documento único, busca               |
| Pedido      | RF-12 a RF-24   | Itens, quantidade, desconto, frete grátis, total, parcelas, congelamento              |
| Estados     | RF-25 a RF-31   | Transições válidas e inválidas, idempotência, histórico, ordem dos erros              |
| Faturamento | RF-32 a RF-35   | Nota total e parcial, saldo, cancelamento de nota, lista de notas                     |
| Painel      | RF-36 a RF-39   | Vendido, faturado, a faturar, igualdade entre eles e cache                            |
| Interface   | RF-40           | Ausência de atalhos que conflitam com o navegador                                     |
| Qualidade   | RNF-01 a RNF-11 | Mecanismo de defeitos, dados fictícios, acessibilidade, responsividade, formatos, API |

### 2.2 Fora do escopo

- Desempenho e carga: o sistema é de uso individual, com SQLite local.
- Segurança, autenticação e permissões: não há login (restrição do projeto).
- Navegadores além do Chromium: os testes E2E usam Chromium em desktop e em emulação de celular.
- Documento fiscal real: a nota é interna e fictícia.

## 3. Estratégia

### 3.1 Níveis de teste

| Nível        | Ferramenta              | Onde         | Foco                                                               |
| ------------ | ----------------------- | ------------ | ------------------------------------------------------------------ |
| Unitário     | Vitest                  | `tests/unit` | Funções puras do domínio: cálculos, validações, máquina de estados |
| API          | Vitest + rotas do Next  | `tests/api`  | Status HTTP, corpo, regras de estado, persistência                 |
| E2E          | Playwright              | `tests/e2e`  | Fluxos pela interface, em desktop e celular (360 px)               |
| Exploratório | Charters com tempo fixo | `qa/05`      | O que os roteiros não preveem: combinações, abas, cache, textos    |

### 3.2 Técnicas de projeto

| Técnica                  | Onde é aplicada                                                               |
| ------------------------ | ----------------------------------------------------------------------------- |
| Partição de equivalência | Unidade de venda × tipo de quantidade, tipo de cliente × documento, pagamento |
| Análise de valor limite  | Quantidade, desconto, frete, parcelas, motivo, valor da nota, faixa de CEP    |
| Tabela de decisão        | Frete grátis (3 condições, 8 regras)                                          |
| Transição de estados     | Ciclo de vida do pedido, incluindo transições inválidas e repetições          |

### 3.3 Matriz de defeitos

O comando `npm run test:defeitos` roda as suítes unitária e de API uma vez sem defeitos e uma vez
com cada defeito ligado. Os testes que detectam um defeito levam `[BUG-0n]` no título. A matriz
exige que, com o defeito `n` ligado, algum teste etiquetado falhe e nenhum teste sem etiqueta falhe.
Isso prova a detecção e mantém a rastreabilidade teste → defeito.

### 3.4 Dados de teste

- Massa fictícia gerada por `npm run seed`, com semente fixa (RNF-03): 18 produtos, 15 clientes,
  12 pedidos nos 5 estados e 8 notas.
- CPFs e CNPJs gerados pelo algoritmo de dígitos verificadores. Nos testes, documentos-base com
  dígitos de π, e e φ, como `314.159.265-90` e `12.ABC.345/01DE-35`.
- Testes de API usam banco em memória novo a cada teste; os E2E usam um banco próprio recriado pelo
  seed.

## 4. Ambiente

| Componente | Versão ou valor                                                  |
| ---------- | ---------------------------------------------------------------- |
| Sistema    | Windows 10 (local) e Ubuntu (GitHub Actions)                     |
| Node.js    | 24 (local); 22 ou mais novo exigido                              |
| Navegador  | Chromium do Playwright 1.64                                      |
| Aplicação  | `next build` + `next start` para E2E; `next dev` para exploração |
| Banco      | SQLite em `RETALHO_DB_PATH`                                      |
| Defeitos   | `RETALHO_BUGS=n` ao iniciar, ou `/qa/defeitos` e `/api/qa/bugs`  |

## 5. Critérios

### 5.1 Entrada

- Build de produção e lint sem erros.
- Massa de dados recriada pelo seed, inclusive depois de cada sessão com defeito ligado: desligar
  um defeito não conserta os dados que ele já gravou (achado A-05 do charter C-02).
- Todos os defeitos desligados para a execução de regressão.

### 5.2 Saída

- Com todos os defeitos desligados: 100 % dos testes unitários, de API e E2E passam.
- Matriz de defeitos: os 7 defeitos detectados, sem nenhuma falha fora das etiquetas.
- Matriz de rastreabilidade: 100 % dos requisitos ligados a pelo menos um caso de teste.
- `npm run docs:check` sem nenhum ID inexistente.

### 5.3 Suspensão

A execução é suspensa se o build falhar, se o seed não gerar a massa esperada ou se mais de um
defeito estiver ligado sem intenção (conferir em `/qa/defeitos`).

## 6. Riscos

| Risco                                                                   | Probabilidade | Impacto | Mitigação                                                              |
| ----------------------------------------------------------------------- | ------------- | ------- | ---------------------------------------------------------------------- |
| Arredondamento de centavos diverge entre cálculo e exibição             | Média         | Alto    | Dinheiro em centavos inteiros; casos de valor limite com 0,005         |
| Defeito mascarado por dados "bonitos" (quantidade 1, totais divisíveis) | Alta          | Alto    | Valor limite nas duas bordas (1 e 2; total divisível e não divisível)  |
| Estado alterado por tela desatualizada (duas abas, duplo clique)        | Média         | Alto    | Casos de transição inválida e de idempotência; charter de concorrência |
| Cache do painel diverge da lista de notas                               | Média         | Médio   | Oráculo de comparação entre painel e lista depois de cada nota         |
| Teste que passa por testar a si mesmo                                   | Baixa         | Alto    | Valores esperados calculados à mão na especificação, não pelo código   |
| Defeito ligado sem querer contamina uma execução                        | Média         | Médio   | Testes que zeram os defeitos; área de QA mostra a origem de cada um    |

## 7. Entregáveis

| Artefato                          | Conteúdo                                                     |
| --------------------------------- | ------------------------------------------------------------ |
| `02-casos-de-teste.md`            | Casos por técnica, com 4 tabelas formais                     |
| `03-bug-reports/`                 | Um relatório por defeito, com evidência                      |
| `04-matriz-de-rastreabilidade.md` | Requisito → caso → teste automatizado → defeito              |
| `05-charters-exploratorios.md`    | 3 charters com as sessões registradas                        |
| `06-relatorio-de-execucao.md`     | Resultado real das suítes, da matriz de defeitos e cobertura |
