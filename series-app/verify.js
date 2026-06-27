const API_URL = 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api';

const DOM = {
  question: document.getElementById('captchaQuestion'),
  answer: document.getElementById('captchaAnswer'),
  button: document.getElementById('verifyBtn'),
  status: document.getElementById('status'),
  subtitle: document.getElementById('subtitle'),
  timerMeta: document.getElementById('timerMeta')
};

const tg = window.Telegram?.WebApp ?? null;
const params = new URLSearchParams(window.location.search);
const token = params.get('token') || '';

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodePublicToken(rawToken) {
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(rawToken)));
  if (!payload || typeof payload !== 'object') throw new Error('Token inválido');
  return payload;
}

function setStatus(message, type = 'info') {
  if (!DOM.status) return;
  DOM.status.textContent = message;
  DOM.status.className = `status ${type === 'good' ? 'good' : type === 'bad' ? 'bad' : ''}`.trim();
}

function formatTimeLeft(exp) {
  if (!exp) return '';
  const seconds = Math.max(0, exp - Math.floor(Date.now() / 1000));
  if (seconds <= 0) return 'expirado';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder.toString().padStart(2, '0')}s` : `${remainder}s`;
}

function closeWebAppSoon() {
  setTimeout(() => {
    if (tg && typeof tg.close === 'function') {
      tg.close();
    }
  }, 1400);
}

async function submitCaptcha() {
  const answer = String(DOM.answer?.value || '').trim();
  if (!answer) {
    setStatus('Digite a resposta do desafio.', 'bad');
    return;
  }

  if (!token) {
    setStatus('Link de verificação inválido.', 'bad');
    return;
  }

  if (DOM.button) DOM.button.disabled = true;
  setStatus('Verificando...', 'info');

  try {
    const res = await fetch(`${API_URL}?action=captcha-verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token,
        answer,
        initData: tg?.initData || ''
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    setStatus('Aprovado. Você já pode entrar no canal.', 'good');
    if (DOM.subtitle) {
      DOM.subtitle.textContent = 'Sua verificação foi aceita. Esta janela será fechada em instantes.';
    }
    closeWebAppSoon();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao verificar';
    setStatus(message, 'bad');
    if (DOM.button) DOM.button.disabled = false;
  }
}

function init() {
  if (tg) {
    tg.ready();
    tg.expand();
  }

  if (!token) {
    setStatus('Abra esta tela pelo link de verificação.', 'bad');
    if (DOM.button) DOM.button.disabled = true;
    return;
  }

  try {
    const payload = decodePublicToken(token);
    if (DOM.question) DOM.question.textContent = payload.q || 'Resolva o desafio';
    if (DOM.timerMeta && payload.exp) {
      DOM.timerMeta.textContent = `Expira em ${formatTimeLeft(Number(payload.exp))}`;
      setInterval(() => {
        if (DOM.timerMeta) {
          DOM.timerMeta.textContent = `Expira em ${formatTimeLeft(Number(payload.exp))}`;
        }
      }, 1000);
    }
  } catch (error) {
    setStatus('Não foi possível carregar o desafio.', 'bad');
    if (DOM.button) DOM.button.disabled = true;
    return;
  }

  DOM.button?.addEventListener('click', submitCaptcha);
  DOM.answer?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitCaptcha();
    }
  });
}

init();
