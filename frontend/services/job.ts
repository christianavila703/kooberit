import api from '@/libs/api';
import endpoints from '@/constants/endpoints';
import { IApiResponse, IJob, IJobStatus, IPagination, ICreateJobRequest, IUpdateJobRequest, IProvince } from '@/types';

class JobService {
    /**
     * Get all contractor jobs
     */
    async getContractorJobs(
        params: {
            status?: IJobStatus;
            categories?: string[];
            cities?: string[];
            province?: IProvince;
            search?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ data: IJob[]; pagination: IPagination }> {
        const response = await api.get<IApiResponse<{ jobs: IJob[]; pagination: IPagination }>>(endpoints.jobs.getContractor, { params });
        
        return {
            data: response.data.data?.jobs || [],
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
     * Get all homeowner jobs
     */
    async getHomeownerJobs(
        status: IJobStatus,
        page?: number,
        limit?: number
    ): Promise<{ data: IJob[]; pagination: IPagination }> {
        const params: any = {};
        if (status) params.status = status;
        if (page) params.page = page;
        if (limit) params.limit = limit;
        
        const response = await api.get<IApiResponse<{ jobs: IJob[]; pagination: IPagination }>>(
            endpoints.jobs.getHomeowner,
            { params }
        );
        return {
            data: response.data.data?.jobs || [],
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
     * Create a new job
     */
    async createJob(data: ICreateJobRequest): Promise<IJob> {
        const response = await api.post<IApiResponse<IJob>>(
            endpoints.jobs.create,
            data
        );
        return response.data.data!;
    }

    /**
     * Get job by ID
     */
    async getJobById(id: string): Promise<IJob> {
        const response = await api.get<IApiResponse<IJob>>(
            endpoints.jobs.getById(id)
        );
        return response.data.data!;
    }

    /**
     * Update job
     */
    async updateJob(id: string, data: IUpdateJobRequest): Promise<IJob> {
        const response = await api.put<IApiResponse<IJob>>(
            endpoints.jobs.update(id),
            data
        );
        return response.data.data!;
    }

    /**
     * Close job
     */
    async closeJob(id: string): Promise<IJob> {
        const response = await api.patch<IApiResponse<IJob>>(
            endpoints.jobs.close(id)
        );
        return response.data.data!;
    }

    /**
     * Delete job
     */
    async deleteJob(id: string): Promise<void> {
        await api.delete(endpoints.jobs.delete(id));
    }
}

export default new JobService();