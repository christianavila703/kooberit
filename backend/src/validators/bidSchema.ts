import Joi from 'joi';

/**
 * Validation schema for creating a bid
 */
export const createBidSchema = Joi.object({
  jobId: Joi.string()
    .length(24)
    .hex()
    .required()
    .messages({
      'string.length': 'Job ID must be a valid 24 character hex string',
      'string.hex': 'Job ID must be a valid Mongo ObjectId',
      'any.required': 'Job ID is required',
    }),
  bidValue: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Bid value must be a positive number',
      'any.required': 'Bid value is required',
    }),
  projectDueDate: Joi.date()
    .iso()
    .greater('now')
    .required()
    .messages({
      'date.base': 'Project due date must be a valid date',
      'date.greater': 'Project due date must be in the future',
      'any.required': 'Project due date is required',
    }),
  passFeeToHomeowner: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'passFeeToHomeowner must be a boolean',
    }),
});

/**
 * Validation schema for creating an extension request
 */
export const createExtensionRequestSchema = Joi.object({
  bidId: Joi.string()
    .length(24)
    .hex()
    .required()
    .messages({
      'string.length': 'Bid ID must be a valid 24 character hex string',
      'string.hex': 'Bid ID must be a valid Mongo ObjectId',
      'any.required': 'Bid ID is required',
    }),
  requestType: Joi.string()
    .valid('date_extension', 'budget_change')
    .required()
    .messages({
      'any.only': 'Request type must be either date_extension or budget_change',
      'any.required': 'Request type is required',
    }),
  newDate: Joi.when('requestType', {
    is: 'date_extension',
    then: Joi.date()
      .iso()
      .greater('now')
      .required()
      .messages({
        'date.base': 'New date must be a valid date',
        'date.greater': 'New date must be in the future',
        'any.required': 'New date is required for date extension requests',
      }),
    otherwise: Joi.optional(),
  }),
  newBudget: Joi.when('requestType', {
    is: 'budget_change',
    then: Joi.number()
      .positive()
      .required()
      .messages({
        'number.positive': 'New budget must be a positive number',
        'any.required': 'New budget is required for budget change requests',
      }),
    otherwise: Joi.optional(),
  }),
  explanation: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Explanation must be at least 10 characters long',
      'string.max': 'Explanation must not exceed 1000 characters',
      'any.required': 'Explanation is required',
    }),
});

/**
 * Validation schema for responding to an extension request
 */
export const respondToExtensionRequestSchema = Joi.object({
  status: Joi.string()
    .valid('approved', 'rejected')
    .required()
    .messages({
      'any.only': 'Status must be either approved or rejected',
      'any.required': 'Status is required',
    }),
});

/**
 * Validation schema for updating completion status
 */
export const updateCompletionStatusSchema = Joi.object({
  completedOnTime: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'completedOnTime must be a boolean',
      'any.required': 'completedOnTime is required',
    }),
  completedWithinBudget: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'completedWithinBudget must be a boolean',
      'any.required': 'completedWithinBudget is required',
    }),
});

