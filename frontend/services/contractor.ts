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
    radius?: number | null;
    categories?: string[];
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: IJobPost[]; pagination: { currentPage: number; totalPages: number; totalCount: number; itemsPerPage: number; hasNextPage: boolean; hasPreviousPage: boolean } }> {
    const response = await api.get<IApiResponse<{ jobPosts: IJobPost[]; pagination: any }>>(
      endpoints.contractor.getJobBoard,
      { params }
    );
    return {
      data: response.data.data?.jobPosts || [],
      pagination: response.data.data?.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        itemsPerPage: 20,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
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

