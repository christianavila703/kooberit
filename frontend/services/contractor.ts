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
    cities?: string[];
    province?: 'ON' | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'PE' | 'QC' | 'SK' | 'NT' | 'NU' | 'YT';
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
}

export default new ContractorService();

