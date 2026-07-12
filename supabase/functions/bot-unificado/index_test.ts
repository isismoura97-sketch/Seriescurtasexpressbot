import {
  normalizeWebhookStatus,
  validateApprovedPaymentForOrder,
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
