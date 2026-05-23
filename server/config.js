const allowedOrigins = [
  'http://localhost:5173',
];

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

function ensureConfig() {
  if (!JWT_SECRET || String(JWT_SECRET).trim() === '') {
    throw new Error('JWT_SECRET must be defined in environment variables');
  }
  if (NODE_ENV === 'production') {
    if (JWT_SECRET === 'dev-secret-change-in-production-please') {
      throw new Error('JWT_SECRET must be changed from default for production');
    }
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgresql')) {
      throw new Error('Production requires PostgreSQL DATABASE_URL');
    }
    const requiredEnvs = ['JWT_SECRET', 'DATABASE_URL'];
    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        throw new Error(`Missing required environment variable: ${env}`);
      }
    }
  }
}

module.exports = { allowedOrigins, JWT_SECRET, ensureConfig, NODE_ENV };
