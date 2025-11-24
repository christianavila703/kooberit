import { Schema, model } from 'mongoose';
import { Types } from 'mongoose';
import { IContractorContactDocument } from '@/types';

const contractorContactSchema = new Schema<IContractorContactDocument>(
  {
    jobPostId: {
      type: Schema.Types.ObjectId,
      ref: 'JobPost',
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
      default: 19.99,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentTransactionId: {
      type: String,
      trim: true,
    },
    chatRoomId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      index: true,
    },
    contactInfoRevealed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

contractorContactSchema.virtual('contractor', {
  ref: 'User',
  localField: 'contractorId',
  foreignField: '_id',
  justOne: true
});

contractorContactSchema.virtual('homeowner', {
  ref: 'User',
  localField: 'homeownerId',
  foreignField: '_id',
  justOne: true
});

contractorContactSchema.virtual('jobPost', {
  ref: 'JobPost',
  localField: 'jobPostId',
  foreignField: '_id',
  justOne: true
});

contractorContactSchema.virtual('chatRoom', {
  ref: 'Chat',
  localField: 'chatRoomId',
  foreignField: '_id',
  justOne: true
});

contractorContactSchema.index({ jobPostId: 1, contractorId: 1 }, { unique: true });
contractorContactSchema.index({ contractorId: 1, createdAt: -1 });
contractorContactSchema.index({ homeownerId: 1, createdAt: -1 });

const ContractorContact = model<IContractorContactDocument>('ContractorContact', contractorContactSchema);

export default ContractorContact;

