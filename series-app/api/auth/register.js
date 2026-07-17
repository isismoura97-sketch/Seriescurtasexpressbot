'use strict';
const { handleRegister, run } = require('../_auth');
module.exports = (req, res) => req.method === 'POST'
    ? run(handleRegister, req, res)
    : res.status(405).json({ error: 'Método não permitido.' });
