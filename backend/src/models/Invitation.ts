import { Schema, model } from 'mongoose';
import { Types } from 'mongoose';
import { IInvitationDocument } from '@/types';

const invitationSchema = new Schema<IInvitationDocument>(
  {
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    inviterUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    inviteeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
      index: true,
    },
    inviteType: {
      type: String,
      enum: ['homeowner', 'contractor'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired'],
      default: 'pending',
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
    },
    acceptedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

invitationSchema.virtual('inviter', {
  ref: 'User',
  localField: 'inviterUserId',
  foreignField: '_id',
  justOne: true,
});

invitationSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true,
});

invitationSchema.index({ inviteCode: 1, status: 1 });
invitationSchema.index({ inviteeEmail: 1, status: 1 });
invitationSchema.index({ inviterUserId: 1, status: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

const Invitation = model<IInvitationDocument>('Invitation', invitationSchema);

export default Invitation;

