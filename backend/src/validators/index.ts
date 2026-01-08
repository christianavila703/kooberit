import Joi from 'joi';

export * from './authSchema';
export * from './userSchema';
export * from './jobSchema'; // Keep filename for now, but exports renamed schemas
export * from './chatSchema';
export * from './paymentSchema';
export * from './profileSchema';
export * from './bidSchema';

/**
 * Global
 */
const idSchema = Joi.object({
  id: Joi.string()
    .length(24)
    .hex()
    .required()
    .messages({
      'string.length': 'Id must be a valid 24 character hex string',
      'string.hex': 'Id must be a valid Mongo ObjectId',
    }),
});

export {
    idSchema
}