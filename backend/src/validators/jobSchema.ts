import Joi from 'joi';
import { CONSTRUCTION_CATEGORIES } from '@/config/constants';

/**
 * Validation schema for creating a job
 */
export const createJobSchema = Joi.object({
  jobTitle: Joi.string()
    .min(1)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.min': 'Project title must be at least 1 character long',
      'string.max': 'Project title must not exceed 200 characters',
      'any.required': 'Project title is required',
    }),
  jobSize: Joi.string()
    .valid('micro', 'small', 'big', 'very_big')
    .required()
    .messages({
      'any.only': 'Job size must be one of: micro, small, big, very_big',
      'any.required': 'Job size is required',
    }),
  structureType: Joi.string()
    .valid('single_detached_house', 'semi_detached_house', 'townhouse', 'low_rise_building', 'high_rise_building')
    .required()
    .messages({
      'any.only': 'Structure type must be one of: single_detached_house, semi_detached_house, townhouse, low_rise_building, high_rise_building',
      'any.required': 'Structure type is required',
    }),
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
    streetNumber: Joi.string()
      .allow('')
      .optional()
      .trim()
      .max(50)
      .messages({
        'string.max': 'Street number must not exceed 50 characters',
      }),
    streetName: Joi.string()
      .allow('')
      .optional()
      .trim()
      .max(200)
      .messages({
        'string.max': 'Street name must not exceed 200 characters',
      }),
    unitNumber: Joi.string()
      .allow('')
      .optional()
      .trim()
      .max(50)
      .messages({
        'string.max': 'Unit number must not exceed 50 characters',
      }),
    cityName: Joi.string()
      .min(1)
      .max(200)
      .required()
      .trim()
      .messages({
        'string.min': 'City name is required',
        'string.max': 'City name must not exceed 200 characters',
        'any.required': 'City name is required',
      }),
    areaCode: Joi.string()
      .allow('')
      .optional()
      .trim()
      .max(10)
      .messages({
        'string.max': 'Area code must not exceed 10 characters',
      }),
    province: Joi.string()
      .valid('ON', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'PE', 'QC', 'SK', 'NT', 'NU', 'YT')
      .required()
      .messages({
        'any.only': 'Province must be one of: ON, AB, BC, MB, NB, NL, NS, PE, QC, SK, NT, NU, YT',
        'any.required': 'Province is required',
      }),
  })
    .required()
    .messages({
      'any.required': 'Location is required',
    }),
});

/**
 * Validation schema for updating a job
 */
export const updateJobSchema = Joi.object({
  jobTitle: Joi.string()
    .min(1)
    .max(200)
    .optional()
    .trim()
    .messages({
      'string.min': 'Project title must be at least 1 character long',
      'string.max': 'Project title must not exceed 200 characters',
    }),
  jobSize: Joi.string()
    .valid('micro', 'small', 'big', 'very_big')
    .optional()
    .messages({
      'any.only': 'Job size must be one of: micro, small, big, very_big',
    }),
  structureType: Joi.string()
    .valid('single_detached_house', 'semi_detached_house', 'townhouse', 'low_rise_building', 'high_rise_building')
    .optional()
    .messages({
      'any.only': 'Structure type must be one of: single_detached_house, semi_detached_house, townhouse, low_rise_building, high_rise_building',
    }),
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
    streetNumber: Joi.string()
      .allow('')
      .optional()
      .trim()
      .max(50)
      .messages({
        'string.max': 'Street number must not exceed 50 characters',
      }),
    streetName: Joi.string()
      .allow('')
      .optional()
      .trim()
      .max(200)
      .messages({
        'string.max': 'Street name must not exceed 200 characters',
      }),
    unitNumber: Joi.string()
      .allow('')
      .optional()
      .trim()
      .max(50)
      .messages({
        'string.max': 'Unit number must not exceed 50 characters',
      }),
    cityName: Joi.string()
      .min(1)
      .max(200)
      .optional()
      .trim()
      .messages({
        'string.min': 'City name must be at least 1 character long',
        'string.max': 'City name must not exceed 200 characters',
      }),
    areaCode: Joi.string()
      .allow('')
      .optional()
      .trim()
      .max(10)
      .messages({
        'string.max': 'Area code must not exceed 10 characters',
      }),
    province: Joi.string()
      .valid('ON', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'PE', 'QC', 'SK', 'NT', 'NU', 'YT')
      .optional()
      .messages({
        'any.only': 'Province must be one of: ON, AB, BC, MB, NB, NL, NS, PE, QC, SK, NT, NU, YT',
      }),
  }).optional(),
});

/**
 * Validation schema for pagination query parameters (homeowner jobs)
 */
export const fetchHomeownerJobsSchema = Joi.object({
  status: Joi.string()
    .valid('all', 'pending', 'closed', 'open', 'awaiting', 'accepted', 'completed', 'cancelled')
    .optional()
    .lowercase()
    .trim()
    .messages({
      'any.only': 'Status must be one of: pending, closed, open, awaiting, accepted, completed, cancelled',
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be greater than 0',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100',
    }),
});

/**
 * Validation schema for pagination query parameters (contractor job board)
 */
export const fetchContractorJobsSchema = Joi.object({
  status: Joi.string()
    .valid('all', 'pending', 'closed', 'open', 'awaiting', 'accepted', 'completed', 'cancelled')
    .optional()
    .lowercase()
    .trim()
    .messages({
      'any.only': 'Status must be one of: pending, closed, open, awaiting, accepted, completed, cancelled',
    }),
  radius: Joi.alternatives()
    .try(
      Joi.number().integer().min(1).max(1000),
      Joi.string().valid('all', 'null').allow(null, '')
    )
    .optional()
    .messages({
      'number.base': 'Radius must be a number',
      'number.integer': 'Radius must be an integer',
      'number.min': 'Radius must be at least 1',
      'number.max': 'Radius must not exceed 1000',
      'any.only': 'Radius must be a number or "all"',
    }),
  'categories[]': Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().valid(...CONSTRUCTION_CATEGORIES)),
      Joi.string().valid(...CONSTRUCTION_CATEGORIES)
    )
    .optional()
    .messages({
      'any.only': 'Category must be one of the valid construction categories',
    }),
  'cities[]': Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().max(200)),
      Joi.string().trim().max(200)
    )
    .optional()
    .messages({
      'string.max': 'City name must not exceed 200 characters',
    }),
  province: Joi.string()
    .valid('ON', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'PE', 'QC', 'SK', 'NT', 'NU', 'YT')
    .optional()
    .default('ON')
    .messages({
      'any.only': 'Province must be one of: ON, AB, BC, MB, NB, NL, NS, PE, QC, SK, NT, NU, YT',
    }),
  search: Joi.string()
    .allow('')
    .optional()
    .trim()
    .max(255)
    .messages({
      'string.max': 'Search term must not exceed 255 characters',
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be greater than 0',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100',
    }),
});

