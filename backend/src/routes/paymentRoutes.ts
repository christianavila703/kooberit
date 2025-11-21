import { Router } from 'express';
import * as paymentController from '@/controllers/paymentController';
import { validate } from '@/middlewares/validate';
import { authorize } from '@/middlewares/auth';
import { USER_ROLES } from '@enums';
import { processPaymentSchema, paymentIntentIdSchema } from '@/validators';

const router = Router();

/**
 * @route   POST /api/payments/process
 */
router.post(
  '/process',
  authorize([USER_ROLES.CONTRACTOR]),
  validate(processPaymentSchema, 'body'),
  paymentController.processPayment
);

/**
 * @route   GET /api/payments/status/:paymentIntentId
 */
router.get(
  '/status/:paymentIntentId',
  validate(paymentIntentIdSchema, 'params'),
  paymentController.getPaymentStatus
);

export default router;

