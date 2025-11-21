import { Schema, model } from 'mongoose';
import { Types } from 'mongoose';
import { IJobPostDocument } from '@/types';

const jobPostSchema = new Schema<IJobPostDocument>(
  {
    homeownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    categories: {
      type: [String],
      required: true,
      default: [],
    },
    contractorLimit: {
      type: Number,
      required: true,
      min: 1,
      default: 3,
    },
    location: {
      address: {
        type: String,
        required: true,
        trim: true,
      },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
          required: true,
        },
        coordinates: {
          type: [Number], // [longitude, latitude] for GeoJSON
          required: true,
        },
      },
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
      index: true,
    },
    contractorContactsCount: {
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

jobPostSchema.index({ homeownerId: 1, status: 1 });
jobPostSchema.index({ status: 1, createdAt: -1 });
jobPostSchema.index({ 'location.coordinates': '2dsphere' });

const JobPost = model<IJobPostDocument>('JobPost', jobPostSchema);

export default JobPost;

