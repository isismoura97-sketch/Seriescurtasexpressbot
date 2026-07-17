'use strict';
const { handleLogin, run } = require('../_auth');
module.exports = (req, res) => req.method === 'POST'
    ? run(handleLogin, req, res)
    : res.status(405).json({ error: 'Método não permitido.' });
