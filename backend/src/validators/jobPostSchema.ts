import Joi from 'joi';

const CONSTRUCTION_CATEGORIES = [
  'roof',
  'eavestrough',
  'sofit',
  'siding',
  'brickwork',
  'windows',
  'doors',
  'foundation',
  'exterior stairs',
  'attic',
  'ceiling',
  'interior stairs',
  'interior walls',
  'bedroom',
  'living room',
  'kitchen',
  'washroom',
  'basement',
  'plumbing',
  'heating',
  'cooling',
  'electrical',
];

/**
 * Validation schema for creating a job post
 */
export const createJobPostSchema = Joi.object({
  description: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description must not exceed 5000 characters',
      'any.required': 'Description is required',
    }),
  categories: Joi.array()
    .items(Joi.string().valid(...CONSTRUCTION_CATEGORIES))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one category is required',
      'any.required': 'Categories are required',
    }),
  contractorLimit: Joi.number()
    .integer()
    .min(1)
    .default(3)
    .messages({
      'number.min': 'Contractor limit must be at least 1',
      'number.base': 'Contractor limit must be a number',
    }),
  location: Joi.object({
    address: Joi.string()
      .min(5)
      .max(500)
      .required()
      .messages({
        'string.min': 'Address must be at least 5 characters long',
        'string.max': 'Address must not exceed 500 characters',
        'any.required': 'Address is required',
      }),
    coordinates: Joi.object({
      latitude: Joi.number()
        .min(-90)
        .max(90)
        .required()
        .messages({
          'number.min': 'Latitude must be between -90 and 90',
          'number.max': 'Latitude must be between -90 and 90',
          'any.required': 'Latitude is required',
        }),
      longitude: Joi.number()
        .min(-180)
        .max(180)
        .required()
        .messages({
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
    .required()
    .messages({
      'any.required': 'Location is required',
    }),
});

/**
 * Validation schema for updating a job post
 */
export const updateJobPostSchema = Joi.object({
  description: Joi.string()
    .min(10)
    .max(5000)
    .optional()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description must not exceed 5000 characters',
    }),
  categories: Joi.array()
    .items(Joi.string().valid(...CONSTRUCTION_CATEGORIES))
    .min(1)
    .optional()
    .messages({
      'array.min': 'At least one category is required',
    }),
  contractorLimit: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.min': 'Contractor limit must be at least 1',
      'number.base': 'Contractor limit must be a number',
    }),
  location: Joi.object({
    address: Joi.string()
      .min(5)
      .max(500)
      .optional()
      .messages({
        'string.min': 'Address must be at least 5 characters long',
        'string.max': 'Address must not exceed 500 characters',
      }),
    coordinates: Joi.object({
      latitude: Joi.number()
        .min(-90)
        .max(90)
        .optional()
        .messages({
          'number.min': 'Latitude must be between -90 and 90',
          'number.max': 'Latitude must be between -90 and 90',
        }),
      longitude: Joi.number()
        .min(-180)
        .max(180)
        .optional()
        .messages({
          'number.min': 'Longitude must be between -180 and 180',
          'number.max': 'Longitude must be between -180 and 180',
        }),
    }).optional(),
  }).optional(),
});

