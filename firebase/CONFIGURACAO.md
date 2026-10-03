# O que configurar à mão

Esta versão roda como aplicativo móvel (instalável no Android pelo navegador). O fluxo de foto, correção, diário e totais já funciona. Um pacote Kotlin/Play Store não é gerado aqui.

## IA

- Grok é o provedor padrão. `XAI_API_KEY` fica só no servidor (já injetada na publicação). Nunca no cliente.
- Gemini: defina `GEMINI_API_KEY` no ambiente do servidor e `CALU_AI_PROVIDER=gemini`. Sem a chave, o app continua no Grok.
- Limites diários estão em `src/lib/calu/domain.ts` (`AI_LIMITS`). O servidor recusa acima do limite.

## Dados

- Contas e diário usam o banco do app (Postgres), com cada consulta filtrada pelo usuário autenticado.
- Fotos não são guardadas. Só a refeição confirmada.
- Código de barras consulta a Open Food Facts (sem chave). Se não achar: "Produto não encontrado".

## Firebase (se for migrar depois)

1. Crie um projeto Firebase.
2. Ative Authentication, Firestore e Storage.
3. Publique `firebase/firestore.rules` e `firebase/storage.rules`.
4. Troque as funções em `src/lib/calu/api.ts` por um repositório que leia e grave só em `users/{uid}/...`.
5. A chamada de IA continua no servidor. Não coloque a chave no app Android.

## Cobrança

Google Play Billing não está ligado. A tela de plano só descreve Gratuito e Premium.
