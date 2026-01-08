import { Schema, model } from 'mongoose';
import { IExtensionRequestDocument } from '@/types';

const extensionRequestSchema = new Schema<IExtensionRequestDocument>(
  {
    bidId: {
      type: Schema.Types.ObjectId,
      ref: 'Bid',
      required: true,
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
    requestType: {
      type: String,
      enum: ['date_extension', 'budget_change'],
      required: true,
      index: true,
    },
    newDate: {
      type: Date,
    },
    newBudget: {
      type: Number,
      min: 0,
    },
    explanation: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

extensionRequestSchema.virtual('contractor', {
  ref: 'User',
  localField: 'contractorId',
  foreignField: '_id',
  justOne: true
});

extensionRequestSchema.virtual('homeowner', {
  ref: 'User',
  localField: 'homeownerId',
  foreignField: '_id',
  justOne: true
});

extensionRequestSchema.virtual('bid', {
  ref: 'Bid',
  localField: 'bidId',
  foreignField: '_id',
  justOne: true
});

extensionRequestSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true
});

extensionRequestSchema.index({ bidId: 1, requestType: 1, status: 1 });
extensionRequestSchema.index({ contractorId: 1, createdAt: -1 });
extensionRequestSchema.index({ homeownerId: 1, status: 1 });

const ExtensionRequest = model<IExtensionRequestDocument>('ExtensionRequest', extensionRequestSchema);

export default ExtensionRequest;

