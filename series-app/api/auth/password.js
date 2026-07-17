'use strict';
const { handlePassword, run } = require('../_auth');
module.exports = (req, res) => req.method === 'POST'
    ? run(handlePassword, req, res)
    : res.status(405).json({ error: 'Método não permitido.' });
