const Joi = require('@hapi/joi');

// let groupSchema = {
//   'id': '/Group',
//   'type': 'object',
//   'properties': {
//     'name': { 'type': 'string' },
//     'friendlyName': { 'type': 'string' },
//     'createdDate': {
//       'type': 'string',
//       'format': 'date'
//     },
//     'members': {
//       'type': 'array',
//       'items': { 'type': 'string' }
//     },
//     'pintsDonated': { 'type': 'integer' }
//   }
// }

let groupSchema = Joi.object().keys({
  name: Joi.string(),
  friendlyName: Joi.string(),
  createdDate: Joi.date(),
  members: Joi.array(),
  pintsDonated: Joi.number()
})

module.exports = {
  groupSchema: groupSchema
}