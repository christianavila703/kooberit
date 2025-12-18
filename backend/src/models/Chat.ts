import { Schema, model } from 'mongoose';
import { Types } from 'mongoose';
import { IChatDocument } from '@/types';

const chatSchema = new Schema<IChatDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    homeownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contractorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastMessage: {
      type: String,
      trim: true,
    },
    lastMessageAt: {
      type: Date,
    },
    homeownerUnreadCount: {
      type: Number,
      default: 0,
    },
    contractorUnreadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

chatSchema.virtual('homeowner', {
  ref: 'User',
  localField: 'homeownerId',
  foreignField: '_id',
  justOne: true
});

chatSchema.virtual('contractor', {
  ref: 'User',
  localField: 'contractorId',
  foreignField: '_id',
  justOne: true
});

chatSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true
});

chatSchema.index({ homeownerId: 1, contractorId: 1, jobId: 1 }, { unique: true });
chatSchema.index({ homeownerId: 1, lastMessageAt: -1 });
chatSchema.index({ contractorId: 1, lastMessageAt: -1 });

const Chat = model<IChatDocument>('Chat', chatSchema);

export default Chat;

