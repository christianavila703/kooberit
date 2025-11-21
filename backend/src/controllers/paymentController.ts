import { Request, Response } from 'express';
import paymentService from '@/services/paymentService';
import logger from '@/utils/logger';
import { USER_ROLES } from '@enums';

/**
 * Process payment
 */
export const processPayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { jobPostId, cardNumber, expiryDate, cvv, cardholderName } = req.body;

    if (user.role !== USER_ROLES.CONTRACTOR) {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can make payments',
      });
    }

    // Parse expiry date (MM/YY format)
    const [expiryMonth, expiryYear] = expiryDate.split('/');

    // Get job post to find homeowner
    const { JobPost } = await import('@/models');
    const jobPost = await JobPost.findById(jobPostId).exec();

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: 'Job post not found',
      });
    }

    // Process payment
    const result = await paymentService.processPayment(
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      cardholderName,
      jobPostId,
      user.id,
      jobPost.homeowner.toString()
    );

    if (result.success) {
      // Get chat ID from contact
      const { ContractorContact } = await import('@/models');
      const contact = await ContractorContact.findOne({
        jobPostId,
        contractorId: user.id,
      }).exec();

      return res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          paymentIntentId: result.paymentIntentId,
          chatId: contact?.chatRoomId?.toString(),
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error || 'Payment failed',
      });
    }
  } catch (error: any) {
    logger.error('Process payment error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Payment processing failed',
    });
  }
};

/**
 * Get payment intent status
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;

    const status = await paymentService.getPaymentIntentStatus(paymentIntentId);

    return res.status(200).json({
      success: true,
      data: { status },
    });
  } catch (error: any) {
    logger.error('Get payment status error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get payment status',
    });
  }
};

