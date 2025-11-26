import api from '@/libs/api';
import endpoints from '@/constants/endpoints';
import type { IApiResponse } from '@/types';

export interface IProfileAddress {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface IProfileSettings {
  // Shared
  phone?: string;
  notificationEnabled: boolean;
  // Contractor-specific
  contractorAddress?: IProfileAddress | null;
  constructionCategories?: string[];
  notificationRadius?: number;
}

/**
 * Profile Service
 * Unified service for profile and settings management (both contractor and homeowner)
 */
class ProfileService {
  /**
   * Get profile settings
   */
  async getSettings(): Promise<IProfileSettings> {
    const response = await api.get<IApiResponse<IProfileSettings>>(
      endpoints.profile.getSettings
    );
    return response.data.data || {
      notificationEnabled: true,
      notificationRadius: 50,
    };
  }

  /**
   * Update profile settings
   */
  async updateSettings(data: Partial<IProfileSettings>): Promise<IProfileSettings> {
    const response = await api.put<IApiResponse<IProfileSettings>>(
      endpoints.profile.updateSettings,
      data
    );
    return response.data.data || data as IProfileSettings;
  }
}

export default new ProfileService();

