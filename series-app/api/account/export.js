'use strict';

const { callAccountEdge, run } = require('../_auth');

module.exports = (req, res) => req.method === 'POST'
    ? run((request, response) => callAccountEdge(request, response, 'account-data-export'), req, res)
    : res.status(405).json({ error: 'Metodo nao permitido.' });
