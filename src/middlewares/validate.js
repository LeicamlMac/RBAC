const AppError = require('../utils/AppError');

/**
 * Valida req[source] com um schema Joi e substitui pelo valor normalizado.
 * @param {import('joi').Schema} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const { value, error } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      return next(AppError.badRequest('Dados inválidos', error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }))));
    }
    if (source === 'query') {
      // query normalizada (defaults/conversões aplicados) fica em req.validatedQuery
      req.validatedQuery = value;
    } else {
      req[source] = value;
    }
    next();
  };
}

module.exports = validate;
