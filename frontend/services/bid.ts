import api from '@/libs/api';
import endpoints from '@/constants/endpoints';
import { IApiResponse, IBid, IExtensionRequest, ICreateBidRequest, ICreateExtensionRequestRequest, IRespondToExtensionRequestRequest, IUpdateCompletionStatusRequest } from '@/types';

class BidService {
    /**
     * Create a new bid
     */
    async createBid(data: ICreateBidRequest): Promise<IBid> {
        const response = await api.post<IApiResponse<IBid>>(
            endpoints.bids.create,
            data
        );
        return response.data.data!;
    }

    /**
     * Get all bids by contractor
     */
    async getBidsByContractor(): Promise<IBid[]> {
        const response = await api.get<IApiResponse<IBid[]>>(
            endpoints.bids.getByContractor
        );
        return response.data.data || [];
    }

    /**
     * Get all bids by homeowner
     */
    async getBidsByHomeowner(): Promise<IBid[]> {
        const response = await api.get<IApiResponse<IBid[]>>(
            endpoints.bids.getByHomeowner
        );
        return response.data.data || [];
    }

    /**
     * Get all bids for a job
     */
    async getBidsByJob(jobId: string): Promise<IBid[]> {
        const response = await api.get<IApiResponse<IBid[]>>(
            endpoints.bids.getByJob(jobId)
        );
        return response.data.data || [];
    }

    /**
     * Get all bids for a chat
     */
    async getBidsByChat(chatId: string): Promise<IBid[]> {
        const response = await api.get<IApiResponse<IBid[]>>(
            endpoints.bids.getByChat(chatId)
        );
        return response.data.data || [];
    }

    /**
     * Get bid by ID
     */
    async getBidById(id: string): Promise<IBid> {
        const response = await api.get<IApiResponse<IBid>>(
            endpoints.bids.getById(id)
        );
        return response.data.data!;
    }

    /**
     * Award a bid
     */
    async awardBid(id: string): Promise<IBid> {
        const response = await api.post<IApiResponse<IBid>>(
            endpoints.bids.award(id)
        );
        return response.data.data!;
    }

    /**
     * Reject a bid
     */
    async rejectBid(id: string): Promise<IBid> {
        const response = await api.post<IApiResponse<IBid>>(
            endpoints.bids.reject(id)
        );
        return response.data.data!;
    }

    /**
     * Create extension/change request
     */
    async createExtensionRequest(data: ICreateExtensionRequestRequest): Promise<IExtensionRequest> {
        const response = await api.post<IApiResponse<IExtensionRequest>>(
            endpoints.bids.createExtensionRequest,
            data
        );
        return response.data.data!;
    }

    /**
     * Respond to extension/change request
     */
    async respondToExtensionRequest(id: string, data: IRespondToExtensionRequestRequest): Promise<IExtensionRequest> {
        const response = await api.post<IApiResponse<IExtensionRequest>>(
            endpoints.bids.respondToExtensionRequest(id),
            data
        );
        return response.data.data!;
    }

    /**
     * Get pending extension requests
     */
    async getPendingExtensionRequests(): Promise<IExtensionRequest[]> {
        const response = await api.get<IApiResponse<IExtensionRequest[]>>(
            endpoints.bids.getPendingExtensionRequests
        );
        return response.data.data || [];
    }

    /**
     * Get extension requests by bid
     */
    async getExtensionRequestsByBid(bidId: string): Promise<IExtensionRequest[]> {
        const response = await api.get<IApiResponse<IExtensionRequest[]>>(
            endpoints.bids.getExtensionRequestsByBid(bidId)
        );
        return response.data.data || [];
    }

    /**
     * Update completion status
     */
    async updateCompletionStatus(bidId: string, data: IUpdateCompletionStatusRequest): Promise<IBid> {
        const response = await api.post<IApiResponse<IBid>>(
            endpoints.bids.updateCompletionStatus(bidId),
            data
        );
        return response.data.data!;
    }
}

export default new BidService();

