const { body } = require('express-validator');

const customersCreateRules = [
  body('name').isString().trim().notEmpty().withMessage('Nombre requerido'),
  body('phone').optional().isString().trim(),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('rfc').optional().isString().trim(),
];

const customersUpdateRules = [
  body('name').optional().isString().trim(),
  body('phone').optional().isString().trim(),
  body('email').optional().isEmail(),
  body('rfc').optional().isString().trim(),
];

module.exports = { customersCreateRules, customersUpdateRules };

