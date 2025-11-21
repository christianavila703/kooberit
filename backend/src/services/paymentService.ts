import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, PAYMENT_AMOUNT } from '@/config/constants';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';
import contractorContactService from './contractorContactService';
import chatService from './chatService';

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

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(PAYMENT_AMOUNT, {
        jobPostId,
        contractorId,
        homeownerId,
      });

      // Confirm payment
      const confirmedPayment = await this.stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: paymentMethod.id,
      });

      if (confirmedPayment.status === 'succeeded') {
        // Create contractor contact
        const contact = await contractorContactService.createContact(
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
        await contractorContactService.linkChatToContact(contact._id.toString(), chat._id.toString());

        // Update payment status
        await contractorContactService.updatePaymentStatus(contact._id.toString(), 'completed', {
          paymentIntentId: confirmedPayment.id,
          paymentDate: new Date(),
        });

        logger.info(`Payment successful: ${confirmedPayment.id} for job post: ${jobPostId}`);

        return {
          success: true,
          paymentIntentId: confirmedPayment.id,
        };
      } else {
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

