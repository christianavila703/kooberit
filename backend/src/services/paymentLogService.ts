import { Types } from 'mongoose';
import { PaymentLog } from '@/models';
import {
  IPaymentLogAttributes,
  IPaymentLogCreationAttributes,
  IPaymentLogDocument,
  PaymentStatus,
} from '@/types';
import logger from '@/utils/logger';

/**
 * Payment Log Service
 */
class PaymentLogService {
  /**
   * Create a new payment log entry
   */
  async createPaymentLog(
    logData: IPaymentLogCreationAttributes
  ): Promise<IPaymentLogDocument> {
    try {
      const paymentLog = await PaymentLog.create({
        contactId: logData.contactId
          ? new Types.ObjectId(logData.contactId)
          : undefined,
        jobPostId: new Types.ObjectId(logData.jobPostId),
        contractorId: new Types.ObjectId(logData.contractorId),
        homeownerId: new Types.ObjectId(logData.homeownerId),
        paymentAmount: logData.paymentAmount,
        paymentStatus: logData.paymentStatus,
        paymentTransactionId: logData.paymentTransactionId,
        stripePaymentIntentId: logData.stripePaymentIntentId,
        stripePaymentMethodId: logData.stripePaymentMethodId,
        errorMessage: logData.errorMessage,
        metadata: logData.metadata || {},
      });

      logger.info(`Payment log created: ${paymentLog._id} for payment intent: ${logData.stripePaymentIntentId}`);
      return paymentLog;
    } catch (error: any) {
      logger.error('Error creating payment log:', error);
      throw error;
    }
  }

  /**
   * Update payment log status
   */
  async updatePaymentLogStatus(
    paymentLogId: string,
    status: PaymentStatus,
    updateData?: {
      errorMessage?: string;
      paymentTransactionId?: string;
      contactId?: string;
      stripePaymentMethodId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<IPaymentLogDocument | null> {
    try {
      const updateFields: any = { paymentStatus: status };
      
      if (updateData?.errorMessage) {
        updateFields.errorMessage = updateData.errorMessage;
      }
      
      if (updateData?.paymentTransactionId) {
        updateFields.paymentTransactionId = updateData.paymentTransactionId;
      }
      
      if (updateData?.contactId) {
        updateFields.contactId = new Types.ObjectId(updateData.contactId);
      }
      
      if (updateData?.stripePaymentMethodId) {
        updateFields.stripePaymentMethodId = updateData.stripePaymentMethodId;
      }
      
      if (updateData?.metadata) {
        // Get existing payment log to merge metadata properly
        const existingLog = await PaymentLog.findById(paymentLogId).exec();
        const existingMetadata = existingLog?.metadata || {};
        updateFields.metadata = { 
          ...(typeof existingMetadata === 'object' && existingMetadata !== null ? existingMetadata : {}), 
          ...updateData.metadata 
        };
      }

      const paymentLog = await PaymentLog.findByIdAndUpdate(
        paymentLogId,
        updateFields,
        { new: true }
      ).exec();

      if (paymentLog) {
        logger.info(`Payment log updated: ${paymentLogId} - Status: ${status}`);
      }

      return paymentLog;
    } catch (error: any) {
      logger.error('Error updating payment log:', error);
      throw error;
    }
  }

  /**
   * Find payment log by Stripe payment intent ID
   */
  async findPaymentLogByIntentId(
    stripePaymentIntentId: string
  ): Promise<IPaymentLogDocument | null> {
    try {
      return await PaymentLog.findOne({
        stripePaymentIntentId,
      }).exec();
    } catch (error: any) {
      logger.error('Error finding payment log by intent ID:', error);
      throw error;
    }
  }

  /**
   * Find payment logs by contractor contact ID
   */
  async findPaymentLogsByContactId(
    contactId: string
  ): Promise<IPaymentLogDocument[]> {
    try {
      return await PaymentLog.find({
        contactId: new Types.ObjectId(contactId),
      })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error: any) {
      logger.error('Error finding payment logs by contact ID:', error);
      throw error;
    }
  }

  /**
   * Find payment logs by job post ID
   */
  async findPaymentLogsByJobPostId(
    jobPostId: string
  ): Promise<IPaymentLogDocument[]> {
    try {
      return await PaymentLog.find({
        jobPostId: new Types.ObjectId(jobPostId),
      })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error: any) {
      logger.error('Error finding payment logs by job post ID:', error);
      throw error;
    }
  }

  /**
   * Find payment logs by contractor ID
   */
  async findPaymentLogsByContractorId(
    contractorId: string,
    limit?: number
  ): Promise<IPaymentLogDocument[]> {
    try {
      const query = PaymentLog.find({
        contractorId: new Types.ObjectId(contractorId),
      }).sort({ createdAt: -1 });

      if (limit) {
        query.limit(limit);
      }

      return await query.exec();
    } catch (error: any) {
      logger.error('Error finding payment logs by contractor ID:', error);
      throw error;
    }
  }
}

export default new PaymentLogService();

