const { PrismaClient } = require('@prisma/client');
const { logger } = require('./logger');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./data.db"
    }
  },
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    'info',
    'warn',
    'error',
  ],
});

prisma.$on('query', (e) => {
  // logger.debug('Query: ' + e.query);
  // logger.debug('Duration: ' + e.duration + 'ms');
});

// Legacy DB Adapter to ease migration (Partial Implementation)
// This allows some simpler queries to work, but ideally we should replace calls.
// Since 'better-sqlite3' was synchronous and Prisma is async, 
// we CANNOT simply wrap it perfectly without changing callsites to 'await'.
// So this module now exports the 'prisma' instance primarily.

module.exports = prisma;
