import Joi from 'joi';
import { CONSTRUCTION_CATEGORIES } from '@/config/constants';

/**
 * Validation schema for updating profile settings
 */
export const updateProfileSettingsSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .trim()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 100 characters',
    }),

  lastName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .trim()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 100 characters',
    }),

  companyName: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .trim()
    .messages({
      'string.max': 'Company name must not exceed 200 characters',
    }),

  phone: Joi.string()
    .trim()
    .max(20)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': 'Phone number must not exceed 20 characters',
    }),

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
    streetNumber: Joi.string().trim().allow('').optional().messages({
      'string.base': 'Street number must be a string',
    }),
    streetName: Joi.string().trim().allow('').optional().messages({
      'string.base': 'Street name must be a string',
    }),
    unitNumber: Joi.string().trim().allow('').optional().messages({
      'string.base': 'Unit number must be a string',
    }),
    cityName: Joi.string().trim().allow('').optional().messages({
      'string.base': 'City name must be a string',
    }),
    areaCode: Joi.string().trim().allow('').optional().messages({
      'string.base': 'Area code must be a string',
    }),
    province: Joi.string()
      .valid('ON', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'PE', 'QC', 'SK', 'NT', 'NU', 'YT')
      .optional()
      .messages({
        'any.only': 'Province must be a valid Canadian province code',
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

  constructionCategories: Joi.array()
    .items(Joi.string().valid(...CONSTRUCTION_CATEGORIES))
    .optional()
    .messages({
      'array.base': 'Construction categories must be an array',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

