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
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  otpCode: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'OTP code must be 6 digits',
      'string.pattern.base': 'OTP code must contain only numbers',
      'any.required': 'OTP code is required',
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

/**
 * @route   POST /api/auth/verify-email-otp
 */
const verifyEmailOTPSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  otpCode: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'OTP code must be 6 digits',
      'string.pattern.base': 'OTP code must contain only numbers',
      'any.required': 'OTP code is required',
    }),
});
router.post('/verify-email-otp', validate(verifyEmailOTPSchema, 'body'), authController.verifyEmailOTP);

/**
 * @route   POST /api/auth/resend-verification-otp
 */
const resendVerificationOTPSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});
router.post('/resend-verification-otp', validate(resendVerificationOTPSchema, 'body'), authController.resendVerificationOTP);

export default router;

