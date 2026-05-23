function isValidId(value) {
  const id = parseInt(value);
  return !isNaN(id) && id > 0;
}

function isValidDecimal(value) {
  if (value === undefined || value === null) return false;
  const num = Number(value);
  return !isNaN(num) && isFinite(num) && num >= 0;
}

function isValidPositiveInt(value) {
  const num = parseInt(value);
  return !isNaN(num) && num > 0;
}

function sanitizeString(value, maxLength = 255) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function parseAmount(value) {
  const num = Number(value) || 0;
  return Math.round(num * 100) / 100;
}

function validate(schema, data) {
  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} es requerido`);
      continue;
    }

    if (value === undefined || value === null || value === '') continue;

    if (rules.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) errors.push(`${field} debe ser un número`);
      else if (rules.min !== undefined && num < rules.min) errors.push(`${field} debe ser mayor o igual a ${rules.min}`);
      else if (rules.max !== undefined && num > rules.max) errors.push(`${field} debe ser menor o igual a ${rules.max}`);
    }

    if (rules.type === 'string') {
      if (typeof value !== 'string') errors.push(`${field} debe ser texto`);
      else if (rules.minLength && value.trim().length < rules.minLength) errors.push(`${field} debe tener al menos ${rules.minLength} caracteres`);
      else if (rules.maxLength && value.length > rules.maxLength) errors.push(`${field} debe tener máximo ${rules.maxLength} caracteres`);
    }

    if (rules.type === 'array') {
      if (!Array.isArray(value)) errors.push(`${field} debe ser una lista`);
      else if (rules.minItems && value.length < rules.minItems) errors.push(`${field} debe tener al menos ${rules.minItems} elemento(s)`);
    }

    if (rules.pattern && !rules.pattern.test(String(value))) {
      errors.push(`${field} tiene un formato inválido`);
    }
  }

  return errors;
}

module.exports = { isValidId, isValidDecimal, isValidPositiveInt, sanitizeString, parseAmount, validate };
