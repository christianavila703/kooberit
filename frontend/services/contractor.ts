import api from '@/libs/api';
import endpoints from '@/constants/endpoints';
import type {
  IApiResponse,
  IJobPost,
} from '@/types';

/**
 * Contractor Service
 */
class ContractorService {
  /**
   * Get job board (filtered by radius and categories)
   */
  async getJobBoard(params?: {
    radius?: number;
    categories?: string[];
    search?: string;
  }): Promise<IJobPost[]> {
    const response = await api.get<IApiResponse<IJobPost[]>>(
      endpoints.contractor.getJobBoard,
      { params }
    );
    return response.data.data || [];
  }

  /**
   * Get contractor settings
   */
  async getSettings(): Promise<{
    contractorAddress?: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    notificationEnabled: boolean;
    notificationRadius: number;
  }> {
    const response = await api.get<IApiResponse<any>>(
      endpoints.contractor.getSettings
    );
    return response.data.data || {
      notificationEnabled: true,
      notificationRadius: 50,
    };
  }

  /**
   * Update contractor settings
   */
  async updateSettings(data: {
    contractorAddress?: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    notificationEnabled?: boolean;
    notificationRadius?: number;
  }): Promise<any> {
    const response = await api.put<IApiResponse<any>>(
      endpoints.contractor.updateSettings,
      data
    );
    return response.data.data;
  }
}

export default new ContractorService();

