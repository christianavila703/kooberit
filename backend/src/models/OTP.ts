import { Schema, model, Model } from 'mongoose';

export type OTPType = 'email_verification' | 'password_reset';

export interface IOTPDocument {
  id?: string;
  _id?: string;
  email: string;
  code: string;
  type: OTPType;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IOTPModel extends Model<IOTPDocument> {}

const otpSchema = new Schema<IOTPDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired documents
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5, // Maximum verification attempts
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups
otpSchema.index({ email: 1, type: 1, verified: 1 });
otpSchema.index({ email: 1, code: 1, type: 1 });

const OTP = model<IOTPDocument, IOTPModel>('OTP', otpSchema);

export default OTP;

