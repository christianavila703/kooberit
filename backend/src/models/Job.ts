import { Schema, model } from 'mongoose';
import { Types } from 'mongoose';
import { IJobDocument } from '@/types';

const jobSchema = new Schema<IJobDocument>(
  {
    homeownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    jobNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    jobSize: {
      type: String,
      enum: ['micro', 'small', 'big', 'very_big'],
      required: true,
    },
    structureType: {
      type: String,
      enum: ['single_detached_house', 'semi_detached_house', 'townhouse', 'low_rise_building', 'high_rise_building'],
      required: true,
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
      streetNumber: {
        type: String,
        trim: true,
      },
      streetName: {
        type: String,
        trim: true,
      },
      unitNumber: {
        type: String,
        trim: true,
      },
      cityName: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      areaCode: {
        type: String,
        trim: true,
      },
      province: {
        type: String,
        required: true,
        enum: ['ON', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'PE', 'QC', 'SK', 'NT', 'NU', 'YT'],
        index: true,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'closed', 'open', 'awaiting', 'accepted', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    contractorContactsCount: {
      type: Number,
      default: 0,
    },
    notificationsChecked: {
      type: Boolean,
      default: false,
      index: true,
    },
    invitedByContractorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

jobSchema.virtual('homeowner', {
  ref: 'User',
  localField: 'homeownerId',
  foreignField: '_id',
  justOne: true
});

jobSchema.index({ homeownerId: 1, status: 1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ 'location.coordinates': '2dsphere' });
jobSchema.index({ 'location.cityName': 1, 'location.province': 1 });

const Job = model<IJobDocument>('Job', jobSchema);

export default Job;

