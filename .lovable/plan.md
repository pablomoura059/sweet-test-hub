# Integração inicial do webhook Cakto

## Implementação
- Criar a Edge Function pública `cakto-webhook`, aceitando somente POST com JSON.
- Validar o segredo recebido com `CAKTO_WEBHOOK_SECRET`, sem expor seu valor.
- Validar `event` e os campos obrigatórios de compras aprovadas, com respostas 200, 400, 401 e 405.
- Registrar apenas dados não sensíveis necessários para confirmar uma compra aprovada.
- Configurar `verify_jwt = false` exclusivamente para essa função.
- Publicar a função e testar o endpoint público com requisições seguras.

## Fora do escopo
- Nenhuma interface, tabela, dado, autenticação ou fluxo existente será alterado.
- Nenhum usuário ou e-mail será criado nesta etapa.

## Configuração necessária
- Após a publicação, cadastrar o mesmo segredo forte como `CAKTO_WEBHOOK_SECRET` no Supabase e na Cakto.
