import {
  normalizeWebhookStatus,
  validateApprovedPaymentForOrder,
  validateTelegramStarsPaymentForOrder,
} from "./index.ts";

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: esperado ${String(expected)}, recebido ${String(actual)}`);
  }
}

const order = {
  order_id: "order-123",
  mercado_pago_payment_id: "payment-456",
  amount: 5.90,
};

const approvedPayment = {
  id: "payment-456",
  status: "approved",
  external_reference: "order-123",
  transaction_amount: 5.90,
  currency_id: "BRL",
  captured: true,
};

Deno.test("pagamento autorizado permanece pendente ate a captura", () => {
  assertEquals(normalizeWebhookStatus("authorized"), "pending", "status autorizado");
  assertEquals(normalizeWebhookStatus("approved"), "approved", "status aprovado");
});

Deno.test("pagamento aprovado e conciliado pode liberar o pedido", () => {
  assertEquals(validateApprovedPaymentForOrder(order, approvedPayment), "", "pagamento valido");
});

Deno.test("conciliacao bloqueia valor divergente", () => {
  assertEquals(
    validateApprovedPaymentForOrder(order, { ...approvedPayment, transaction_amount: 1 }),
    "Valor pago diverge do valor do pedido",
    "valor divergente",
  );
});

Deno.test("conciliacao bloqueia moeda, captura e referencia invalidas", () => {
  assertEquals(
    validateApprovedPaymentForOrder(order, { ...approvedPayment, currency_id: "USD" }),
    "Moeda do pagamento invalida",
    "moeda invalida",
  );
  assertEquals(
    validateApprovedPaymentForOrder(order, { ...approvedPayment, captured: false }),
    "Pagamento ainda nao foi capturado",
    "captura pendente",
  );
  assertEquals(
    validateApprovedPaymentForOrder(order, { ...approvedPayment, external_reference: "outro-pedido" }),
    "Pagamento vinculado a outro pedido",
    "referencia invalida",
  );
});

Deno.test("pagamento sem referencia so e aceito quando o ID foi vinculado ao pedido", () => {
  const withoutReference = { ...approvedPayment, external_reference: "" };
  assertEquals(validateApprovedPaymentForOrder(order, withoutReference), "", "ID previamente vinculado");
  assertEquals(
    validateApprovedPaymentForOrder(
      { ...order, mercado_pago_payment_id: "outro-pagamento" },
      withoutReference,
    ),
    "Pagamento sem referencia confiavel ao pedido",
    "ID nao vinculado",
  );
});

const starsOrder = {
  order_id: "stars-order-123",
  user_id: "1048601631",
  payment_provider: "telegram_stars",
  provider_currency: "XTR",
  provider_amount: 50,
};

const starsPayment = {
  invoice_payload: "stars-order-123",
  currency: "XTR",
  total_amount: 50,
  telegram_payment_charge_id: "charge-123",
};

Deno.test("pagamento em Stars valido corresponde ao pedido e ao usuario", () => {
  assertEquals(
    validateTelegramStarsPaymentForOrder(starsOrder, starsPayment, "1048601631"),
    "",
    "pagamento Stars valido",
  );
});

Deno.test("pagamento em Stars bloqueia usuario, moeda, valor e pedido divergentes", () => {
  assertEquals(
    validateTelegramStarsPaymentForOrder(starsOrder, starsPayment, "999"),
    "Pagamento vinculado a outro usuario",
    "usuario divergente",
  );
  assertEquals(
    validateTelegramStarsPaymentForOrder(starsOrder, { ...starsPayment, currency: "BRL" }, "1048601631"),
    "Moeda da fatura invalida",
    "moeda divergente",
  );
  assertEquals(
    validateTelegramStarsPaymentForOrder(starsOrder, { ...starsPayment, total_amount: 5 }, "1048601631"),
    "Quantidade de Stars divergente",
    "valor divergente",
  );
  assertEquals(
    validateTelegramStarsPaymentForOrder(starsOrder, { ...starsPayment, invoice_payload: "outro" }, "1048601631"),
    "Fatura vinculada a outro pedido",
    "pedido divergente",
  );
});
