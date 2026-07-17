'use strict';
const { handleSession, handleEstablish, run } = require('../_auth');
module.exports = (req, res) => {
    if (req.method === 'GET') return run(handleSession, req, res);
    if (req.method === 'POST') return run(handleEstablish, req, res);
    return res.status(405).json({ error: 'Método não permitido.' });
};
