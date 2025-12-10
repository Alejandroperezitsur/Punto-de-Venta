const { logger } = require('../logger');

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Error interno';
  try { logger.error({ err, path: req.originalUrl, method: req.method, status }, message); } catch {}
  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
