const pino = require('pino');
const fs = require('fs');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

const transport = isDev
  ? pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  })
  : pino.destination({ sync: false });

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
    env: process.env.NODE_ENV || 'development'
  }
}, transport);

module.exports = { logger };
