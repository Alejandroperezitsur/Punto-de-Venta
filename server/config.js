const allowedOrigins = [
  'http://localhost:5173',
];

const JWT_SECRET = process.env.JWT_SECRET;

function ensureConfig() {
  if (!JWT_SECRET || String(JWT_SECRET).trim() === '') {
    throw new Error('JWT_SECRET debe estar definido en variables de entorno');
  }
}

module.exports = { allowedOrigins, JWT_SECRET, ensureConfig };

