import Joi from 'joi';

export const processPaymentSchema = Joi.object({
    jobId: Joi.string().required().messages({
      'any.required': 'Job ID is required',
    }),
    paymentMethodId: Joi.string()
      .pattern(/^pm_[a-zA-Z0-9]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Payment method ID must be a valid Stripe payment method ID',
        'any.required': 'Payment method ID is required',
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