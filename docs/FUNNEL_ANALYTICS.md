# Analytics do funil

## Objetivo

O funil mede somente eventos reais registrados pelo Mini App e pelo backend. Ele não cria visualizações, compras ou conversões estimadas.

## Etapas

1. `app_opened`
2. `series_viewed`
3. `add_to_cart`
4. `checkout_started`
5. `payment_created`
6. `payment_approved` e `purchase_completed`
7. `delivery_completed`

Falhas, reembolsos e chargebacks usam eventos separados. O painel calcula as taxas entre etapas por usuários únicos nos últimos 30 dias.

## Idempotência

Eventos do cliente recebem um `event_id`. Eventos terminais vinculados a pedidos possuem unicidade por `event_name` e `order_id`. Replays de webhook e tentativas repetidas de entrega não aumentam artificialmente o funil.

## Abandono

O Mini App registra `cart_abandoned` depois de 30 minutos sem alteração. A mesma versão do carrinho é registrada apenas uma vez. Se o usuário comprar depois, ele deixa de ser contado como abandono ativo no resumo do período.

## Privacidade e acesso

- A identidade vem do `initData` do Telegram validado no backend.
- Metadados são limitados a valores escalares e tamanhos curtos.
- A tabela `app_events` possui RLS e não aceita acesso direto de `anon` ou `authenticated`.
- O painel retorna apenas agregados; IDs individuais não são mostrados na interface.

## Limitação atual

Eventos identificados são coletados no fluxo autenticado do Telegram. A navegação web pública permanece sem rastreamento individual até existir uma identidade web e consentimento apropriados.
