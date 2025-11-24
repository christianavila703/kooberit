import userService from './userService';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';

export interface IProfileSettings {
  contractorAddress?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  } | null;
  notificationEnabled: boolean;
  notificationRadius?: number;
}

/**
 * Profile Service
 * Unified service for profile and settings management (both contractor and homeowner)
 */
class ProfileService {
  /**
   * Get profile settings for the current user
   */
  async getSettings(userId: string): Promise<IProfileSettings> {
    const user = await userService.findUserById(userId);
    
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    return {
      contractorAddress: user.contractorAddress || null,
      notificationEnabled: user.notificationEnabled ?? true,
      notificationRadius: user.notificationRadius ?? 50,
    };
  }

  /**
   * Update profile settings for the current user
   */
  async updateSettings(userId: string, settings: Partial<IProfileSettings>): Promise<IProfileSettings> {
    const user = await userService.findUserById(userId);
    
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    const updateData: any = {};

    // Only allow contractor-specific fields if user is a contractor
    if (user.role === 'contractor') {
      if (settings.contractorAddress !== undefined) {
        updateData.contractorAddress = settings.contractorAddress;
      }
      if (settings.notificationRadius !== undefined) {
        if (settings.notificationRadius < 1 || settings.notificationRadius > 500) {
          throw new CustomError('Notification radius must be between 1 and 500 km', 400);
        }
        updateData.notificationRadius = settings.notificationRadius;
      }
    } else if (settings.contractorAddress !== undefined || settings.notificationRadius !== undefined) {
      throw new CustomError('Contractor-specific settings can only be updated by contractors', 403);
    }

    // Notification enabled is available for all users
    if (settings.notificationEnabled !== undefined) {
      updateData.notificationEnabled = settings.notificationEnabled;
    }

    const updatedUser = await userService.updateUser(userId, updateData);

    if (!updatedUser) {
      throw new CustomError('Failed to update settings', 500);
    }

    logger.info(`Profile settings updated for user: ${userId}`);

    return {
      contractorAddress: updatedUser.contractorAddress || null,
      notificationEnabled: updatedUser.notificationEnabled ?? true,
      notificationRadius: updatedUser.notificationRadius ?? 50,
    };
  }
}

export default new ProfileService();

