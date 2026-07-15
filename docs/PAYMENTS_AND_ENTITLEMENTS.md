# Pagamentos e acessos

## Canais

- Dentro do Telegram, bens digitais usam exclusivamente Telegram Stars (`XTR`).
- O backend cria a fatura, valida `pre_checkout_query` e somente libera o conteúdo após `successful_payment` conciliado.
- Mercado Pago permanece como provedor web. O retorno do navegador nunca concede acesso; a confirmação confiável vem do webhook assinado ou da consulta ao provedor.
- O checkout web autenticado ainda não foi aberto ao público porque o produto não possui identidade web independente. Fora do Telegram, a compra direciona para o bot para preservar a associação entre pessoa, pedido e entrega.

## Pedido unificado

`payment_orders` continua sendo a fonte de verdade e agora registra canal, provedor, moeda e identificadores externos. `payment_order_items` mantém o retrato normalizado de cada item sem remover o JSON legado, permitindo migração gradual.

Estados aprovados geram registros em `entitlements`. Acesso pago é concedido somente no backend e é revogado em reembolso ou chargeback. Consultas antigas a pedidos aprovados continuam como compatibilidade durante a transição.

## Idempotência

- Um checkout pendente equivalente, criado nos últimos 30 minutos, é reutilizado.
- A validação anterior ao pagamento bloqueia itens que o usuário já possui.
- O identificador de cobrança do Telegram possui índice único.
- Entregas preservam os itens já enviados e podem ser reprocessadas de forma segura no painel.
- Eventos repetidos de pagamento não recriam acesso nem reenviam itens concluídos.

## Operação

O comando `/paysupport` apresenta o canal de ajuda. Pedidos aprovados com entrega incompleta aparecem na fila da proprietária. O reprocessamento exige prova conciliada do Mercado Pago ou um identificador válido de cobrança em Stars.

## Conciliação e incidentes

1. Localize o pedido pelo `order_id` no painel.
2. Confirme provedor, moeda, valor e identificador externo.
3. Em Mercado Pago, consulte o pagamento antes de reprocessar.
4. Em Stars, confirme `telegram_payment_charge_id`, `XTR` e o valor em Stars.
5. Reprocesse apenas pedidos aprovados e não concluídos.
6. Em reembolso ou estorno, confirme que o entitlement foi revogado.

Nunca registre tokens, chaves, URLs privadas de vídeo ou payloads financeiros completos em tickets ou logs.

## Limites conhecidos

- O catálogo web é público, mas compras e biblioteca ainda usam Telegram como identidade validada.
- Pacotes ainda não participam do novo item normalizado.
- Recuperação automatizada de checkout exige preferência explícita de comunicação e será implementada em incremento separado.
