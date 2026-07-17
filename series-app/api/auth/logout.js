'use strict';
const { handleLogout, run } = require('../_auth');
module.exports = (req, res) => req.method === 'POST'
    ? run(handleLogout, req, res)
    : res.status(405).json({ error: 'Método não permitido.' });
