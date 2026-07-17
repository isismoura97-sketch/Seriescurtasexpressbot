'use strict';
const { callAccountEdge, run } = require('../_auth');
module.exports = (req, res) => req.method === 'POST'
    ? run((request, response) => callAccountEdge(request, response, 'favorite-sync'), req, res)
    : res.status(405).json({ error: 'Método não permitido.' });
