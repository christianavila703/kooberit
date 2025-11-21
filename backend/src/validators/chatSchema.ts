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
    .uri()
    .optional()
    .messages({
      'string.uri': 'File URL must be a valid URI',
    }),
});

/**
 * Validation schema for creating contractor contact
 */
export const createContractorContactSchema = Joi.object({
  jobPostId: Joi.string()
    .required()
    .messages({
      'any.required': 'Job post ID is required',
    }),
  paymentTransactionId: Joi.string()
    .optional()
    .messages({
      'string.base': 'Payment transaction ID must be a string',
    }),
});

