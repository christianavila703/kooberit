import { Schema, model } from 'mongoose';
import { IBidDocument } from '@/types';

const bidSchema = new Schema<IBidDocument>(
  {
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
    bidValue: {
      type: Number,
      required: true,
      min: 0,
    },
    projectDueDate: {
      type: Date,
      required: true,
      index: true,
    },
    awardFee: {
      type: Number,
      required: true,
      min: 0,
    },
    awardFeeStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    bidStatus: {
      type: String,
      enum: ['pending', 'awarded', 'rejected'],
      default: 'pending',
      index: true,
    },
    awardedAt: {
      type: Date,
    },
    awardFeePaymentIntentId: {
      type: String,
      trim: true,
      index: true,
    },
    awardFeePaymentMethodId: {
      type: String,
      trim: true,
    },
    awardFeeTransactionId: {
      type: String,
      trim: true,
    },
    // Track if homeowner has been prompted for completion status
    completionPrompted: {
      type: Boolean,
      default: false,
    },
    // Track completion status responses
    completedOnTime: {
      type: Boolean,
    },
    completedWithinBudget: {
      type: Boolean,
    },
    // Track efficiency points allocated
    onTimeEfficiencyPoints: {
      type: Number,
      default: 0,
    },
    onBudgetEfficiencyPoints: {
      type: Number,
      default: 0,
    },
    // Whether the award fee is passed to homeowner (included in bid value)
    passFeeToHomeowner: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

bidSchema.virtual('contractor', {
  ref: 'User',
  localField: 'contractorId',
  foreignField: '_id',
  justOne: true
});

bidSchema.virtual('homeowner', {
  ref: 'User',
  localField: 'homeownerId',
  foreignField: '_id',
  justOne: true
});

bidSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true
});

bidSchema.index({ jobId: 1, contractorId: 1 }, { unique: true });
bidSchema.index({ contractorId: 1, createdAt: -1 });
bidSchema.index({ homeownerId: 1, createdAt: -1 });
bidSchema.index({ jobId: 1, bidStatus: 1 });
bidSchema.index({ projectDueDate: 1 });
bidSchema.index({ awardFeeStatus: 1, bidStatus: 1 });

const Bid = model<IBidDocument>('Bid', bidSchema);

export default Bid;
