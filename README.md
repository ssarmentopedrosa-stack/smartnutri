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
| `CALU_ENV` | `production` força a exigência de `DATABASE_URL`. |

Produção (`VERCEL_ENV=production`, deploy com `GROK_PROJECT_ID` ou `CALU_ENV=production`) sem `DATABASE_URL` falha de propósito. O preview local pode usar PGLite.

## Banco e migrations

Arquivos em `migrations/`, em ordem, cada um numa transação. Não edite migrations já aplicadas. A V2.1 está em `migrations/0003_v21.sql` (fuso, fonte nutricional, confiança, assinatura preparada, chamadas de IA, rate limit, cache de código de barras, micro-hábitos, versões de consentimento).

```bash
npm run db:migrate
```

Sem `DATABASE_URL`, o comando não faz nada: o PGLite migra na subida.

## IA, TACO e Open Food Facts

1. A IA devolve alimento, quantidade, unidade e confiança.
2. O `FoodResolver` casa o nome com a TACO (aliases inclusos).
3. Se houver valores por 100 g e a unidade converter com base conhecida, `calculateNutrition` faz `quantidade / 100 × nutriente`.
4. Código de barras usa Open Food Facts, com cache, timeout e estado “dados completos” ou “dados parciais”. `per100g` fica separado da porção.
5. Estimativa do modelo só permanece quando não há fonte estruturada. A interface mostra “Estimativa” e `~kcal`.

Fotos não são gravadas.

## Quotas e segurança

- Quota diária é um `UPDATE ... WHERE count < limite RETURNING`. Falha do provedor devolve a reserva.
- Rate limit é outra tabela, por minuto, independente da quota.
- Toda leitura privada filtra `user_id` da sessão.
- Apagar dados remove o diário e o perfil nutricional e mantém o login. Excluir a conta também remove `user`, `session`, `account` e `verification`.
- Menores de 18 anos não recebem meta calórica de Mifflin-St Jeor nem déficit automático.
- O “hoje” da quota usa o fuso IANA do perfil, não UTC puro.

O plano premium só vale com uma linha ativa em `subscriptions`. `profiles.plan` não é a fonte de cobrança. Não há pagamento nesta versão.

## Testes

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`npm test` cobre domínio, motor nutricional, isolamento, quota concorrente e exclusão de conta (PGLite). O fluxo de browser autenticado (cadastro até exclusão de conta) depende de sessão real e não roda no CI sem segredo.

## Desenvolvimento e produção

- Desenvolvimento: `npm run dev`
- Produção: `npm run build` e o runtime com `DATABASE_URL`
- CI: `.github/workflows/ci.yml`
