const Joi = require('@hapi/joi');

function validate(data, schema) {
  console.log(data);
  let result = Joi.validate(data, schema);
  console.log(result);
  return !result.error
}

module.exports = {
  validate: validate
}