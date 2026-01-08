import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, PAYMENT_AMOUNT } from '@/config/constants';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';
import contactService from './contactService';
import chatService from './chatService';
import bidService from './bidService';
import paymentLogService from './paymentLogService';
import { Bid } from '@/models';
import { UserRole } from '@enums';

class PaymentService {
  private stripe: Stripe | null = null;

  constructor() {
    if (STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2025-08-27.basil',
      });
      logger.info('Stripe initialized successfully');
    } else {
      logger.warn('STRIPE_SECRET_KEY is not set. Payment service will not work.');
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(amount: number, metadata: Record<string, string>): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new CustomError('Stripe is not configured', 500);
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never', // Disable redirect-based payment methods (we only use cards)
        },
      });

      return paymentIntent;
    } catch (error: any) {
      logger.error('Stripe payment intent creation error:', error);
      throw new CustomError(error.message || 'Failed to create payment intent', 500);
    }
  }

  /**
   * Process payment with payment method ID (recommended approach)
   * This method uses a payment method tokenized on the frontend, which is secure
   * and works in both test and production modes without special access.
   */
  async processPaymentWithMethodId(
    paymentMethodId: string,
    cardholderName: string,
    jobId: string,
    contractorId: string,
    homeownerId: string
  ): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
    if (!this.stripe) {
      throw new CustomError('Stripe is not configured', 500);
    }

    let paymentLogId: string | undefined;
    try {
      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(PAYMENT_AMOUNT, {
        jobId,
        contractorId,
        homeownerId,
      });

      // Create payment log entry (pending status)
      const paymentLog = await paymentLogService.createPaymentLog({
        jobId,
        contractorId,
        homeownerId,
        paymentAmount: PAYMENT_AMOUNT / 100, // Convert cents to dollars
        paymentStatus: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentMethodId: paymentMethodId,
        metadata: {
          cardholderName,
          paymentMethod: 'tokenized',
        },
      });
      paymentLogId = paymentLog._id.toString();

      // Confirm payment with the payment method ID (tokenized on frontend)
      const confirmedPayment = await this.stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: paymentMethodId,
      });

      if (confirmedPayment.status === 'succeeded') {
        // Create contractor contact
        const contact = await contactService.createContactWithPayment(
          jobId,
          contractorId,
          homeownerId
        );

        // Create chat room (chatService expects strings, it will convert to ObjectId internally)
        const chat = await chatService.createOrGetChat({
          jobId: jobId,
          homeownerId: homeownerId,
          contractorId: contractorId,
        } as any);
        await contactService.linkChatToContact(contact._id.toString(), chat._id.toString());

        // Update payment status
        await contactService.updatePaymentStatus(contact._id.toString(), 'completed', {
          paymentIntentId: confirmedPayment.id,
          paymentDate: new Date(),
        });

        // Update payment log with success status and contact ID
        if (paymentLogId) {
          await paymentLogService.updatePaymentLogStatus(paymentLogId, 'completed', {
            paymentTransactionId: confirmedPayment.id,
            contactId: contact._id.toString(),
            metadata: {
              chatRoomId: chat._id.toString(),
            },
          });
        }

        logger.info(`Payment successful: ${confirmedPayment.id} for job: ${jobId}`);

        return {
          success: true,
          paymentIntentId: confirmedPayment.id,
        };
      } else {
        // Log payment failure
        if (paymentLogId) {
          await paymentLogService.updatePaymentLogStatus(paymentLogId, 'failed', {
            errorMessage: 'Payment was not successful',
            paymentTransactionId: confirmedPayment.id,
          });
        }
        throw new CustomError('Payment was not successful', 400);
      }
    } catch (error: any) {
      // Log payment failure
      if (paymentLogId) {
        await paymentLogService.updatePaymentLogStatus(paymentLogId, 'failed', {
          errorMessage: error.message || 'Payment processing failed',
          metadata: {
            errorType: error.type,
            errorCode: error.code,
          },
        }).catch((logError) => {
          logger.error('Error updating payment log on failure:', logError);
        });
      }
      logger.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed',
      };
    }
  }

  /**
   * Get payment intent status
   */
  async getPaymentIntentStatus(paymentIntentId: string): Promise<string> {
    if (!this.stripe) {
      throw new CustomError('Stripe is not configured', 500);
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status;
    } catch (error: any) {
      logger.error('Error retrieving payment intent:', error);
      throw new CustomError(error.message || 'Failed to retrieve payment status', 500);
    }
  }

  /**
   * Process award fee payment (2.5% of bid value)
   * Can be paid by contractor or homeowner depending on passFeeToHomeowner flag
   */
  async processAwardFeePayment(
    paymentMethodId: string,
    cardholderName: string,
    bidId: string,
    payerId: string,
    payerRole: UserRole,
    awardFeeAmount: number
  ): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
    if (!this.stripe) {
      throw new CustomError('Stripe is not configured', 500);
    }

    let paymentLogId: string | undefined;
    
    try {
      // Convert dollars to cents for Stripe
      const amountInCents = Math.round(awardFeeAmount * 100);

      // Get bid to verify payer
      const bid = await Bid.findById(bidId).exec();
      if (!bid) {
        throw new CustomError('Bid not found', 404);
      }

      const contractorId = bid.contractorId.toString();
      const homeownerId = bid.homeownerId.toString();

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(amountInCents, {
        bidId,
        contractorId,
        homeownerId,
        paymentType: 'award_fee',
        payerRole,
      });

      // Create payment log entry (pending status)
      const paymentLog = await paymentLogService.createPaymentLog({
        jobId: bidId, // Using bidId as jobId for award fee payments
        contractorId,
        homeownerId,
        paymentAmount: awardFeeAmount,
        paymentStatus: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentMethodId: paymentMethodId,
        metadata: {
          cardholderName,
          paymentMethod: 'tokenized',
          paymentType: 'award_fee',
          bidId,
        },
      });
      paymentLogId = paymentLog._id.toString();

      // Confirm payment with the payment method ID
      const confirmedPayment = await this.stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: paymentMethodId,
      });

      if (confirmedPayment.status === 'succeeded') {
        // Update bid award fee status
        await bidService.updateAwardFeeStatus(bidId, 'completed', {
          paymentIntentId: confirmedPayment.id,
          paymentMethodId: paymentMethodId,
          transactionId: confirmedPayment.id,
        });

        // Send notification message to chat that payment is complete
        const bid = await Bid.findById(bidId).exec();
        if (bid) {
          const chat = await chatService.findChatByJobAndUsers(
            bid.jobId.toString(),
            bid.homeownerId.toString(),
            bid.contractorId.toString()
          );

          if (chat) {
            // Create system messages for award fee payment
            await chatService.createAwardFeePaidMessage(
              chat._id.toString(),
              bid.contractorId.toString(),
              bid.homeownerId.toString(),
              payerRole,
              awardFeeAmount
            );
          }
        }

        // Update payment log with success status
        if (paymentLogId) {
          await paymentLogService.updatePaymentLogStatus(paymentLogId, 'completed', {
            paymentTransactionId: confirmedPayment.id,
            metadata: {
              bidId,
            },
          });
        }

        logger.info(`Award fee payment successful: ${confirmedPayment.id} for bid: ${bidId}`);

        return {
          success: true,
          paymentIntentId: confirmedPayment.id,
        };
      } else {
        // Log payment failure
        if (paymentLogId) {
          await paymentLogService.updatePaymentLogStatus(paymentLogId, 'failed', {
            errorMessage: 'Payment was not successful',
            paymentTransactionId: confirmedPayment.id,
          });
        }
        throw new CustomError('Payment was not successful', 400);
      }
    } catch (error: any) {
      // Log payment failure
      if (paymentLogId) {
        await paymentLogService.updatePaymentLogStatus(paymentLogId, 'failed', {
          errorMessage: error.message || 'Payment processing failed',
          metadata: {
            errorType: error.type,
            errorCode: error.code,
            bidId,
          },
        }).catch((logError) => {
          logger.error('Error updating payment log on failure:', logError);
        });
      }
      logger.error('Award fee payment processing error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed',
      };
    }
  }
}

export default new PaymentService();

