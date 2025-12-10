const pino = require('pino')
const transport = pino.transport({ target: 'pino-pretty', options: { colorize: true } })
const logger = pino(transport)
module.exports = { logger }
