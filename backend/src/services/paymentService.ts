import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, PAYMENT_AMOUNT } from '@/config/constants';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';
import contactService from './contactService';
import chatService from './chatService';
import paymentLogService from './paymentLogService';

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
   * Process payment with card details
   * 
   * Note: In TEST mode, Stripe restricts raw card data APIs by default for security.
   *       You may need to request access from Stripe Support.
   *       In PRODUCTION mode (sk_live_*), raw card data APIs are available but require PCI compliance.
   */
  async processPayment(
    cardNumber: string,
    expiryMonth: string,
    expiryYear: string,
    cvv: string,
    cardholderName: string,
    jobPostId: string,
    contractorId: string,
    homeownerId: string
  ): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
    if (!this.stripe) {
      throw new CustomError('Stripe is not configured', 500);
    }

    try {
      const isTestMode = STRIPE_SECRET_KEY.startsWith('sk_test_');
      let confirmedPayment: Stripe.PaymentIntent;

      // Try method 1: Create payment method first, then confirm
      let paymentLogId: string | undefined;
      try {
        // Create payment intent first
        const paymentIntent = await this.createPaymentIntent(PAYMENT_AMOUNT, {
          jobPostId,
          contractorId,
          homeownerId,
        });

        // Create payment log entry (pending status)
        const paymentLog = await paymentLogService.createPaymentLog({
          jobPostId,
          contractorId,
          homeownerId,
          paymentAmount: PAYMENT_AMOUNT / 100, // Convert cents to dollars
          paymentStatus: 'pending',
          stripePaymentIntentId: paymentIntent.id,
          metadata: {
            cardholderName,
            paymentMethod: 'card',
          },
        });
        paymentLogId = paymentLog._id.toString();

        // Create payment method
        const paymentMethod = await this.stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: cardNumber,
            exp_month: parseInt(expiryMonth),
            exp_year: parseInt('20' + expiryYear),
            cvc: cvv,
          },
          billing_details: {
            name: cardholderName,
          },
        });

        // Update payment log with payment method ID
        if (paymentLogId) {
          await paymentLogService.updatePaymentLogStatus(paymentLogId, 'pending', {
            stripePaymentMethodId: paymentMethod.id,
            metadata: {
              cardholderName,
              paymentMethod: 'card',
            },
          });
        }

        // Confirm payment with the payment method
        confirmedPayment = await this.stripe.paymentIntents.confirm(paymentIntent.id, {
          payment_method: paymentMethod.id,
        });
      } catch (cardError: any) {
        // Log payment failure
        if (paymentLogId) {
          await paymentLogService.updatePaymentLogStatus(paymentLogId, 'failed', {
            errorMessage: cardError.message || 'Payment processing failed',
            metadata: {
              errorType: cardError.type,
              errorCode: cardError.code,
            },
          });
        }
        throw cardError;
      }

      if (confirmedPayment.status === 'succeeded') {
        // Create contractor contact
        const contact = await contactService.createContactWithPayment(
          jobPostId,
          contractorId,
          homeownerId
        );

        // Create chat room (chatService expects strings, it will convert to ObjectId internally)
        const chat = await chatService.createOrGetChat({
          jobPostId: jobPostId,
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

        logger.info(`Payment successful: ${confirmedPayment.id} for job post: ${jobPostId}`);

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
      logger.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed',
      };
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
    jobPostId: string,
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
        jobPostId,
        contractorId,
        homeownerId,
      });

      // Create payment log entry (pending status)
      const paymentLog = await paymentLogService.createPaymentLog({
        jobPostId,
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
          jobPostId,
          contractorId,
          homeownerId
        );

        // Create chat room (chatService expects strings, it will convert to ObjectId internally)
        const chat = await chatService.createOrGetChat({
          jobPostId: jobPostId,
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

        logger.info(`Payment successful: ${confirmedPayment.id} for job post: ${jobPostId}`);

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
}

export default new PaymentService();

