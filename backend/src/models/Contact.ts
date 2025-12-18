import { Schema, model } from 'mongoose';
import { IContactDocument } from '@/types';

const contactSchema = new Schema<IContactDocument>(
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

contactSchema.virtual('contractor', {
  ref: 'User',
  localField: 'contractorId',
  foreignField: '_id',
  justOne: true
});

contactSchema.virtual('homeowner', {
  ref: 'User',
  localField: 'homeownerId',
  foreignField: '_id',
  justOne: true
});

contactSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true
});

contactSchema.virtual('chatRoom', {
  ref: 'Chat',
  localField: 'chatRoomId',
  foreignField: '_id',
  justOne: true
});

contactSchema.index({ jobId: 1, contractorId: 1 }, { unique: true });
contactSchema.index({ contractorId: 1, createdAt: -1 });
contactSchema.index({ homeownerId: 1, createdAt: -1 });

const Contact = model<IContactDocument>('Contact', contactSchema);

export default Contact;

