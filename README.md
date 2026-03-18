# Turma do Printy | Base Node

Base inicial em Node para subir no Render e evoluir em 3 partes:

1. API do GPT
2. Login com Postgres
3. Pagamentos

## Como rodar local

1. Copie `.env.example` para `.env`
2. Preencha `OPENAI_API_KEY` se quiser testar a rota GPT
3. Preencha `DATABASE_URL` quando quiser ativar login com Postgres
4. Rode:

```bash
npm install
npm start
```

Depois abra `http://localhost:3000`.

## Rotas atuais

- `GET /api/health`
- `GET /api/albums`
- `GET /api/albums/:name`
- `GET /api/roadmap`
- `POST /api/gpt/ask`
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

## Deploy no Render

- O projeto ja inclui `render.yaml`
- Defina no Render:
  - `OPENAI_API_KEY`
  - `CONTENT_BASE_URL` se quiser trocar a origem dos assets
  - `OPENAI_MODEL` se quiser trocar o modelo padrao
  - `DATABASE_URL` para ativar login

## Inicializacao do banco

Quando criar o Postgres, rode o SQL de [sql/init.sql](C:/Users/Lucas/Desktop/Turma%20do%20Printy%20Database/sql/init.sql).

## Fluxo atual de cadastro

1. `POST /api/auth/register` gera um codigo de 4 digitos
2. `POST /api/auth/verify-code` confirma o codigo e cria a sessao
3. `POST /api/auth/login` entra com email e senha

Enquanto o projeto estiver local, o backend devolve `devCode` para facilitar o teste antes da integracao de email.
