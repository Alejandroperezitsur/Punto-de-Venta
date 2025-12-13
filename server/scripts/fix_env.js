const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const content = `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pos_saas?schema=public"\nJWT_SECRET="supersecretkey_change_in_production"\nPORT=3001`;

fs.writeFileSync(envPath, content);
console.log('.env updated');
