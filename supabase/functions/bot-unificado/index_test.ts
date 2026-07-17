import {
  buildAutomaticSeriesSeo,
  buildOwnerAnalyticsSnapshot,
  getCheckoutRecoverySkipReason,
  normalizeReferralCode,
  normalizeWebhookStatus,
  serializeCustomerExportSeries,
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

Deno.test("codigo de indicacao aceita somente formato seguro", () => {
  assertEquals(normalizeReferralCode(" ab12cd34 "), "AB12CD34", "codigo normalizado");
  assertEquals(normalizeReferralCode("curto"), "", "codigo curto bloqueado");
  assertEquals(normalizeReferralCode("ABCD-1234"), "", "separador bloqueado");
  assertEquals(normalizeReferralCode("<script>"), "", "conteudo inseguro bloqueado");
});

Deno.test("exportacao da conta omite referencias protegidas de midia", () => {
  const exported = serializeCustomerExportSeries({
    id: "serie-privada",
    title: "Serie Protegida",
    slug: "serie-protegida",
    price: 5.9,
    currency: "BRL",
    is_free: false,
    telegram_file_id: "file-id-secreto",
    video_storage_path: "videos/privado.mp4",
    video_url: "https://storage.example/privado.mp4",
  }) as Record<string, unknown>;

  assertEquals(exported.series_id, "serie-privada", "id da serie exportado");
  assertEquals(exported.access_type, "paid", "tipo de acesso exportado");
  assertEquals("telegram_file_id" in exported, false, "file id omitido");
  assertEquals("video_storage_path" in exported, false, "caminho protegido omitido");
  assertEquals("video_url" in exported, false, "url de video omitida");
});

Deno.test("SEO automatico usa dados reais e nao inventa campos opcionais", () => {
  const seo = buildAutomaticSeriesSeo({
    id: "serie-1",
    title: "A Prometida do Principe Vampiro",
    description: "Romance sobrenatural em uma corte de vampiros.",
    category: "Romance, Fantasia",
    cover_url: "https://example.com/capa.webp",
    language: "pt-BR",
    is_free: true,
    is_active: true,
    status: "published",
  }, "https://series.example.com");

  assertEquals(seo.slug, "a-prometida-do-principe-vampiro", "slug automatico");
  assertEquals(seo.title_mode, "automatic", "modo do titulo");
  assertEquals(seo.description_mode, "automatic", "modo da descricao");
  assertEquals(seo.canonical_url, "https://series.example.com/series/a-prometida-do-principe-vampiro", "canonical");
  assertEquals(seo.indexable, true, "pagina indexavel");
  assertEquals(seo.schema.isAccessibleForFree, true, "acesso gratuito real");
  assertEquals("offers" in seo.schema, false, "serie gratuita sem oferta paga");
  assertEquals("duration" in seo.schema, false, "duracao ausente nao inventada");
  assertEquals("alternateName" in seo.schema, false, "titulo alternativo ausente nao inventado");
  assertEquals("contentRating" in seo.schema, false, "classificacao ausente nao inventada");
});

Deno.test("SEO personalizado prevalece e serie paga recebe oferta real", () => {
  const seo = buildAutomaticSeriesSeo({
    id: "serie-2",
    title: "Noiva de 90 Dias da Mafia",
    slug: "noiva-mafia",
    seo_title: "Noiva da Mafia - Serie Curta",
    seo_description: "Descricao editorial aprovada.",
    og_title: "Noiva da Mafia no Telegram",
    canonical_url: "https://series.example.com/series/noiva-mafia",
    cover_url: "https://example.com/noiva.webp",
    price: 5.9,
    is_free: false,
    currency: "BRL",
    is_active: true,
    status: "published",
  }, "https://series.example.com");

  assertEquals(seo.title, "Noiva da Mafia - Serie Curta", "titulo personalizado");
  assertEquals(seo.description, "Descricao editorial aprovada.", "descricao personalizada");
  assertEquals(seo.og_title, "Noiva da Mafia no Telegram", "titulo social personalizado");
  assertEquals(seo.title_mode, "custom", "modo personalizado");
  assertEquals(seo.schema.offers?.price, "5.90", "preco real no schema");
  assertEquals(seo.schema.offers?.priceCurrency, "BRL", "moeda real no schema");
});

Deno.test("SEO exclui do indice quando publicacao ou sitemap bloqueiam acesso", () => {
  const hidden = buildAutomaticSeriesSeo({
    title: "Serie Oculta",
    is_active: true,
    status: "published",
    seo_sitemap_enabled: false,
  }, "https://series.example.com");
  const draft = buildAutomaticSeriesSeo({
    title: "Serie em Rascunho",
    is_active: true,
    status: "draft",
  }, "https://series.example.com");

  assertEquals(hidden.indexable, false, "sitemap desativado");
  assertEquals(hidden.robots, "noindex,nofollow", "robots bloqueado");
  assertEquals(draft.indexable, false, "rascunho nao indexavel");
});

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

Deno.test("funil calcula conversao, abandono ativo e resultado por serie", () => {
  const events = [
    { event_name: "app_opened", user_id: "u1", sales_channel: "telegram" },
    { event_name: "series_viewed", user_id: "u1", series_id: "s1", sales_channel: "telegram" },
    { event_name: "add_to_cart", user_id: "u1", series_id: "s1", sales_channel: "telegram" },
    { event_name: "checkout_started", user_id: "u1", sales_channel: "telegram" },
    { event_name: "purchase_completed", user_id: "u1", order_id: "o1", sales_channel: "telegram" },
    { event_name: "delivery_completed", user_id: "u1", order_id: "o1", sales_channel: "telegram" },
    { event_name: "app_opened", user_id: "u2", sales_channel: "telegram" },
    { event_name: "series_viewed", user_id: "u2", series_id: "s1", sales_channel: "telegram" },
    { event_name: "add_to_cart", user_id: "u2", series_id: "s1", sales_channel: "telegram" },
    { event_name: "cart_abandoned", user_id: "u2", sales_channel: "telegram" },
    { event_name: "checkout_abandoned", user_id: "u2", order_id: "o2", sales_channel: "telegram" },
    { event_name: "checkout_recovered", user_id: "u2", order_id: "o2", sales_channel: "telegram" },
  ];
  const snapshot = buildOwnerAnalyticsSnapshot(events, [{ order_id: "o1", series_id: "s1" }], 30);

  assertEquals(snapshot.funnel.purchase_completed, 1, "compras concluidas");
  assertEquals(snapshot.funnel.cart_abandoned, 1, "abandono ainda ativo");
  assertEquals(snapshot.conversion_rates.cart_to_checkout, 50, "conversao do carrinho");
  assertEquals(snapshot.conversion_rates.checkout_to_purchase, 100, "conversao do checkout");
  assertEquals(snapshot.cart_abandonment_rate, 50, "taxa de abandono");
  assertEquals(snapshot.funnel.checkout_abandoned, 1, "checkout abandonado");
  assertEquals(snapshot.funnel.checkout_recovered, 1, "checkout retomado");
  assertEquals(snapshot.conversion_rates.checkout_recovery, 100, "taxa de recuperacao");
  assertEquals(snapshot.channels.telegram.purchase_completed, 1, "compra por canal");
  assertEquals(snapshot.top_series[0]?.purchases, 1, "compra atribuida a serie");
  assertEquals(snapshot.top_series[0]?.views, 2, "visualizacoes atribuidas a serie");
});

Deno.test("compra posterior remove usuario do abandono ativo", () => {
  const snapshot = buildOwnerAnalyticsSnapshot([
    { event_name: "add_to_cart", user_id: "u1", series_id: "s1", sales_channel: "telegram" },
    { event_name: "cart_abandoned", user_id: "u1", sales_channel: "telegram" },
    { event_name: "checkout_started", user_id: "u1", sales_channel: "telegram" },
    { event_name: "purchase_completed", user_id: "u1", order_id: "o1", sales_channel: "telegram" },
  ]);

  assertEquals(snapshot.funnel.cart_abandoned, 0, "abandono resolvido");
  assertEquals(snapshot.cart_abandonment_rate, 0, "taxa corrigida apos compra");
});

Deno.test("recuperacao aceita apenas checkout pendente com consentimento", () => {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const preferences = {
    payments_enabled: true,
    purchases_enabled: true,
    releases_enabled: false,
    promotions_enabled: false,
    series_available_enabled: false,
    checkout_abandoned_enabled: true,
    referrals_enabled: false,
    marketing_enabled: false,
    notification_channel: "telegram" as const,
    bot_started_at: new Date().toISOString(),
    marketing_consented_at: null,
    recovery_consented_at: new Date().toISOString(),
  };
  const pendingOrder = {
    status: "pending_payment",
    payment_method: "telegram_checkout",
    checkout_url: "https://t.me/$invoice",
    checkout_expires_at: future,
  };

  assertEquals(getCheckoutRecoverySkipReason(pendingOrder, preferences), "", "checkout elegivel");
  assertEquals(
    getCheckoutRecoverySkipReason({ ...pendingOrder, status: "approved", paid_at: new Date().toISOString() }, preferences),
    "order_not_pending",
    "pedido pago bloqueado",
  );
  assertEquals(
    getCheckoutRecoverySkipReason(pendingOrder, { ...preferences, checkout_abandoned_enabled: false }),
    "recovery_not_authorized",
    "opt-out respeitado",
  );
  assertEquals(
    getCheckoutRecoverySkipReason({ ...pendingOrder, checkout_expires_at: "2020-01-01T00:00:00.000Z" }, preferences),
    "checkout_expired",
    "checkout expirado bloqueado",
  );
});
