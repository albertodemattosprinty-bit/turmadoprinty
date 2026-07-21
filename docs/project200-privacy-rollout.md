# Privacidade de dados do Projeto 200

A camada inicial usa criptografia de aplicação AES-256-GCM com uma chave de dados (DEK) aleatória por usuário. A DEK é armazenada no Postgres somente depois de ser criptografada por uma chave-mestra (KEK) que permanece nos segredos do Render.

## Ativação segura

1. Gere 32 bytes aleatórios em uma máquina administrativa:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

2. Salve o resultado diretamente no segredo `PROJECT200_DATA_KEK` do Render. Não coloque essa chave no Git, em mensagens, logs ou no Postgres.
3. Mantenha `PROJECT200_DATA_KEK_VERSION=1`.
4. Faça deploy e valide `npm run test:privacy`.
5. Execute uma vez no Shell do Render:

   ```sh
   npm run migrate:project200:privacy
   ```

6. Depois da migração, altere `PROJECT200_DATA_ENCRYPTION_REQUIRED` para `true`.

Sem a KEK, o servidor não consegue recuperar dados já criptografados. Guarde uma cópia em um cofre de segredos separado e com acesso restrito.

## Rotação

Crie uma nova KEK, aumente `PROJECT200_DATA_KEK_VERSION` e mantenha a chave antiga temporariamente em `PROJECT200_DATA_PREVIOUS_KEKS`, como JSON: `{"1":"base64-da-chave-anterior"}`. Ao acessar os dados, a DEK do usuário é reembrulhada automaticamente pela versão atual. Só remova a chave anterior depois de confirmar que nenhuma linha usa a versão antiga.

## Escopo desta etapa

- Papel administrativo persistente e não derivado do nome público.
- Logout com revogação real da sessão no Postgres.
- Conversas e propostas do Marin criptografadas por usuário.
- Leitura retrocompatível e migração em lotes das mensagens antigas.

Ações, missões e finanças serão migradas por superfície, preservando filtros, somas e relatórios. O token web ainda é compatível com o armazenamento atual; a migração para cookie HttpOnly e armazenamento seguro nativo é a próxima etapa da trilha.
