'use strict';
const { handleRecover, run } = require('../_auth');
module.exports = (req, res) => req.method === 'POST'
    ? run(handleRecover, req, res)
    : res.status(405).json({ error: 'Método não permitido.' });
