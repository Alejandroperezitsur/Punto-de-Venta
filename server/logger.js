const pino = require('pino');

// Configuration for development vs production
const isDev = process.env.NODE_ENV !== 'production';

const transport = isDev ? {
    target: 'pino-pretty',
    options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
    }
} : undefined;

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    redact: {
        paths: ['req.headers.authorization', 'req.body.password', 'password', 'token'],
        remove: true
    },
    serializers: {
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
        err: pino.stdSerializers.err
    },
    base: {
        env: process.env.NODE_ENV
    }
}, transport);

module.exports = { logger };
