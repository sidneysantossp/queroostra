# Quero Ostra

Plataforma Next.js para venda e reserva programada de ostras, com checkout em etapas, múltiplas datas, área do cliente, painel administrativo, Supabase e Asaas.

## Executar localmente

```bash
npm install
npm run dev
```

Sem credenciais, o projeto usa o modo demonstrativo:

- carrinho, sessão e pedidos ficam no `localStorage`;
- checkout, dashboard e admin permanecem navegáveis;
- a cobrança recebe um identificador de demonstração;
- nenhum pagamento real é processado.

## Ativar Supabase

1. Crie um projeto no Supabase.
2. Execute `supabase/migrations/001_initial_schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local` e preencha as chaves.
4. Cadastre o primeiro usuário e promova-o manualmente:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@queroostra.com.br';
```

Se o usuário foi criado antes da migração e não apareceu em `public.profiles`, insira o perfil manualmente usando o `id` de `auth.users`:

```sql
insert into public.profiles (id, full_name, email, role, active)
select id, coalesce(raw_user_meta_data ->> 'full_name', 'Administrador Quero Ostra'), email, 'admin', true
from auth.users
where email = 'admin@queroostra.com.br'
on conflict (id) do update set role = 'admin', active = true;
```

O arquivo `proxy.ts` atualiza a sessão e protege `/dashboard` e `/admin`. O acesso ao admin também valida `profiles.role` no servidor.

## Ativar Asaas

Configure em `.env.local`:

```env
ASAAS_API_KEY=
ASAAS_ENVIRONMENT=sandbox
ASAAS_WEBHOOK_SECRET=
SETTINGS_ENCRYPTION_KEY=
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
```

No Asaas, cadastre:

```text
POST https://seu-dominio.com/api/webhooks/asaas
```

Na tela de webhooks do Asaas, use:

- Nome do webhook: `Quero Ostra`
- URL do webhook: `https://seu-dominio.com/api/webhooks/asaas`
- Versão da API: `v3`
- Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_SECRET`
- Tipo de envio: `Não sequencial`
- Fila de sincronização: desativada no início
- Eventos: não use `Selecionar todos`; marque apenas os eventos de `Cobranças` abaixo

Eventos recomendados em `Cobranças`:

```text
PAYMENT_CONFIRMED
PAYMENT_RECEIVED
PAYMENT_OVERDUE
PAYMENT_REFUNDED
PAYMENT_DELETED
PAYMENT_REPROVED_BY_RISK_ANALYSIS
PAYMENT_CREDIT_CARD_CAPTURE_REFUSED
PAYMENT_CHARGEBACK_REQUESTED
PAYMENT_CHARGEBACK_DISPUTE
```

Não é necessário marcar notas fiscais, transferências, pague contas, antecipações, recargas, situação da conta, assinaturas, checkouts, Pix Automático, bloqueios de saldo, movimentações internas ou chaves de API.

A URL do webhook deve ser a URL pública da aplicação Next.js. Não use a URL do Supabase e não use `localhost`; para testes locais, use um túnel público e substitua `https://seu-dominio.com` pela URL do túnel.

Use o mesmo token de autenticação do webhook em `ASAAS_WEBHOOK_SECRET`. A aplicação valida o cabeçalho `asaas-access-token`, registra cada evento e ignora eventos duplicados por `event_id`.

As credenciais também podem ser cadastradas em `/admin/configuracoes`. Nesse caso, defina `SETTINGS_ENCRYPTION_KEY` com um segredo longo e estável; os valores são armazenados com AES-256-GCM e nunca retornam ao navegador.

## Segurança implementada

- preços e adicionais recalculados no servidor;
- validação Zod no checkout;
- verificação de data, estoque, CEP e pedido mínimo;
- idempotência por pedido;
- chaves Supabase e Asaas somente no servidor;
- RLS em todas as tabelas;
- clientes limitados aos próprios dados;
- role de administrador validada no servidor;
- logs de webhook e histórico de status.

## Rotas

- Públicas: `/`, `/cardapio`, `/produtos`, `/checkout`, `/login`, `/cadastro`
- Cliente: `/dashboard`, `/dashboard/pedidos`, `/dashboard/enderecos`, `/dashboard/perfil`
- Admin: `/admin`, `/admin/pedidos`, `/admin/produtos`, `/admin/usuarios`, `/admin/entregas`, `/admin/calendario`, `/admin/pagamentos`, `/admin/conteudos`, `/admin/configuracoes`

## Produção

Antes de aceitar pagamentos reais:

1. Use credenciais sandbox do Asaas e valide PIX e cartão.
2. Configure domínio e URLs de redirecionamento no Supabase Auth.
3. Revise as faixas de CEP, taxas, capacidade e horários no banco.
4. Configure SMTP transacional no Supabase.
5. Troque `ASAAS_ENVIRONMENT` para `production` somente após homologação.

## Deploy na Vercel

1. Importe o repositório GitHub na Vercel como projeto Next.js.
2. Configure as variáveis de ambiente em `Project Settings > Environment Variables`.
3. Use `NEXT_PUBLIC_SITE_URL` com o domínio público da Vercel ou domínio final.
4. Em produção, cadastre no Supabase Auth as URLs:

```text
https://seu-dominio.com/auth/callback
https://seu-dominio.com
```

5. No Asaas, use a URL pública da Vercel para o webhook:

```text
https://seu-dominio.com/api/webhooks/asaas
```

Variáveis necessárias na Vercel:

```env
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_WHATSAPP_NUMBER=
NEXT_PUBLIC_INSTAGRAM_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ASAAS_API_KEY=
ASAAS_ENVIRONMENT=sandbox
ASAAS_WEBHOOK_SECRET=
SETTINGS_ENCRYPTION_KEY=
```
