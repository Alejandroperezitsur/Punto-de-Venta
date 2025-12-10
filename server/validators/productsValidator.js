const { body } = require('express-validator');

const productCreateRules = [
  body('name').isString().trim().notEmpty().withMessage('Nombre requerido'),
  body('sku').optional().isString().trim(),
  body('price').isFloat({ gt: 0 }).withMessage('Precio inválido'),
  body('stock').optional().isFloat({ min: 0 }),
];

const productUpdateRules = [
  body('name').optional().isString().trim(),
  body('sku').optional().isString().trim(),
  body('price').optional().isFloat({ gt: 0 }),
  body('stock').optional().isFloat({ min: 0 }),
];

module.exports = { productCreateRules, productUpdateRules };

