const { body } = require('express-validator');

const saleRules = [
  body('items').isArray({ min: 1 }).withMessage('Items requeridos'),
  body('items.*.product_id').isInt({ gt: 0 }).withMessage('product_id inválido'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('quantity inválida'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('discount inválido'),
  body('payment_method').isString().isIn(['cash','card','transfer','credit']).withMessage('payment_method inválido'),
];

module.exports = { saleRules };

