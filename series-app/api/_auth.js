'use strict';

const ACCESS_COOKIE = 'sce_access';
const REFRESH_COOKIE = 'sce_refresh';
const RECOVERY_COOKIE = 'sce_recovery';
const TERMS_VERSION = '2026-07-16';
const PRIVACY_VERSION = '2026-07-16';

function getConfig() {
    const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const key = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '');
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || !key) {
        throw new Error('AUTH_NOT_CONFIGURED');
    }
    return { url, key };
}

function setPrivateHeaders(res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
}

function sendJson(res, status, payload) {
    setPrivateHeaders(res);
    return res.status(status).json(payload);
}

function parseCookies(req) {
    const header = String(req.headers.cookie || '');
    return header.split(';').reduce((cookies, part) => {
        const separator = part.indexOf('=');
        if (separator < 1) return cookies;
        const name = part.slice(0, separator).trim();
        const value = part.slice(separator + 1).trim();
        try {
            cookies[name] = decodeURIComponent(value);
        } catch {
            cookies[name] = value;
        }
        return cookies;
    }, {});
}

function getRequestOrigin(req) {
    const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    return host ? `${protocol}://${host}` : '';
}

function assertSameOrigin(req) {
    const expected = getRequestOrigin(req);
    const received = String(req.headers.origin || '');
    if (!expected || !received || received !== expected) {
        const error = new Error('ORIGIN_REJECTED');
        error.statusCode = 403;
        throw error;
    }
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (!contentType.startsWith('application/json')) {
        const error = new Error('CONTENT_TYPE_REJECTED');
        error.statusCode = 415;
        throw error;
    }
}

function readJsonBody(req) {
    const body = req.body;
    if (!body) return {};
    if (typeof body === 'object' && !Buffer.isBuffer(body)) return body;
    const raw = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
    if (Buffer.byteLength(raw, 'utf8') > 32768) {
        const error = new Error('BODY_TOO_LARGE');
        error.statusCode = 413;
        throw error;
    }
    try {
        return JSON.parse(raw);
    } catch {
        const error = new Error('INVALID_JSON');
        error.statusCode = 400;
        throw error;
    }
}

async function authRequest(path, init = {}) {
    const { url, key } = getConfig();
    const response = await fetch(`${url}/auth/v1/${path}`, {
        ...init,
        headers: {
            apikey: key,
            accept: 'application/json',
            'content-type': 'application/json',
            ...(init.headers || {}),
        },
    });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
}

function cookieAttributes(req, maxAge) {
    const secure = getRequestOrigin(req).startsWith('https://');
    return [
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        secure ? 'Secure' : '',
        'Priority=High',
        `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
    ].filter(Boolean).join('; ');
}

function setSessionCookies(req, res, session) {
    const accessToken = String(session?.access_token || '');
    const refreshToken = String(session?.refresh_token || '');
    if (!accessToken || !refreshToken) return;
    const expiresIn = Math.max(300, Number(session.expires_in || 3600));
    res.setHeader('Set-Cookie', [
        `${ACCESS_COOKIE}=${encodeURIComponent(accessToken)}; ${cookieAttributes(req, expiresIn)}`,
        `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}; ${cookieAttributes(req, 31536000)}`,
    ]);
}

function clearSessionCookies(req, res) {
    res.setHeader('Set-Cookie', [
        `${ACCESS_COOKIE}=; ${cookieAttributes(req, 0)}`,
        `${REFRESH_COOKIE}=; ${cookieAttributes(req, 0)}`,
        `${RECOVERY_COOKIE}=; ${cookieAttributes(req, 0)}`,
    ]);
}

async function validateAccessToken(accessToken) {
    if (!accessToken) return null;
    const { response, payload } = await authRequest('user', {
        method: 'GET',
        headers: { authorization: `Bearer ${accessToken}` },
    });
    return response.ok && payload?.id ? payload : null;
}

async function resolveSession(req, res) {
    const cookies = parseCookies(req);
    let accessToken = String(cookies[ACCESS_COOKIE] || '');
    let user = await validateAccessToken(accessToken);
    if (user) return { accessToken, user };

    const refreshToken = String(cookies[REFRESH_COOKIE] || '');
    if (!refreshToken) return null;
    const { response, payload } = await authRequest('token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok || !payload?.access_token || !payload?.user?.id) {
        clearSessionCookies(req, res);
        return null;
    }
    setSessionCookies(req, res, payload);
    accessToken = String(payload.access_token);
    user = payload.user;
    return { accessToken, user };
}

async function fetchAccountSnapshot(accessToken, user) {
    const { url, key } = getConfig();
    const headers = {
        apikey: key,
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
    };
    const accountId = encodeURIComponent(String(user.id));
    const [accountResponse, linkResponse, consentResponse] = await Promise.all([
        fetch(`${url}/rest/v1/customer_accounts?select=id,full_name,email,status,email_verified_at,created_at&id=eq.${accountId}&limit=1`, { headers }),
        fetch(`${url}/rest/v1/customer_telegram_links?select=telegram_user_id,telegram_username,linked_at,last_verified_at&account_id=eq.${accountId}&limit=1`, { headers }),
        fetch(`${url}/rest/v1/customer_account_consents?select=document_type,document_version,action,accepted_at&account_id=eq.${accountId}&order=accepted_at.desc`, { headers }),
    ]);
    if (!accountResponse.ok || !linkResponse.ok || !consentResponse.ok) {
        throw new Error('ACCOUNT_READ_FAILED');
    }
    const [accounts, links, consents] = await Promise.all([
        accountResponse.json(),
        linkResponse.json(),
        consentResponse.json(),
    ]);
    return {
        account: Array.isArray(accounts) ? accounts[0] || null : null,
        telegram_link: Array.isArray(links) ? links[0] || null : null,
        consents: Array.isArray(consents) ? consents : [],
        email_verified: Boolean(user.email_confirmed_at),
    };
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeAuthError(payload, fallback) {
    const code = String(payload?.error_code || payload?.code || '').toLowerCase();
    if (code === 'email_exists' || code === 'user_already_exists') return 'Não foi possível concluir o cadastro com esses dados.';
    if (code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar.';
    if (code === 'over_email_send_rate_limit') return 'Aguarde alguns minutos antes de solicitar outro e-mail.';
    if (code === 'weak_password') return 'Use uma senha mais forte, com pelo menos 8 caracteres.';
    return fallback;
}

async function handleRegister(req, res) {
    assertSameOrigin(req);
    const body = readJsonBody(req);
    const fullName = normalizeName(body.full_name);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (fullName.length < 2 || fullName.length > 120) return sendJson(res, 400, { error: 'Informe seu nome completo.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return sendJson(res, 400, { error: 'Informe um e-mail válido.' });
    if (password.length < 8 || password.length > 128) return sendJson(res, 400, { error: 'A senha deve ter entre 8 e 128 caracteres.' });
    if (body.terms_accepted !== true || body.privacy_accepted !== true) {
        return sendJson(res, 400, { error: 'Aceite os Termos de Uso e a Política de Privacidade.' });
    }

    const redirectTo = `${getRequestOrigin(req)}/minha-conta`;
    const { response, payload } = await authRequest(`signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: 'POST',
        body: JSON.stringify({
            email,
            password,
            data: {
                full_name: fullName,
                terms_accepted: true,
                terms_version: TERMS_VERSION,
                privacy_accepted: true,
                privacy_version: PRIVACY_VERSION,
            },
        }),
    });
    if (!response.ok) {
        return sendJson(res, response.status === 429 ? 429 : 400, {
            error: normalizeAuthError(payload, 'Não foi possível concluir o cadastro com esses dados.'),
        });
    }
    if (payload?.access_token && payload?.refresh_token) setSessionCookies(req, res, payload);
    return sendJson(res, 201, {
        ok: true,
        requires_email_verification: !payload?.access_token,
        message: payload?.access_token
            ? 'Conta criada com sucesso.'
            : 'Conta criada. Confirme o e-mail enviado para continuar.',
    });
}

async function handleLogin(req, res) {
    assertSameOrigin(req);
    const body = readJsonBody(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (!email || !password) return sendJson(res, 400, { error: 'Informe e-mail e senha.' });
    const { response, payload } = await authRequest('token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok || !payload?.access_token || !payload?.refresh_token) {
        return sendJson(res, response.status === 429 ? 429 : 401, {
            error: normalizeAuthError(payload, 'E-mail ou senha inválidos.'),
        });
    }
    setSessionCookies(req, res, payload);
    const snapshot = await fetchAccountSnapshot(payload.access_token, payload.user);
    return sendJson(res, 200, { ok: true, authenticated: true, ...snapshot });
}

async function handleSession(req, res) {
    const session = await resolveSession(req, res);
    if (!session) return sendJson(res, 200, { ok: true, authenticated: false });
    const snapshot = await fetchAccountSnapshot(session.accessToken, session.user);
    return sendJson(res, 200, { ok: true, authenticated: true, ...snapshot });
}

async function handleEstablish(req, res) {
    assertSameOrigin(req);
    const body = readJsonBody(req);
    const accessToken = String(body.access_token || '');
    const refreshToken = String(body.refresh_token || '');
    const user = await validateAccessToken(accessToken);
    if (!user || !refreshToken) return sendJson(res, 401, { error: 'Link de autenticação inválido ou expirado.' });
    setSessionCookies(req, res, {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: Number(body.expires_in || 3600),
    });
    if (String(body.type || '').toLowerCase() === 'recovery') {
        const currentCookies = res.getHeader?.('Set-Cookie') || res.headers?.['set-cookie'] || [];
        const cookieList = Array.isArray(currentCookies) ? currentCookies : [currentCookies];
        res.setHeader('Set-Cookie', [
            ...cookieList.filter(Boolean),
            `${RECOVERY_COOKIE}=1; ${cookieAttributes(req, 900)}`,
        ]);
    }
    return sendJson(res, 200, { ok: true, authenticated: true });
}

async function handleLogout(req, res) {
    assertSameOrigin(req);
    const session = await resolveSession(req, res);
    if (session?.accessToken) {
        await authRequest('logout?scope=local', {
            method: 'POST',
            headers: { authorization: `Bearer ${session.accessToken}` },
            body: '{}',
        }).catch(() => null);
    }
    clearSessionCookies(req, res);
    return sendJson(res, 200, { ok: true });
}

async function handleRecover(req, res) {
    assertSameOrigin(req);
    const body = readJsonBody(req);
    const email = normalizeEmail(body.email);
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const redirectTo = `${getRequestOrigin(req)}/minha-conta?auth=recovery`;
        await authRequest(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        }).catch(() => null);
    }
    return sendJson(res, 200, {
        ok: true,
        message: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.',
    });
}

async function handlePassword(req, res) {
    assertSameOrigin(req);
    const body = readJsonBody(req);
    const password = String(body.password || '');
    if (password.length < 8 || password.length > 128) {
        return sendJson(res, 400, { error: 'A senha deve ter entre 8 e 128 caracteres.' });
    }
    const cookies = parseCookies(req);
    if (cookies[RECOVERY_COOKIE] !== '1') {
        return sendJson(res, 403, { error: 'Solicite um novo link de recuperação para alterar a senha.' });
    }
    const session = await resolveSession(req, res);
    if (!session) return sendJson(res, 401, { error: 'Sua sessão expirou. Solicite um novo link.' });
    const { response, payload } = await authRequest('user', {
        method: 'PUT',
        headers: { authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ password }),
    });
    if (!response.ok) return sendJson(res, 400, { error: normalizeAuthError(payload, 'Não foi possível alterar a senha.') });
    const currentCookies = res.getHeader?.('Set-Cookie') || res.headers?.['set-cookie'] || [];
    const cookieList = Array.isArray(currentCookies) ? currentCookies : [currentCookies];
    res.setHeader('Set-Cookie', [
        ...cookieList.filter(Boolean),
        `${RECOVERY_COOKIE}=; ${cookieAttributes(req, 0)}`,
    ]);
    return sendJson(res, 200, { ok: true, message: 'Senha atualizada com sucesso.' });
}

async function callAccountEdge(req, res, action) {
    assertSameOrigin(req);
    const session = await resolveSession(req, res);
    if (!session) return sendJson(res, 401, { error: 'Entre na sua conta para continuar.', code: 'account_auth_required' });
    const body = readJsonBody(req);
    const { url, key } = getConfig();
    const response = await fetch(`${url}/functions/v1/bot-unificado/api?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        headers: {
            apikey: key,
            authorization: `Bearer ${session.accessToken}`,
            accept: 'application/json',
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    return sendJson(res, response.status, payload);
}

async function run(handler, req, res) {
    setPrivateHeaders(res);
    try {
        return await handler(req, res);
    } catch (error) {
        const status = Number(error?.statusCode || 500);
        const message = status < 500 ? 'Requisição inválida.' : 'Não foi possível acessar sua conta agora.';
        return sendJson(res, status, { error: message });
    }
}

module.exports = {
    handleRegister,
    handleLogin,
    handleSession,
    handleEstablish,
    handleLogout,
    handleRecover,
    handlePassword,
    callAccountEdge,
    run,
};
