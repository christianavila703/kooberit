import { Schema, model } from 'mongoose';
import { Types } from 'mongoose';
import { IChatDocument } from '@/types';

const chatSchema = new Schema<IChatDocument>(
  {
    jobPostId: {
      type: Schema.Types.ObjectId,
      ref: 'JobPost',
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

chatSchema.index({ homeownerId: 1, contractorId: 1, jobPostId: 1 }, { unique: true });
chatSchema.index({ homeownerId: 1, lastMessageAt: -1 });
chatSchema.index({ contractorId: 1, lastMessageAt: -1 });

const Chat = model<IChatDocument>('Chat', chatSchema);

export default Chat;

