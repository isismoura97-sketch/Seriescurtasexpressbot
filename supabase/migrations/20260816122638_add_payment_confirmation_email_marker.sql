-- Marca o envio do e-mail transacional de confirmação sem misturá-lo
-- com a notificação de entrega no Telegram.

alter table public.payment_orders
  add column if not exists confirmation_email_sent_at timestamptz;

comment on column public.payment_orders.confirmation_email_sent_at is
  'Momento em que a confirmação de compra foi enviada ao e-mail do pedido.';
