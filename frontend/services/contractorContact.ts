import api from '@/libs/api';
import endpoints from '@/constants/endpoints';
import type {
  IApiResponse,
  IContractorContact,
  ICreateContractorContactRequest,
} from '@/types';

/**
 * Contractor Contact Service
 */
class ContractorContactService {
  /**
   * Get contractor contacts for a job post
   */
  async getContractorContactsByJobPost(jobPostId: string): Promise<IContractorContact[]> {
    const response = await api.get<IApiResponse<IContractorContact[]>>(
      endpoints.contractorContacts.getByJobPost(jobPostId)
    );
    return response.data.data || [];
  }

  /**
   * Get all contractor contacts for homeowner
   */
  async getHomeownerContractorContacts(): Promise<IContractorContact[]> {
    const response = await api.get<IApiResponse<IContractorContact[]>>(
      endpoints.contractorContacts.getHomeowner
    );
    return response.data.data || [];
  }

  /**
   * Check if contractor has contacted a job post
   */
  async checkContractorContact(jobPostId: string): Promise<{ hasContacted: boolean; contact: IContractorContact | null }> {
    const response = await api.get<IApiResponse<{ hasContacted: boolean; contact: IContractorContact | null }>>(
      endpoints.contractorContacts.checkContact(jobPostId)
    );
    return response.data.data || { hasContacted: false, contact: null };
  }

  /**
   * Create contractor contact
   */
  async createContractorContact(data: ICreateContractorContactRequest): Promise<IContractorContact> {
    const response = await api.post<IApiResponse<IContractorContact>>(
      endpoints.contractorContacts.create,
      data
    );
    return response.data.data!;
  }

  /**
   * Process payment and create contact
   */
  async processPayment(data: {
    jobPostId: string;
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
    saveCard: boolean;
  }): Promise<{ success: boolean; chatId?: string; error?: string }> {
    try {
      const response = await api.post<IApiResponse<{ paymentIntentId: string; chatId?: string }>>(
        endpoints.payments.process,
        data
      );
      return {
        success: true,
        chatId: response.data.data?.chatId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Payment failed',
      };
    }
  }
}

export default new ContractorContactService();

