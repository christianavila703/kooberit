import api from '@/libs/api';
import endpoints from '@/constants/endpoints';
import { IApiResponse } from '@/types';

export interface IInvitation {
  id: string;
  inviteCode: string;
  inviterUserId: string;
  inviteeEmail: string;
  inviteType: 'homeowner' | 'contractor';
  status: 'pending' | 'accepted' | 'expired';
  jobId?: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICreateExternalInvitationRequest {
  inviteeEmail: string;
  inviteType: 'homeowner' | 'contractor';
}

export interface ICreateInternalInvitationRequest {
  inviteeEmail: string;
  jobId: string;
}

class InvitationService {
  /**
   * Create external invitation (email → signup)
   */
  async createExternalInvitation(data: ICreateExternalInvitationRequest): Promise<IInvitation> {
    const response = await api.post<IApiResponse<IInvitation>>(
      endpoints.invitations.external,
      data
    );
    return response.data.data!;
  }

  /**
   * Create internal invitation (existing users, for a specific job)
   */
  async createInternalInvitation(data: ICreateInternalInvitationRequest): Promise<IInvitation> {
    const response = await api.post<IApiResponse<IInvitation>>(
      endpoints.invitations.internal,
      data
    );
    return response.data.data!;
  }

  /**
   * Validate invitation code
   */
  async validateInvitationCode(code: string): Promise<{
    inviteCode: string;
    inviteType: 'homeowner' | 'contractor';
    inviteeEmail: string;
    inviter?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      companyName?: string;
    };
    jobId?: string;
  }> {
    const response = await api.get<IApiResponse<{
      inviteCode: string;
      inviteType: 'homeowner' | 'contractor';
      inviteeEmail: string;
      inviter?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        companyName?: string;
      };
      jobId?: string;
    }>>(endpoints.invitations.validate(code));
    return response.data.data!;
  }

  /**
   * Get invitations by inviter
   */
  async getInvitationsByInviter(status?: 'pending' | 'accepted' | 'expired'): Promise<IInvitation[]> {
    const params: any = {};
    if (status) params.status = status;
    
    const response = await api.get<IApiResponse<IInvitation[]>>(
      endpoints.invitations.myInvitations,
      { params }
    );
    return response.data.data || [];
  }

  /**
   * Get invitation count for a job
   */
  async getInvitationCountByJob(jobId: string, status?: 'pending' | 'accepted' | 'expired'): Promise<number> {
    const params: any = {};
    if (status) params.status = status;
    
    const response = await api.get<IApiResponse<{ count: number }>>(
      endpoints.invitations.countByJob(jobId),
      { params }
    );
    return response.data.data?.count || 0;
  }
}

export default new InvitationService();

