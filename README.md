# Turma do Printy | Base Node

Base inicial em Node para subir no Render e evoluir em 3 partes:

1. API do GPT
2. Login com Postgres
3. Pagamentos

## Como rodar local

1. Copie `.env.example` para `.env`
2. Preencha `OPENAI_API_KEY` se quiser testar a rota GPT
3. Preencha `DATABASE_URL` quando quiser ativar login com Postgres
4. Preencha `STRIPE_SECRET_KEY` para testar o checkout
5. Rode:

```bash
npm install
npm start
```

Depois abra `http://localhost:3000`.

## Rotas atuais

- `GET /api/health`
- `GET /api/albums`
- `GET /api/albums/:name`
- `GET /api/store/products`
- `POST /api/gpt/ask`
- `POST /api/audio/transcribe`
- `POST /api/payments/stripe/checkout`
- `POST /api/payments/stripe/subscription-checkout`
- `POST /api/payments/stripe/webhook`
- `GET /api/db/health`
- `POST /api/auth/register`
- `POST /api/auth/verify-code`
- `POST /api/auth/login`
- `GET /api/auth/me`

## Exemplo da rota GPT

```json
{
  "message": "Crie uma descricao curta para a plataforma Turma do Printy.",
  "system": "Responda em portugues, objetivo e amigavel."
}
```

Se `system` vier vazio, o backend usa um contexto cristao protestante amigavel e acolhedor como base padrao.

## Deploy no Render

- O projeto ja inclui `render.yaml`
- Defina no Render:
  - `OPENAI_API_KEY`
  - `CONTENT_BASE_URL` se quiser trocar a origem dos assets
  - `OPENAI_MODEL` se quiser trocar o modelo padrao
  - `OPENAI_TRANSCRIBE_MODEL` se quiser trocar o modelo de voz
  - `DATABASE_URL` para ativar login
  - `DEFAULT_PRODUCT_PRICE_CENTS` para o preco padrao dos albuns
  - `STRIPE_SECRET_KEY` com a chave secreta da Stripe
  - `STRIPE_WEBHOOK_SECRET` com o segredo do endpoint de webhook da Stripe

## Pagamentos com Stripe

- A pagina [public/produtos.html](C:/Users/Lucas/Desktop/Turma%20do%20Printy%20Database/public/produtos.html) abre o Stripe Checkout para compra avulsa
- A pagina [public/planos.html](C:/Users/Lucas/Desktop/Turma%20do%20Printy%20Database/public/planos.html) abre o Stripe Checkout em modo assinatura
- O webhook atual fica em `POST /api/payments/stripe/webhook`
- Para desenvolvimento local, rode `stripe listen --forward-to localhost:3000/api/payments/stripe/webhook` e copie o segredo gerado para `STRIPE_WEBHOOK_SECRET`

## Inicializacao do banco

Quando criar o Postgres, rode o SQL de [sql/init.sql](C:/Users/Lucas/Desktop/Turma%20do%20Printy%20Database/sql/init.sql).

## Fluxo atual de cadastro

1. `POST /api/auth/register` cria o usuario e abre a sessao
2. `POST /api/auth/login` entra com nome de usuario e senha
3. `GET /api/auth/me` valida a sessao atual
