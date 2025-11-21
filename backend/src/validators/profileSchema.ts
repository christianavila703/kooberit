import Joi from 'joi';

/**
 * Validation schema for updating profile settings
 */
export const updateProfileSettingsSchema = Joi.object({
  contractorAddress: Joi.object({
    address: Joi.string().trim().required().messages({
      'string.empty': 'Address is required',
      'any.required': 'Address is required',
    }),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required().messages({
        'number.base': 'Latitude must be a number',
        'number.min': 'Latitude must be between -90 and 90',
        'number.max': 'Latitude must be between -90 and 90',
        'any.required': 'Latitude is required',
      }),
      longitude: Joi.number().min(-180).max(180).required().messages({
        'number.base': 'Longitude must be a number',
        'number.min': 'Longitude must be between -180 and 180',
        'number.max': 'Longitude must be between -180 and 180',
        'any.required': 'Longitude is required',
      }),
    })
      .required()
      .messages({
        'any.required': 'Coordinates are required',
      }),
  })
    .allow(null)
    .optional()
    .messages({
      'object.base': 'Contractor address must be an object',
    }),

  notificationEnabled: Joi.boolean().optional().messages({
    'boolean.base': 'Notification enabled must be a boolean',
  }),

  notificationRadius: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .optional()
    .messages({
      'number.base': 'Notification radius must be a number',
      'number.integer': 'Notification radius must be an integer',
      'number.min': 'Notification radius must be at least 1 km',
      'number.max': 'Notification radius must not exceed 500 km',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

