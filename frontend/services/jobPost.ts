import api from '@/libs/api';
import endpoints from '@/constants/endpoints';
import type {
  IApiResponse,
  IJobPost,
  ICreateJobPostRequest,
  IUpdateJobPostRequest,
} from '@/types';

/**
 * Job Post Service
 */
class JobPostService {
  /**
   * Create a new job post
   */
  async createJobPost(data: ICreateJobPostRequest): Promise<IJobPost> {
    const response = await api.post<IApiResponse<IJobPost>>(
      endpoints.jobPosts.create,
      data
    );
    return response.data.data!;
  }

  /**
   * Get all job posts for homeowner
   */
  async getHomeownerJobPosts(status?: 'active' | 'closed'): Promise<IJobPost[]> {
    const params = status ? { status } : {};
    const response = await api.get<IApiResponse<IJobPost[]>>(
      endpoints.jobPosts.getHomeowner,
      { params }
    );
    return response.data.data || [];
  }

  /**
   * Get job post by ID
   */
  async getJobPostById(id: string): Promise<IJobPost> {
    const response = await api.get<IApiResponse<IJobPost>>(
      endpoints.jobPosts.getById(id)
    );
    return response.data.data!;
  }

  /**
   * Update job post
   */
  async updateJobPost(id: string, data: IUpdateJobPostRequest): Promise<IJobPost> {
    const response = await api.put<IApiResponse<IJobPost>>(
      endpoints.jobPosts.update(id),
      data
    );
    return response.data.data!;
  }

  /**
   * Close job post
   */
  async closeJobPost(id: string): Promise<IJobPost> {
    const response = await api.patch<IApiResponse<IJobPost>>(
      endpoints.jobPosts.close(id)
    );
    return response.data.data!;
  }

  /**
   * Delete job post
   */
  async deleteJobPost(id: string): Promise<void> {
    await api.delete(endpoints.jobPosts.delete(id));
  }
}

export default new JobPostService();

