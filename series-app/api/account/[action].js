'use strict';

const { callAccountEdge, run } = require('../_auth');

const ACCOUNT_ACTIONS = Object.freeze({
    cart: { edgeAction: 'cart-sync' },
    coupon: { edgeAction: 'coupon-validate' },
    delete: { edgeAction: 'account-delete', clearSessionOnSuccess: true },
    export: { edgeAction: 'account-data-export' },
    favorite: { edgeAction: 'favorite-sync' },
    notifications: { edgeAction: 'notification-preferences' },
    overview: { edgeAction: 'customer-area' },
});

module.exports = (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido.' });
    const action = String(req.query?.action || '').trim().toLowerCase();
    const route = ACCOUNT_ACTIONS[action];
    if (!route) return res.status(404).json({ error: 'Acao de conta nao encontrada.' });
    return run((request, response) => callAccountEdge(request, response, route.edgeAction, {
        clearSessionOnSuccess: route.clearSessionOnSuccess === true,
    }), req, res);
};
