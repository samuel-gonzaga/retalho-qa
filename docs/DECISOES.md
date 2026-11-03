# Registro de decisões

Cada decisão tomada sem consulta fica registrada aqui: o que foi decidido, as alternativas e o
motivo. Os IDs são estáveis; uma decisão revista ganha uma nova entrada que cita a anterior.

## Fase 0 · Fundação

### D-01 · TypeScript 6.0 e ESLint 9

- **Decisão:** fixar `typescript@6.0.3` e `eslint@9`.
- **Alternativas:** TypeScript 7 (compilador nativo) e ESLint 10, as versões mais novas.
- **Motivo:** o `typescript-eslint` usado pelo `eslint-config-next@16` aceita TypeScript abaixo de
  6.1, e os plugins `react`, `import` e `jsx-a11y` aceitam ESLint até a versão 9.

### D-02 · Configuração manual do Next.js

- **Decisão:** montar `package.json`, `tsconfig.json` e configurações à mão, sem `create-next-app`.
- **Alternativas:** `create-next-app` em pasta temporária e cópia dos arquivos.
- **Motivo:** o repositório já existia com `README.md` e histórico; a montagem manual deixa cada
  arquivo de configuração intencional e revisável.

### D-03 · Quando a área /qa/defeitos fica disponível

- **Decisão:** a página `/qa/defeitos` e a API `/api/qa/bugs` funcionam quando
  `NODE_ENV !== 'production'` ou quando `RETALHO_QA_PAINEL=1`. Caso contrário, devolvem 404.
- **Alternativas:** depender só do `NODE_ENV`, o que impediria os testes E2E contra
  `next start`; criar uma variável de ambiente liberada por padrão, insegura por padrão.
- **Motivo:** fica bloqueada por padrão em produção e continua testável no CI com uma liberação
  explícita.

### D-04 · Estado dos defeitos ligados em tempo de execução

- **Decisão:** guardar as mudanças feitas em `/qa/defeitos` na memória do processo
  (`globalThis`). Reiniciar o servidor volta ao valor de `RETALHO_BUGS`.
- **Alternativas:** persistir em tabela SQLite ou em cookie por visitante.
- **Motivo:** é a opção mais simples. `RETALHO_BUGS` é a fonte durável e os testes controlam o
  estado pela API. O `globalThis` garante um estado único mesmo quando o Next carrega o módulo em
  mais de um bundle.

### D-05 · Idioma de rotas, chaves e mensagens

- **Decisão:** as URLs de tela ficam em português (`/qa/defeitos`, `/pedidos`). Rotas de API e
  chaves JSON ficam em inglês (`/api/qa/bugs`, `active`). As mensagens de erro ficam em português,
  no formato `{ "error": { "code", "message" } }`.
- **Alternativas:** tudo em português ou tudo em inglês.
- **Motivo:** segue a regra do projeto (interface em português, nomes técnicos em inglês). A
  mensagem de erro chega ao usuário, então fica em português.

### D-06 · Estilo de código

- **Decisão:** Prettier sem ponto e vírgula, com aspas simples, largura 100 e LF. O
  `.gitattributes` força LF no checkout. `npm run lint` roda ESLint (zero avisos) e Prettier.
- **Alternativas:** os padrões do Prettier ou o lint sem verificação de formatação.
- **Motivo:** um único comando valida estilo e regras. O LF evita falsos alertas do Prettier em
  clones feitos no Windows.

### D-07 · Registro de fim de fase em PROGRESSO.md

- **Decisão:** a linha de cada fase registra o hash do commit `chore(faseN): conclui ...` e o
  resultado do push dele. A linha entra logo depois, num commit `docs(progresso)`, publicado na
  sequência.
- **Alternativas:** registrar o hash do commit anterior, ou deixar o registro para a fase seguinte.
- **Motivo:** um commit não consegue conter o próprio hash. Assim o registro é exato e nada fica
  sem publicar.

### D-08 · Projetos de teste

- **Decisão:** `npm test` roda o projeto Vitest `unit` e `npm run test:api` roda o projeto `api`.
  O Playwright roda contra o build de produção (`next build && next start`) na porta 3100, com um
  worker.
- **Alternativas:** um único comando Vitest, ou E2E contra `next dev`.
- **Motivo:** permite que o CI separe as etapas. O estado dos defeitos é global ao servidor, por
  isso os testes E2E não podem rodar em paralelo. O build de produção é mais estável que o modo de
  desenvolvimento.

### D-09 · Alertas do npm audit

- **Decisão:** aceitar os 16 alertas moderados de `minimatch`, que só existe como dependência de
  desenvolvimento do ESLint.
- **Alternativas:** `npm audit fix --force`.
- **Motivo:** a correção forçada troca versões principais e quebra o ESLint. O código não roda em
  produção e não recebe entrada externa.

## Fase 1 · Especificação

### D-10 · Dinheiro em centavos e arredondamento meio para cima

- **Decisão:** guardar valores em centavos inteiros e arredondar meio para cima, no centavo, em
  apenas três pontos: preço do rolo, total do item e valor do desconto (SPEC 1.2).
- **Alternativas:** números de ponto flutuante; arredondamento bancário (meio para o par);
  arredondar só o total do pedido.
- **Motivo:** centavos inteiros eliminam erros de ponto flutuante. O arredondamento meio para
  cima é o que o usuário espera de uma calculadora, e poucos pontos de arredondamento deixam cada
  resultado reproduzível à mão.

### D-11 · Quantidade máxima de 1.000 para todas as unidades

- **Decisão:** a quantidade vai de 0,01 a 1.000 em qualquer unidade. Metro aceita 2 casas
  decimais; rolo e unidade só aceitam inteiros (RF-15).
- **Alternativas:** um limite diferente por unidade; nenhum limite máximo.
- **Motivo:** um limite único gera valores limite claros (1.000, 1.000,01 e 1.001). A regra de
  inteiros cria uma partição interessante: 0,01 é válido para metro e inválido para rolo.

### D-12 · Regra de frete grátis com três condições

- **Decisão:** o frete é grátis quando valor líquido ≥ R$ 300,00 **e** pagamento por Pix **e** CEP
  do cliente entre `01000-000` e `09999-999` (RF-20).
- **Alternativas:** condições combinadas com "ou"; faixas de valor com descontos de frete;
  condição pelo tipo de cliente (PF ou PJ).
- **Motivo:** três condições independentes ligadas por "e" formam uma tabela de decisão completa de
  8 regras, fácil de reduzir. As condições de valor e de CEP têm limites testáveis dos dois lados.
  O CEP reaproveita um campo que o cliente já tem.

### D-13 · CNPJ alfanumérico aceito

- **Decisão:** aceitar CNPJ numérico e alfanumérico, com o algoritmo público de dígitos
  verificadores (RF-08).
- **Alternativas:** aceitar só o CNPJ numérico.
- **Motivo:** a Receita Federal passou a atribuir CNPJs alfanuméricos em 2026. Recusar esse
  formato seria um defeito não intencional. O algoritmo foi conferido com o exemplo público
  `12ABC34501DE` → `35`.

### D-14 · Faturamento por valor

- **Decisão:** a nota fatura um valor em reais (até o saldo), e não quantidades de itens
  (RF-32, RF-33).
- **Alternativas:** faturar por item e quantidade.
- **Motivo:** faturar por item exigiria ratear desconto e frete entre os itens, com novos
  arredondamentos fora do escopo. Por valor, o saldo é um único número, coerente com o painel.

### D-15 · Ações repetidas são idempotentes

- **Decisão:** repetir "Finalizar pedido", "Cancelar pedido" ou "Cancelar nota" sobre algo que
  já está no estado de destino devolve 200 sem mudança e sem novo registro no histórico
  (RF-28, RF-29, RF-34).
- **Alternativas:** devolver 409 na repetição.
- **Motivo:** um duplo clique ou um reenvio de rede não deve gerar erro nem efeito duplicado. O
  histórico (RF-30) permite provar que houve uma só transição.

### D-16 · Ordem de verificação 404 → 409 → 422

- **Decisão:** primeiro a existência do recurso, depois o estado, depois os dados (RF-31).
- **Alternativas:** validar os dados antes do estado.
- **Motivo:** um pedido bloqueado responde "bloqueado" qualquer que seja o corpo. Assim a resposta
  sobre o estado é previsível e não depende de montar um corpo válido.

### D-17 · Cancelar pedido só sem nota emitida

- **Decisão:** um pedido só pode ser cancelado em rascunho ou finalizado. Com nota emitida, as
  notas precisam ser canceladas antes (RF-26, RF-29).
- **Alternativas:** cancelar o pedido cancelando as notas em cascata.
- **Motivo:** desfazer faturamento deve ser uma ação explícita, nota a nota. A máquina de estados
  fica menor e cada transição tem um único efeito.

### D-18 · Mesma regra de motivo para pedido e nota

- **Decisão:** o motivo de cancelamento tem de 10 a 200 caracteres, sem contar espaços nas
  pontas, tanto no pedido quanto na nota.
- **Alternativas:** motivo só no pedido, ou regras diferentes para cada um.
- **Motivo:** uma regra única é mais fácil de aprender, de explicar na tela e de testar nos
  limites (9, 10, 200 e 201 caracteres).

### D-19 · Cada produto aparece uma vez no pedido

- **Decisão:** incluir um produto que já está no pedido devolve 409 `DUPLICATE_ITEM` (RF-14).
- **Alternativas:** somar a quantidade ao item existente; permitir linhas repetidas.
- **Motivo:** mudar a quantidade é uma ação explícita, a edição do item. Somar de forma escondida
  confundiria o total, e linhas repetidas complicariam a leitura do pedido.

### D-20 · Itens copiam o produto e o pedido congela na finalização

- **Decisão:** o item guarda nome, unidade, comprimento e preço do momento da inclusão, e o pedido
  fixa total, frete e parcelas ao ser finalizado (RF-03, RF-24).
- **Alternativas:** ler sempre os dados atuais do produto e do cliente.
- **Motivo:** editar um cadastro não pode alterar pedidos já fechados nem o que já foi faturado.

### D-21 · Defeitos parciais, que preservam o caminho feliz

- **Decisão:** cada defeito afeta um caminho específico: o BUG-01 só a edição de quantidade, o
  BUG-03 só o estado Faturado, o BUG-06 só as ações de nota.
- **Alternativas:** defeitos que quebram a funcionalidade inteira.
- **Motivo:** defeitos reais costumam ser parciais. Um defeito que quebra tudo seria achado por
  qualquer teste de fumaça e não exercitaria nenhuma técnica de projeto de testes.

## Fase 2 · Domínio e API

### D-22 · Camada de serviços em `src/server`

- **Decisão:** além de `src/domain` (funções puras), `src/db` (esquema e conexão) e `src/app`
  (rotas), há uma pasta `src/server` com os serviços que juntam domínio e banco. As rotas só leem
  parâmetros e corpo e chamam um serviço.
- **Alternativas:** colocar a lógica dentro das rotas ou dentro de `src/db`.
- **Motivo:** as rotas ficam com poucas linhas, o domínio continua sem acesso a banco, e o seed
  reaproveita os serviços sem passar por HTTP.

### D-23 · Testes de API dentro do processo

- **Decisão:** os testes de `tests/api` chamam os handlers das rotas do Next diretamente, com
  objetos `Request` reais e um banco SQLite em memória novo a cada teste.
- **Alternativas:** subir o servidor e fazer requisições HTTP.
- **Motivo:** cobrem o mesmo contrato (status, corpo e formato de erro), rodam em segundos e não
  dependem de porta nem de build. O caminho HTTP completo fica com os testes E2E da Fase 5.

### D-24 · Totais do rascunho gravados no banco

- **Decisão:** cada alteração de rascunho recalcula e grava subtotal, desconto, frete cobrado,
  total e parcelas no pedido, e cada item grava o próprio preço unitário e total. A finalização
  apenas congela o que está gravado e não recalcula.
- **Alternativas:** calcular os totais na leitura.
- **Motivo:** o pedido mostra exatamente o que foi calculado na última alteração, o que congela
  os valores sem esforço extra (RF-24). Também é o que permite que um recálculo defeituoso
  (BUG-1) persista até o próximo recálculo correto, como acontece em sistemas reais.

### D-25 · Etiquetas de defeito nos testes e matriz por processo

- **Decisão:** todo teste que detecta um defeito leva `[BUG-0n]` no título. O comando
  `npm run test:defeitos` roda as suítes unitária e de API sem defeitos e depois com cada defeito
  ligado (`RETALHO_BUGS=n`). Ele exige que algum teste etiquetado falhe e que nenhum teste sem
  etiqueta falhe, e grava `test-results/bug-matrix.md`.
- **Alternativas:** `describe.each` dentro de um único processo, invertendo a asserção quando o
  defeito está ligado.
- **Motivo:** com processos separados, o teste falha de verdade quando o defeito está ligado, em
  vez de "passar porque falhou". A etiqueta torna a ligação teste → defeito verificável e
  alimenta a matriz de rastreabilidade da Fase 4. Testes etiquetados que passam com o defeito
  ligado são relatados como mascarados (o caso de 1 rolo do BUG-02).

### D-26 · Seed limpa as tabelas em vez de apagar o arquivo

- **Decisão:** `npm run seed` apaga as linhas de todas as tabelas e recria a massa no mesmo
  arquivo, com semente, relógio e defeitos desligados fixos durante a geração.
- **Alternativas:** apagar o arquivo `.db` e criar outro.
- **Motivo:** no Windows, o arquivo fica travado enquanto o servidor de desenvolvimento está
  aberto. Sem `AUTOINCREMENT`, os IDs recomeçam em 1 depois da limpeza, e a massa fica idêntica a
  cada execução (RNF-03).

### D-27 · Estado compartilhado em `globalThis`

- **Decisão:** a conexão com o banco, os defeitos ligados em tempo de execução e o cache do painel
  ficam em `globalThis`. O cache é guardado num `WeakMap` indexado pela conexão.
- **Alternativas:** variáveis de módulo.
- **Motivo:** o Next pode carregar o mesmo módulo em mais de um bundle do servidor. Com variáveis
  de módulo, uma rota poderia invalidar um cache diferente do que a página lê, o que criaria um
  defeito real fora do mecanismo `isBugOn`. O `WeakMap` faz cada banco novo dos testes começar sem
  cache.

### D-28 · Corpo vazio é tratado como ausência de dados

- **Decisão:** um corpo vazio não é JSON inválido. Ele vale como "nada enviado" e cai na validação
  (422), enquanto um corpo malformado devolve 400 (RNF-11).
- **Alternativas:** responder 400 também para corpo vazio.
- **Motivo:** "cancelar sem motivo" é um caso de teste pedido explicitamente e deve devolver
  `REASON_REQUIRED`, com uma mensagem útil, mesmo quando o cliente da API não manda corpo.

## Fase 3 · Direção de design e telas

### D-29 · Geração do AGENTS.md desligada

- **Decisão:** `agentRules: false` no `next.config.ts`, a opção que o próprio Next.js documenta
  para não gerar o arquivo.
- **Alternativas:** commitar o `AGENTS.md` que o `next dev` cria, ou só ignorá-lo no `.gitignore`.
- **Motivo:** o arquivo é gerado por ferramenta e traz instruções para agentes de IA, não
  conteúdo do projeto. Desligar a geração deixa a árvore limpa sem versionar algo gerado.

### D-30 · Skill de design indisponível

- **Decisão:** a skill `frontend-design` não existe neste ambiente (a ferramenta devolveu
  "Unknown skill"). Foi aplicado o processo alternativo do plano: tokens e princípios em
  `docs/DESIGN.md`, revisão contra a especificação, código e autocrítica com capturas.
- **Alternativas:** seguir sem plano de design escrito.
- **Motivo:** o plano registrado antes do código deixa as escolhas visuais revisáveis e
  rastreáveis, como os requisitos.
