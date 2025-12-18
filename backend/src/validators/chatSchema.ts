import Joi from 'joi';

/**
 * Validation schema for sending a message
 */
export const sendMessageSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Message content cannot be empty',
      'string.max': 'Message content must not exceed 5000 characters',
      'any.required': 'Message content is required',
    }),
  type: Joi.string()
    .valid('text', 'image', 'file')
    .default('text')
    .messages({
      'any.only': 'Message type must be text, image, or file',
    }),
  fileUrl: Joi.string()
    .optional()
    .allow('')
    .custom((value, helpers) => {
      // Allow empty string, relative paths, or full URIs
      if (!value || value === '') {
        return value;
      }
      // Check if it's a relative path (starts with /) or a valid URI
      if (value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://')) {
        return value;
      }
      return helpers.error('string.invalid', { message: 'File URL must be a relative path (starting with /) or a valid URI' });
    })
    .messages({
      'string.invalid': 'File URL must be a relative path (starting with /) or a valid URI',
    }),
});

/**
 * Validation schema for creating contractor contact
 */
export const createContactSchema = Joi.object({
  jobId: Joi.string()
    .required()
    .messages({
      'any.required': 'Job ID is required',
    }),
  paymentTransactionId: Joi.string()
    .optional()
    .messages({
      'string.base': 'Payment transaction ID must be a string',
    }),
});

