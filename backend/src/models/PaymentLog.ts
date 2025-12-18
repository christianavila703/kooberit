import { Schema, model } from 'mongoose';
import { Types } from 'mongoose';
import { IPaymentLogDocument } from '@/types';

const paymentLogSchema = new Schema<IPaymentLogDocument>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'ContractorContact',
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    contractorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    homeownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    paymentAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      required: true,
    },
    paymentTransactionId: {
      type: String,
      trim: true,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      trim: true,
      index: true,
    },
    stripePaymentMethodId: {
      type: String,
      trim: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

paymentLogSchema.virtual('contractorContact', {
  ref: 'ContractorContact',
  localField: 'contactId',
  foreignField: '_id',
  justOne: true
});

paymentLogSchema.virtual('contractor', {
  ref: 'User',
  localField: 'contractorId',
  foreignField: '_id',
  justOne: true
});

paymentLogSchema.virtual('homeowner', {
  ref: 'User',
  localField: 'homeownerId',
  foreignField: '_id',
  justOne: true
});

paymentLogSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true
});

// Indexes for efficient queries
paymentLogSchema.index({ contractorId: 1, createdAt: -1 });
paymentLogSchema.index({ homeownerId: 1, createdAt: -1 });
paymentLogSchema.index({ jobId: 1, createdAt: -1 });
paymentLogSchema.index({ paymentStatus: 1, createdAt: -1 });
paymentLogSchema.index({ stripePaymentIntentId: 1 });

const PaymentLog = model<IPaymentLogDocument>('PaymentLog', paymentLogSchema);

export default PaymentLog;

