import { Router } from 'express';
import * as authController from '@/controllers/authController';
import { validate } from '@/middlewares/validate';
import { authenticate } from '@/middlewares/auth';
import Joi from 'joi';
import { 
  registerSchema, 
  loginSchema, 
  changePasswordSchema 
} from '@/validators';

const router = Router();

/**
 * @route   POST /api/auth/register
 */
router.post('/register', validate(registerSchema, 'body'), authController.register);

/**
 * @route   POST /api/auth/login
 */
router.post('/login', validate(loginSchema, 'body'), authController.login);

/**
 * @route   GET /api/auth/refresh
 */
router.get('/refresh', authenticate, authController.refreshToken);


/**
 * @route   POST /api/auth/change-password
 */
router.post('/change-password', authenticate, validate(changePasswordSchema, 'body'), authController.changePassword);

/**
 * @route   POST /api/auth/forgot-password
 */
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});
router.post('/forgot-password', validate(forgotPasswordSchema, 'body'), authController.requestPasswordReset);

/**
 * @route   POST /api/auth/reset-password
 */
const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password must not exceed 100 characters',
      'any.required': 'New password is required',
    }),
});
router.post('/reset-password', validate(resetPasswordSchema, 'body'), authController.resetPassword);

export default router;

