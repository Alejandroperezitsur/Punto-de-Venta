const { v4: uuidv4 } = require('uuid');
const { logger } = require('../logger');

function requestId(req, res, next) {
    const id = req.headers['x-request-id'] || uuidv4();
    req.id = id;
    res.setHeader('X-Request-ID', id);

    // Attach child logger to request for context
    req.log = logger.child({
        reqId: id,
        storeId: req.user?.storeId || 'anonymous' // Will be updated after auth
    });

    next();
}

module.exports = { requestId };
