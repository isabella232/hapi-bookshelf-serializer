var Joi = require('joi');

module.exports = {
  id: Joi.number().integer().required(),
  name: Joi.string().required(),
  default: Joi.number().default(Joi.ref('$headers.default')),
  object: Joi.string().optional().default('contextModel')
};
