import { Request, Response } from 'express';
import paymentService from '@/services/paymentService';
import logger from '@/utils/logger';
import { USER_ROLES } from '@enums';
import { Job, Contact, Bid} from '@/models';

/**
 * Process payment
 */
export const processPayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { jobId, paymentMethodId, cardholderName } = req.body;

    if (user.role !== USER_ROLES.CONTRACTOR) {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can make payments',
      });
    }

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Payment method ID is required',
      });
    }

    const job = await Job.findById(jobId).exec();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Process payment with payment method ID
    const result = await paymentService.processPaymentWithMethodId(
      paymentMethodId,
      cardholderName,
      jobId,
      user.id,
      job.homeownerId.toString()
    );

    if (result.success) {
      // Get chat ID from contact
      const contact = await Contact.findOne({
        jobId,
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

/**
 * Process award fee payment
 */
export const processAwardFeePayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { bidId, paymentMethodId, cardholderName } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Payment method ID is required',
      });
    }

    const bid = await Bid.findById(bidId).exec();

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found',
      });
    }

    let role = user.role;
    if (bid.homeownerId.toString() === user.id) {
      role = USER_ROLES.HOMEOWNER;
    }
    if (bid.contractorId.toString() === user.id) {
      role = USER_ROLES.CONTRACTOR;
    }

    // Determine who should pay based on passFeeToHomeowner
    const shouldHomeownerPay = bid.passFeeToHomeowner;
    const shouldContractorPay = !bid.passFeeToHomeowner;

    if (shouldHomeownerPay && role !== USER_ROLES.HOMEOWNER) {
      return res.status(403).json({
        success: false,
        message: 'This award fee must be paid by the homeowner',
      });
    }

    if (shouldContractorPay && role !== USER_ROLES.CONTRACTOR) {
      return res.status(403).json({
        success: false,
        message: 'This award fee must be paid by the contractor',
      });
    }

    // Verify user authorization
    if (shouldHomeownerPay && bid.homeownerId.toString() !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to pay for this bid',
      });
    }

    if (shouldContractorPay && bid.contractorId.toString() !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to pay for this bid',
      });
    }

    // If homeowner pays, bid must be awarded first
    if (shouldHomeownerPay && bid.bidStatus !== 'awarded') {
      return res.status(400).json({
        success: false,
        message: 'Bid must be awarded before paying award fee',
      });
    }

    // If contractor pays, bid must be awarded first
    if (shouldContractorPay && bid.bidStatus !== 'awarded') {
      return res.status(400).json({
        success: false,
        message: 'Bid must be awarded before paying award fee',
      });
    }

    if (bid.awardFeeStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Award fee has already been paid',
      });
    }

    // Process award fee payment
    const result = await paymentService.processAwardFeePayment(
      paymentMethodId,
      cardholderName,
      bidId,
      user.id,
      role,
      bid.awardFee
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Award fee payment processed successfully',
        data: {
          paymentIntentId: result.paymentIntentId,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error || 'Payment failed',
      });
    }
  } catch (error: any) {
    logger.error('Process award fee payment error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Payment processing failed',
    });
  }
};

