# Direção de design do Retalho

Este plano vem antes do código das telas. Ele define o conceito, os tokens, os componentes e a
revisão contra a especificação. A seção final, de autocrítica, é preenchida depois das capturas
de tela.

## 1. Ideia central

O Retalho é um livro de pedidos de uma loja de tecidos. A interface deve parecer uma ferramenta
de balcão bem cuidada: legível, densa sem ser apertada, com números alinhados e nada que distraia
de quantidades, preços e estados.

A ousadia fica em **um** elemento: o cabeçalho feito como a **ourela de um tecido de sarja
índigo**. Ourela é a borda que o tear fecha para o tecido não desfiar. No denim, ela costuma ser
branca com um fio vermelho, a chamada _redline_. O cabeçalho reproduz isso: a trama diagonal da
sarja, a navegação marcada por um pesponto cor de açafrão (a linha que costura o jeans) e, na
borda de baixo, a faixa clara com o fio carmim. Todo o resto é sóbrio.

## 2. Princípios

1. **Números primeiro.** Valores, quantidades e parcelas usam algarismos tabulares, alinhados à
   direita, sempre no formato brasileiro (`R$ 1.234,56`, `2,35 m`).
2. **Estado é texto.** Cada estado de pedido aparece como uma amostra de cor com o nome ao lado.
   A cor ajuda, o texto informa.
3. **Uma palavra por ação.** Os rótulos seguem a tabela da RNF-09 em todas as telas.
4. **O sistema não comenta a si mesmo.** Nenhuma tela avisa que um defeito está ligado
   (RNF-02). As regras de negócio, porém, são explicadas onde importam (frete grátis, saldo),
   para que quem explora saiba o que esperar.
5. **Ourela só no topo.** Cartões arredondados, sombras e texturas não aparecem no conteúdo. As
   seções se separam por fios finos e espaço.

## 3. O elemento memorável: o cabeçalho-ourela

| Parte     | Como é feito                                                                        |
| --------- | ----------------------------------------------------------------------------------- |
| Sarja     | Fundo `denim` com listras diagonais a 115°, brancas a 5 % de opacidade (CSS puro)   |
| Marca     | "Retalho" em Archivo largo (wdth 125), branco                                       |
| Navegação | Links em `nav` claro; o link ativo ganha um pesponto tracejado em `açafrão` embaixo |
| Ourela    | Faixa de 10 px em `ourela` com um fio de 2 px em `carmim` no meio                   |
| Impressão | Na ourela, à direita, texto em Plex Mono: "dados fictícios · laboratório de QA"     |

Não há imagem nem ícone de terceiros: tudo é gradiente CSS. Com `prefers-reduced-motion` nada
muda, porque o cabeçalho não tem animação.

## 4. Tokens

### 4.1 Cor

| Token         | Hex       | Uso                                   | Contraste                          |
| ------------- | --------- | ------------------------------------- | ---------------------------------- |
| `tinta`       | `#1B1F3B` | Texto principal                       | 16,08:1 no papel; 14,61:1 no fundo |
| `tinta-suave` | `#4B5268` | Texto secundário, dicas               | 7,76:1 no papel; 7,05:1 no fundo   |
| `papel`       | `#FFFFFF` | Superfícies de conteúdo               | —                                  |
| `fundo`       | `#F3F4F6` | Fundo da página                       | —                                  |
| `fio`         | `#D5D8E0` | Linhas divisórias decorativas         | decorativa                         |
| `borda`       | `#8E94A6` | Borda de campos e controles           | 3,03:1 no papel (componente)       |
| `anil`        | `#2B3990` | Ação primária, links, anel de foco    | 10,04:1 com o papel                |
| `carmim`      | `#A3242F` | Erros, ação destrutiva, fio da ourela | 7,37:1 com o papel                 |
| `musgo`       | `#3F5F2E` | Confirmação ("salvo")                 | 7,27:1 no papel                    |
| `açafrão`     | `#E3A72F` | Pesponto e foco dentro do cabeçalho   | 6,41:1 no denim                    |
| `denim`       | `#1E2A5A` | Fundo do cabeçalho                    | 13,69:1 com branco                 |
| `nav`         | `#C8CEE6` | Links do cabeçalho                    | 8,75:1 no denim                    |
| `ourela`      | `#F7F6F2` | Faixa da ourela                       | texto `tinta-suave` 7,18:1         |

Amostras de estado (sempre com borda `tinta` de 1 px e o nome ao lado):

| Estado                | Cor       | Referência têxtil |
| --------------------- | --------- | ----------------- |
| Rascunho              | `#8A90A2` | algodão cru       |
| Finalizado            | `#2B3990` | anil              |
| Parcialmente faturado | `#E3A72F` | açafrão           |
| Faturado              | `#3F5F2E` | musgo             |
| Cancelado             | `#A3242F` | carmim            |

### 4.2 Tipografia

Duas famílias livres (licença OFL), carregadas pelo `next/font`:

- **Archivo** (variável, eixos de peso e largura): interface, títulos e números. Os títulos usam
  largura 112; os números grandes do painel usam largura 75, condensada como etiqueta de preço.
- **IBM Plex Mono**: códigos de produto, documentos, números de nota e a impressão da ourela.

| Papel            | Tamanho / altura         | Peso | Observação                      |
| ---------------- | ------------------------ | ---- | ------------------------------- |
| Título de página | 28/34 (24/30 no celular) | 700  | Archivo, largura 112            |
| Título de seção  | 18/24                    | 650  |                                 |
| Corpo            | 16/24                    | 400  | Tamanho mínimo de leitura       |
| Apoio            | 14/20                    | 400  | Dicas, metadados, `tinta-suave` |
| Número grande    | 40/44                    | 700  | Painel, largura 75, tabular     |
| Mono             | 14/20                    | 450  | Códigos e documentos            |

### 4.3 Espaço, forma e movimento

- Grade de 4 px. Espaços usados: 4, 8, 12, 16, 24, 32, 48.
- Raio de 2 px em campos e botões; nada de cantos muito arredondados.
- Sem sombras. A profundidade vem de fios (`fio`) e do contraste `papel` × `fundo`.
- Transições de 120 ms só em cor e borda. Com `prefers-reduced-motion: reduce`, toda transição e
  animação vira troca instantânea (RNF-07).

### 4.4 Layout

- Conteúdo com largura máxima de 1120 px e margem lateral de 16 px no celular e 32 px a partir
  de 1024 px.
- Pontos de quebra: 640 px (formulários em duas colunas, tabelas como tabela) e 1024 px (pedido
  com a coluna de totais ao lado).
- Abaixo de 640 px, cada linha de tabela vira um bloco com rótulo e valor, sem rolagem
  horizontal (RNF-06).

## 5. Componentes

| Componente        | Regra                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Botão primário    | Fundo `anil`, texto branco, altura mínima de 44 px. Um por área de ação                    |
| Botão secundário  | Borda `borda`, texto `tinta`                                                               |
| Botão de perigo   | Borda e texto `carmim`; preenchido só dentro do diálogo de confirmação                     |
| Campo             | Rótulo visível acima, dica abaixo, erro em `carmim` ligado por `aria-describedby`          |
| Amostra de estado | Quadrado de 12 px com borda `tinta` e o nome do estado                                     |
| Tabela            | Cabeçalho em `tinta-suave`, números à direita e tabulares, fios entre as linhas            |
| Aviso             | `role="status"` para confirmação e `role="alert"` para erro, com texto que diz o que fazer |
| Diálogo           | `<dialog>` nativo: prende o foco, fecha com Esc e devolve o foco ao botão de origem        |
| Foco              | Contorno de 2 px em `anil`, afastado 2 px; no cabeçalho, em `açafrão`                      |

Estados de tela (RNF-08):

- **Vazio:** frase do que não há e a ação que resolve ("Nenhum produto cadastrado ainda." +
  "Novo produto").
- **Carregando:** texto "Carregando pedidos…" no lugar do conteúdo, sem animação obrigatória.
- **Erro:** "Não foi possível carregar os pedidos. Verifique a conexão e tente de novo." + botão
  "Tentar de novo".

## 6. Telas

| Tela        | Rota                          | Conteúdo                                                                    |
| ----------- | ----------------------------- | --------------------------------------------------------------------------- |
| Painel      | `/`                           | Vendido, faturado e a faturar, e uma fita proporcional faturado × a faturar |
| Pedidos     | `/pedidos`, `/pedidos/novo`   | Lista com filtro por estado; novo pedido a partir de um cliente             |
| Pedido      | `/pedidos/[id]`               | Itens, condições, totais, parcelas, faturamento, histórico e ações          |
| Faturamento | `/faturamento`                | Pedidos a faturar com "Emitir nota", lista de notas com "Cancelar nota"     |
| Produtos    | `/produtos`, `/novo`, `/[id]` | Busca, lista com preço por unidade, cadastro e edição                       |
| Clientes    | `/clientes`, `/novo`, `/[id]` | Busca por nome ou documento, cadastro e edição PF/PJ                        |

As mudanças de dados chamam a API REST pelo navegador (`fetch`). Assim, quem explora vê cada
requisição nas ferramentas do navegador e pode repeti-la, o caminho mais curto até o BUG-03.

## 7. Revisão do plano contra a especificação

| Requisito | Como o plano atende                                                                            |
| --------- | ---------------------------------------------------------------------------------------------- |
| RNF-05    | Rótulos visíveis, erro ligado ao campo, foco visível, contrastes da seção 4.1, estado em texto |
| RNF-06    | Tabelas viram blocos abaixo de 640 px; alvos de 44 px; sem rolagem horizontal em 360 px        |
| RNF-07    | Só transições de cor, desligadas com movimento reduzido; cabeçalho estático                    |
| RNF-08    | Estados vazio, carregando e erro com texto e ação em todas as listas                           |
| RNF-09    | Rótulos vêm de `ACTION_LABELS`; o diálogo de cancelamento usa "Voltar", não "Cancelar"         |
| RNF-10    | `formatBRL`, quantidades com vírgula, datas `dd/mm/aaaa`; campos aceitam vírgula ou ponto      |
| RNF-02    | Nenhum componente lê `isBugOn` para mudar aparência; só a área `/qa/defeitos` fala de defeitos |
| RF-04     | Preço com unidade: `R$ 4,00/m`, `R$ 20,00 o rolo de 5 m`, `R$ 1,50/un`                         |
| RF-20     | O resumo do pedido explica a regra do frete grátis e mostra "Frete grátis" quando se aplica    |
| RF-27     | Fora do rascunho, condições e itens aparecem só para leitura                                   |
| RF-40     | O botão do pedido usa `saveButton()`: rótulo "Salvar", sem atalho                              |

### 7.1 Como cada defeito aparece para quem explora

| Defeito | Onde aparece                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------- |
| BUG-01  | Pedido: aplicar desconto, depois mudar a quantidade de um item e salvar a quantidade            |
| BUG-02  | Pedido: incluir um rolo com quantidade 2 ou mais e comparar o unitário com o preço do rolo      |
| BUG-03  | Pedido aberto em duas abas: faturar numa, salvar condições na outra; ou repetir o PUT pela rede |
| BUG-04  | Pedido: escolher 3 parcelas num total não divisível e somar as parcelas                         |
| BUG-05  | Faturamento: cancelar uma nota de pedido faturado e olhar estado e saldo do pedido              |
| BUG-06  | Abrir o painel, emitir uma nota e comparar o faturado do painel com o total da lista de notas   |
| BUG-07  | Pedido: ler o botão de salvar e pressionar Ctrl+S                                               |

## 8. O que evitar

- Fundo creme com serifa e destaques em terracota.
- Grades de cartões idênticos e arredondados.
- Rótulos em caixa-alta com espaçamento largo espalhados pela interface (a única caixa-alta é a
  impressão da ourela).
- Gradientes coloridos, ícones decorativos e ilustrações genéricas.
- Destacar valores errados: o sistema mostra o que calculou, sem julgamento.

## 9. Autocrítica

Feita sobre 20 capturas (10 telas, em 1280 px e 360 px) do build de produção, com
`scripts/screenshots.ts`, e sobre a reprodução de cada defeito pela interface.

### 9.1 O que funcionou

- O cabeçalho-ourela é reconhecível e fica restrito ao topo; o conteúdo continua sóbrio.
- Os números grandes do painel, condensados (largura 75), lembram etiqueta de preço sem enfeite.
- Nenhuma das 10 telas tem rolagem horizontal em 360 px (conferido pelo script).
- Os 7 defeitos foram reproduzidos só pela interface, com os valores da especificação, e nenhuma
  tela fala de defeito (RNF-02). As capturas ficaram como evidência para os bug reports.

### 9.2 O que as capturas mostraram e foi corrigido

| Problema                                                    | Correção                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| Navegação quebrava em duas linhas no celular                | Itens distribuídos na largura toda, sem espaçamento lateral   |
| Produto virava quatro linhas de rótulo e valor no celular   | Nome e código viram a linha principal do bloco                |
| Valores em reais quebravam entre "R$" e o número            | Números nunca quebram linha (`.numero`)                       |
| No celular, os totais do pedido ficavam depois do histórico | A grade foi reordenada: itens, condições, totais, faturamento |
| A mesma dica longa se repetia em cada pedido a faturar      | Rótulo curto visível, número do pedido só no nome acessível   |
| "0 %" e "R$ 300,00" quebravam no meio                       | Espaços inseparáveis                                          |
| Rótulos dos blocos herdavam a fonte mono dos documentos     | Rótulos sempre na fonte da interface                          |
| Rascunhos e cancelados mostravam "Saldo R$ 0,00"            | Mostram "—", com texto para leitor de tela                    |
| Na nota total, a confirmação sumia junto com o formulário   | A confirmação passou para a página (`?emitida=`)              |

### 9.3 Limitações conhecidas

- Abaixo de 640 px, as tabelas usam `display: block`; alguns leitores de tela deixam de anunciá-las
  como tabela. Os rótulos de cada valor continuam visíveis e lidos.
- A trama da sarja é sutil de propósito e pode quase sumir em telas de pouco contraste.
- O seletor de produto lista o catálogo inteiro: serve para a massa de 18 produtos, mas pediria
  busca num catálogo grande.
- Os formulários não validam no navegador: todo erro vem da API, de propósito, para que a validação
  do servidor seja exercitada pela tela. O custo é uma ida ao servidor a cada erro.
- O fluxo completo só com teclado (RNF-05) foi percorrido nos componentes, mas ainda não tem teste
  automatizado; ele entra nos testes E2E da Fase 5.
