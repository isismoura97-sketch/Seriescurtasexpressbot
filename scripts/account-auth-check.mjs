import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';

const require = createRequire(import.meta.url);
const { callAccountEdge, handleLogin, handlePassword, handleRegister, run } = require('../series-app/api/_auth.js');

function makeRequest(body, origin = 'https://series.example') {
    return {
        method: 'POST',
        body,
        headers: {
            host: 'series.example',
            origin,
            'x-forwarded-host': 'series.example',
            'x-forwarded-proto': 'https',
            'content-type': 'application/json',
        },
    };
}

function makeResponse() {
    return {
        statusCode: 200,
        headers: {},
        payload: null,
        setHeader(name, value) {
            this.headers[String(name).toLowerCase()] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(value) {
            this.payload = value;
            return this;
        },
    };
}

const originalFetch = globalThis.fetch;

try {
    let capturedSignup = null;
    globalThis.fetch = async (url, init = {}) => {
        capturedSignup = { url: String(url), body: JSON.parse(String(init.body || '{}')) };
        return Response.json({ id: 'account-id', email: 'cliente@example.com' }, { status: 200 });
    };
    const registerResponse = makeResponse();
    await run(handleRegister, makeRequest({
        full_name: 'Cliente Teste',
        email: 'CLIENTE@example.com',
        password: 'senha-forte-123',
        terms_accepted: true,
        privacy_accepted: true,
    }), registerResponse);
    assert.equal(registerResponse.statusCode, 201);
    assert.equal(registerResponse.payload.requires_email_verification, true);
    assert.equal(capturedSignup.body.email, 'cliente@example.com');
    assert.equal(capturedSignup.body.data.terms_accepted, true);
    assert.match(capturedSignup.url, /signup\?redirect_to=/);

    const tokenPayload = {
        access_token: 'access-secret',
        refresh_token: 'refresh-secret',
        expires_in: 3600,
        user: { id: 'account-id', email_confirmed_at: '2026-07-16T00:00:00Z' },
    };
    globalThis.fetch = async (url) => {
        const value = String(url);
        if (value.includes('/auth/v1/token')) return Response.json(tokenPayload);
        if (value.includes('/customer_accounts')) return Response.json([{
            id: 'account-id',
            full_name: 'Cliente Teste',
            email: 'cliente@example.com',
            status: 'active',
            email_verified_at: '2026-07-16T00:00:00Z',
        }]);
        if (value.includes('/customer_telegram_links')) return Response.json([]);
        if (value.includes('/customer_account_consents')) return Response.json([]);
        throw new Error(`URL inesperada no teste: ${value}`);
    };
    const loginResponse = makeResponse();
    await run(handleLogin, makeRequest({ email: 'cliente@example.com', password: 'senha-forte-123' }), loginResponse);
    assert.equal(loginResponse.statusCode, 200);
    assert.equal(loginResponse.payload.authenticated, true);
    assert.equal(JSON.stringify(loginResponse.payload).includes('access-secret'), false);
    assert.equal(JSON.stringify(loginResponse.payload).includes('refresh-secret'), false);
    assert.equal(Array.isArray(loginResponse.headers['set-cookie']), true);
    assert.equal(loginResponse.headers['set-cookie'].length, 2);
    loginResponse.headers['set-cookie'].forEach((cookie) => {
        assert.match(cookie, /HttpOnly/);
        assert.match(cookie, /SameSite=Lax/);
        assert.match(cookie, /Secure/);
    });

    const rejectedResponse = makeResponse();
    await run(handleLogin, makeRequest({ email: 'cliente@example.com', password: 'senha-forte-123' }, 'https://attacker.example'), rejectedResponse);
    assert.equal(rejectedResponse.statusCode, 403);

    const ordinarySessionPasswordResponse = makeResponse();
    await run(handlePassword, makeRequest({ password: 'nova-senha-forte-123' }), ordinarySessionPasswordResponse);
    assert.equal(ordinarySessionPasswordResponse.statusCode, 403);

    let capturedEdgeRequest = null;
    globalThis.fetch = async (url, init = {}) => {
        const value = String(url);
        if (value.includes('/auth/v1/user')) {
            return Response.json({ id: 'account-id', email_confirmed_at: '2026-07-16T00:00:00Z' });
        }
        if (value.includes('/functions/v1/bot-unificado/api?action=cart-sync')) {
            capturedEdgeRequest = { url: value, headers: init.headers, body: JSON.parse(String(init.body || '{}')) };
            return Response.json({ ok: true, cart: { item_ids: ['series-1'] } });
        }
        throw new Error(`URL inesperada no teste: ${value}`);
    };
    const proxyRequest = makeRequest({ operation: 'load' });
    proxyRequest.headers.cookie = 'sce_access=access-secret';
    const proxyResponse = makeResponse();
    await run((request, response) => callAccountEdge(request, response, 'cart-sync'), proxyRequest, proxyResponse);
    assert.equal(proxyResponse.statusCode, 200);
    assert.equal(proxyResponse.payload.cart.item_ids[0], 'series-1');
    assert.equal(capturedEdgeRequest.body.operation, 'load');
    assert.equal(capturedEdgeRequest.headers.authorization, 'Bearer access-secret');
    assert.equal(JSON.stringify(proxyResponse.payload).includes('access-secret'), false);

    console.log(JSON.stringify({ ok: true, checks: 23 }, null, 2));
} finally {
    globalThis.fetch = originalFetch;
}
