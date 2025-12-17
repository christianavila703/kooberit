import { Schema, model, Model } from 'mongoose';
import {
  USER_ROLES,
  DEFAULT_USER_ALLOW_STATUS,
  DEFAULT_USER_ROLE,
  USER_ALLOW_STATUS_VALUES,
  USER_ROLE_VALUES,
  USER_ALLOW_STATUS,
} from '@enums';
import { IUserDocument } from '@/types';
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from '@/config/constants';

// Interface for User model static methods
interface IUserModel extends Model<IUserDocument> {
  createDefaultAdmin(): Promise<void>;
}

/**
 * Generate a unique 7-digit ID
 * Retries if the ID already exists in the database
 */
async function generateUniqueId(UserModel: any): Promise<number> {
  let uniqueId: number;
  let exists = true;
  const maxRetries = 10;
  let retries = 0;

  while (exists && retries < maxRetries) {
    // Generate a random 7-digit number (1000000 to 9999999)
    uniqueId = Math.floor(1000000 + Math.random() * 9000000);
    
    // Check if this ID already exists
    const existingUser = await UserModel.findOne({ uniqueId }).exec();
    exists = !!existingUser;
    retries++;
  }

  if (exists) {
    throw new Error('Failed to generate unique ID after maximum retries');
  }

  return uniqueId!;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    uniqueId: {
      type: Number,
      unique: true,
      sparse: true, // Allow null values but ensure uniqueness when present
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: USER_ROLE_VALUES,
      required: true,
      default: DEFAULT_USER_ROLE,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: USER_ALLOW_STATUS_VALUES,
      required: true,
      default: DEFAULT_USER_ALLOW_STATUS,
      lowercase: true,
      trim: true,
    },
    lastLogin: {
      type: Date,
    },
    // Contractor-specific fields
    contractorAddress: {
      address: {
        type: String,
        trim: true,
      },
      coordinates: {
        latitude: {
          type: Number,
        },
        longitude: {
          type: Number,
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
        trim: true,
      },
      areaCode: {
        type: String,
        trim: true,
      },
      province: {
        type: String,
        enum: ['ON', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'PE', 'QC', 'SK', 'NT', 'NU', 'YT'],
      },
    },
    notificationEnabled: {
      type: Boolean,
      default: true,
    },
    notificationRadius: {
      type: Number,
      default: 50, // km
      min: 1,
      max: 500,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    constructionCategories: {
      type: [String],
      default: [],
    },
    emailVerified: {
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

// Pre-save hook to generate unique ID if it doesn't exist
// Must be defined BEFORE model creation
userSchema.pre('save', async function (next) {
  // Only generate uniqueId if it doesn't exist
  if (!this.uniqueId) {
    try {
      // Get the model from the connection at runtime
      const UserModel = this.db.model('User');
      this.uniqueId = await generateUniqueId(UserModel);
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Static method to create a default admin user
userSchema.statics.createDefaultAdmin = async function() {
  try {
      const existingAdmin = await this.findOne({ email: DEFAULT_ADMIN_EMAIL });
      if (existingAdmin) {
          console.log('Default admin user already exists');
          return;
      }
      
      const defaultAdmin = new this({
          firstName: 'Super',
          lastName: 'Admin',
          email: DEFAULT_ADMIN_EMAIL,
          password: DEFAULT_ADMIN_PASSWORD,
          role: USER_ROLES.ADMIN,
          status: USER_ALLOW_STATUS.ALLOW,
          emailVerified: true
      });
      
      await defaultAdmin.save();

      console.log('Default admin user created successfully');
  } catch (error) {
      console.error('Error creating default admin user:', error);
  }
}; 

// Email index is already created by unique: true, no need for duplicate

const User = model<IUserDocument, IUserModel>('User', userSchema);

export default User;

