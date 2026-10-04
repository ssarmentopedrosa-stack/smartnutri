# SmartNutri (Calu)

Acompanhamento alimentar: a foto ou o texto identifica o alimento, uma fonte estruturada (TACO ou Open Food Facts) informa os nutrientes e o cálculo é determinístico. O histórico vira resumo, padrão e um olhar semanal — não uma nota.

## Arquitetura

- React 19, TypeScript, TanStack Start/Router
- PostgreSQL (Neon) em produção; PGLite só em desenvolvimento e no preview local
- Better Auth nas rotas `/api/auth/*`
- Server functions em `src/lib/calu/api.ts`, sempre com a sessão do servidor
- IA (Grok ou Gemini) só no servidor, para identificar, explicar e conversar
- TACO em `src/lib/calu/taco.ts`; Open Food Facts no código de barras
- Motor nutricional: `resolver.ts`, `nutrition.ts`, `pipeline.ts`
- Acompanhamento: `longitudinal.ts` (dia, semana, padrões, tendência de peso)

## Setup

```bash
npm install
npm run dev
```

O preview sobe em `0.0.0.0:8080`. Sem `DATABASE_URL`, o desenvolvimento usa PGLite e aplica `migrations/*.sql` sozinho.

## Variáveis de ambiente

Veja `.env.example`. As chaves de IA e o banco ficam no servidor. Nada com prefixo secreto deve ir para o cliente.

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres. Obrigatória em produção. |
| `BETTER_AUTH_SECRET` | Sessão. |
| `BETTER_AUTH_URL` | URL pública do app. |
| `XAI_API_KEY` | Grok. |
| `GEMINI_API_KEY` | Gemini, opcional. |
| `CALU_AI_PROVIDER` | `grok` (padrão) ou `gemini`. |
| `CALU_ENV` | `development`, `preview`, `production` ou `test`. |
| `CALU_TEST_DATABASE_URL` | Postgres só de teste. A suíte recusa um nome de banco que não pareça teste. |

| Ambiente | Banco sem `DATABASE_URL` | IA | Migrations |
| --- | --- | --- | --- |
| development | PGLite | se houver chave no servidor | na subida do PGLite |
| test | PGLite | não chamar provedor pago nos testes | na subida do PGLite |
| preview (`VERCEL_ENV=preview`) | PGLite | chave do preview, se existir | na subida do PGLite |
| production | falha, não usa PGLite | chave de produção | `npm run db:migrate` no build |

Produção é `CALU_ENV=production`, `VERCEL_ENV=production`, ou `NODE_ENV=production` com deploy (`VERCEL=1` ou `GROK_PROJECT_ID`). Preview continua podendo usar PGLite. `NODE_ENV=production` sozinho, sem marca de deploy, também usa PGLite — é o que o build local faz.

## Banco e migrations

Arquivos em `migrations/`, em ordem, cada um numa transação. Não edite migrations já aplicadas. A V2.1 está em `migrations/0003_v21.sql`. A V2.2 está em `migrations/0004_v22.sql` (versão de preço, tokens totais, tipo de erro e índice da janela de rate limit). A V3.1 está em `migrations/0005_v31.sql` (`daily_insights`, cache do olhar do dia). Os arquivos podem ser aplicados de novo sem apagar dado.

```bash
npm run db:migrate
```

Sem `DATABASE_URL`, o comando não faz nada: o PGLite migra na subida.

## Busca nutricional

A busca em `src/lib/calu/search.ts` normaliza acento e espaço, aplica plural só quando o radical já existe no catálogo e ranqueia: nome exato, nome normalizado, alias, prefixo, tokens e um fuzzy curto. Confiança alta segue sozinha. Média e baixa pedem confirmação — o app não grava a opção em silêncio. TACO vem antes de Open Food Facts: um match alto da TACO não é substituído pelo rótulo. Colher de sopa, xícara, unidade e fatia só viram gramas quando o alimento tem base conhecida. Colher de chá não tem base e pede o peso.

O cache de busca fica em memória, 10 minutos, só com o texto normalizado. Código de barras continua em `barcode_cache`, sem foto e sem chave.

## IA, custo e limites

O preço estimado está em `src/lib/calu/pricing.ts`, versão `2026-10-01`. Não é a tabela oficial do provedor: são os mesmos valores por 1 milhão de tokens já usados na V2.1 (Grok 2/6, Gemini 0.15/0.6). Cada chamada grava operação canônica (`PHOTO_ANALYSIS`, `TEXT_FOOD_IDENTIFICATION`, `COACH`, `FOOD_SEARCH_ASSIST`, `OTHER`), tokens, custo estimado, versão, duração, sucesso e tipo de erro. Isso não aparece para quem usa o app.

Quota diária continua `UPDATE ... WHERE count < limite`. Se o provedor falha, a reserva volta. Rate limit incrementa só enquanto `hits < limite`; rejeição não aumenta o contador. Janelas com mais de dois minutos são apagadas no hit seguinte. O plano (free/premium) sai de `subscriptions` no servidor. Não há cobrança nesta versão.

## Testes

```bash
npm run typecheck
npm run lint
npm test
npm run test:pg
npm run test:e2e
npm run build
```

`npm test` cobre domínio, busca, preço, migrations em PGLite, isolamento, quota e rate limit (incluindo 100 pedidos). `npm run test:pg` usa PostgreSQL de verdade quando `CALU_TEST_DATABASE_URL` existe; sem a variável, o teste é pulado. No CI, o job `postgres` sobe PostgreSQL 16 e roda essa suíte. `npm run test:e2e` abre o app no navegador (cadastro, diário, isolamento, exclusão, menor). Não chama a IA paga: se não houver chave, o texto mostra indisponibilidade e o rate limit estoura de propósito.

## Deploy

- Desenvolvimento: `npm run dev`
- Produção: `npm run build` e o runtime com `DATABASE_URL`
- CI: `.github/workflows/ci.yml`
- Artefato `.vercel/output` é gerado no build e não entra no Git

## Production checklist

- [ ] `DATABASE_URL` de produção
- [ ] `BETTER_AUTH_SECRET`
- [ ] `BETTER_AUTH_URL`
- [ ] provedor de IA no servidor, se a análise for ligada
- [ ] migrations aplicadas, inclusive `0004_v22.sql` e `0005_v31.sql`
- [ ] PostgreSQL, não PGLite
- [ ] E2E do fluxo crítico
- [ ] logs sem segredo, foto ou prompt
- [ ] quota diária
- [ ] rate limit
- [ ] backup do banco
- [ ] monitoramento dos logs estruturados


## IA, TACO e Open Food Facts

1. A IA devolve alimento, quantidade, unidade e confiança. Sem chave, a tela avisa e o registro manual continua.
2. A busca e o `FoodResolver` casam o nome com a TACO (aliases inclusos). Se houver mais de uma leitura próxima, a pessoa confirma.
3. Se houver valores por 100 g e a unidade converter com base conhecida, `calculateNutrition` faz `quantidade / 100 × nutriente`.
4. Código de barras usa Open Food Facts, com cache, uma nova tentativa, timeout e estado “dados completos” ou “dados parciais”. Um item que já é TACO com confiança alta não troca esses números pelo rótulo.
5. Estimativa do modelo só permanece quando não há fonte estruturada. A interface mostra “Estimativa” e `~kcal`.

Fotos não são gravadas.

## Quotas e segurança

- Quota diária é um `UPDATE ... WHERE count < limite RETURNING`. Falha do provedor devolve a reserva.
- Rate limit é outra tabela, por minuto. Passou do teto, o contador para.
- Toda leitura privada filtra `user_id` da sessão.
- Apagar dados remove o diário e o perfil nutricional e mantém o login. Excluir a conta também remove `user`, `session`, `account` e `verification`.
- Menores de 18 anos não recebem meta calórica de Mifflin-St Jeor nem déficit automático.
- O “hoje” da quota usa o fuso IANA do perfil, não UTC puro.

O plano premium só vale com uma linha ativa em `subscriptions`. `profiles.plan` não é a fonte de cobrança. Não há pagamento nesta versão. A cota mensal em código é só o teto diário vezes 30, para o servidor — o cliente não escolhe o plano.

## CALU V3.1 — Smart Daily Experience

O diário (`/diario`) é o painel do dia. Os totais saem das refeições já gravadas e de `calculateNutrition`. A IA não soma caloria nem macro.

- Resumo: calorias, proteína, carboidrato, gordura, fibra e água. Com meta numérica, mostra consumido, restante e percentual. Sem meta, ou para menor de 18 anos, o texto é “meta não configurada”. Nada é inventado como zero no lugar da meta.
- Refeições agrupadas pelo tipo já existente. Dá para atualizar a quantidade, repetir um alimento (`repeatFood`), repetir a refeição no dia aberto (`duplicateMeal`), trocar por outro item real da TACO (`suggestSubstitutes`) e excluir com confirmação.
- Água: +200, +300, +500 ml, ou um inteiro entre 50 e 2000 ml.
- Registro incompleto: `CONFIRMED`, `NEEDS_CONFIRMATION`, `PARTIAL`, `UNKNOWN`. Sem caloria, não há botão de confirmar. Open Food Facts incompleto avisa que algumas informações não estão disponíveis.
- Porções em `src/lib/calu/portions.ts`. Sem base, a unidade não vira grama. Colher de chá continua sem conversão.
- Data futura é recusada no servidor para refeição, alimento repetido, água, peso e hábito. A mensagem é “Data futura não pode ser registrada.” O “hoje” usa o fuso do perfil.
- Notificações aceitam exatamente `true` ou `false`.
- “Pedir um olhar da Calu” chama `askInsight` uma vez, com `guardedAi` (quota, rate limit, custo). O contexto é JSON do dia, sem nome, e-mail ou foto. A resposta passa por `parseDailyInsight`. O cache é `daily_insights`, chave usuário + dia + hash do contexto. Se a IA falhar, o diário continua e o bloco mostra “CALU está indisponível no momento.” Ou a nota local, se o texto for inválido. Quota e rate limit ainda aparecem como erro.
- Registro manual: "Cadastrar manualmente" fica fora do formulário do código. É um link para `?manual=true`, então a revisão abre mesmo se o clique acontecer antes da hidratação. "Confirmar refeição" só aparece depois que a página está interativa.
- Autoridade nutricional: em refeição nova ou editada, caloria e macros do cliente não prevalecem sobre TACO nem sobre Open Food Facts. `authorizeRecordedFood` recalcula com o motor e com `portions.ts`. Sem conversão conhecida, o nutriente fica vazio e o registro não entra como confirmado. O histórico antigo não é reprocessado sozinho. O código de barras reusa o cache já gravado na consulta; sem esse snapshot, o número enviado pelo cliente é descartado.

O dia seguinte fica bloqueado na navegação quando o dia visto é hoje ou posterior. O cálculo do exemplo 150 g de arroz tipo 1 + 100 g de feijão carioca + 120 g de frango grelhado está no teste `v31.test.ts`, via `resolveFoodName` e `calculateNutrition`.

## CALU V3.2 — CALU Coach

O Coach lê o mesmo dia que o diário já carregou. Ele não soma nutriente e não grava refeição.

- O cartão em `/diario` sai de `decideCoach` no `getHome`. Abrir o diário, registrar água ou editar quantidade não chama modelo. A IA entra só em "Perguntar ao Coach", quando a pergunta não cabe numa resposta direta (proteína, água, calorias, peso, semana ou o próximo passo).
- Estados: `GREAT`, `ON_TRACK`, `NEEDS_ATTENTION`, `INCOMPLETE`, `NO_DATA`. Há uma ação principal. "Por que estou vendo isso?" mostra o número que já está no registro.
- O contexto é montado no servidor com o usuário da sessão. `userId` e totais enviados pelo cliente são ignorados. O JSON do modelo não leva nome, e-mail nem id.
- `askCoach` reusa `guardedAi`, a quota de texto, o rate limit (`askCoach`, 8 por minuto) e o preço `COACH`. Se a cota, o limite, o provedor ou o JSON falharem, o texto é "Não consegui atualizar o Coach agora. Seus dados continuam salvos normalmente." e o diário segue.
- Cache em `coach_cache` (`migrations/0006_v32.sql`): usuário + dia + hash da pergunta, invalidado quando o hash do contexto muda. Não guarda o prompt. O insight diário continua em `daily_insights`.
- Fora de escopo: diagnóstico, medicamento, jejum, emagrecimento, alteração de caloria ou meta. A resposta redireciona sem chamar o modelo.
- Menor de 18 anos e meta qualitativa não recebem comparação com meta calórica adulta. O fuso do perfil define a hora e o dia.



