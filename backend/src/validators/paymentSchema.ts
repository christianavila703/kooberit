import Joi from 'joi';

export const processPaymentSchema = Joi.object({
    jobPostId: Joi.string().required().messages({
      'any.required': 'Job post ID is required',
    }),
    cardNumber: Joi.string()
      .pattern(/^\d{13,19}$/)
      .required()
      .messages({
        'string.pattern.base': 'Card number must be 13-19 digits',
        'any.required': 'Card number is required',
      }),
    expiryDate: Joi.string()
      .pattern(/^\d{2}\/\d{2}$/)
      .required()
      .messages({
        'string.pattern.base': 'Expiry date must be in MM/YY format',
        'any.required': 'Expiry date is required',
      }),
    cvv: Joi.string()
      .pattern(/^\d{3,4}$/)
      .required()
      .messages({
        'string.pattern.base': 'CVV must be 3-4 digits',
        'any.required': 'CVV is required',
      }),
    cardholderName: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Cardholder name must be at least 2 characters',
      'string.max': 'Cardholder name must not exceed 100 characters',
      'any.required': 'Cardholder name is required',
    }),
    saveCard: Joi.boolean().optional(),
});

export const paymentIntentIdSchema = Joi.object({
    paymentIntentId: Joi.string().required().messages({
      'any.required': 'Payment intent ID is required',
    }),
});