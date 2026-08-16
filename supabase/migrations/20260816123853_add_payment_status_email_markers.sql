-- Marcadores separados para falha e encerramento financeiro do pedido.

alter table public.payment_orders
  add column if not exists payment_failure_email_sent_at timestamptz,
  add column if not exists payment_refund_email_sent_at timestamptz;

comment on column public.payment_orders.payment_failure_email_sent_at is
  'Momento em que a notificação de falha do pagamento foi enviada.';
comment on column public.payment_orders.payment_refund_email_sent_at is
  'Momento em que a notificação de reembolso ou chargeback foi enviada.';
