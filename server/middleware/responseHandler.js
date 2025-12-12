const responseHandler = (req, res, next) => {
    res.jsonResponse = (data, meta = {}) => {
        res.json({
            data,
            error: null,
            meta
        });
    };

    res.jsonError = (message, status = 500, code = null) => {
        res.status(status).json({
            data: null,
            error: { message, code }
        });
    };

    next();
};

module.exports = { responseHandler };
