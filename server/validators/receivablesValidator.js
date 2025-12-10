const { body } = require('express-validator');

const receivablePayRules = [
  body('amount').isFloat({ gt: 0 }).withMessage('Monto inválido')
];

module.exports = { receivablePayRules };

