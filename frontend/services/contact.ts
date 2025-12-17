import api from '@/libs/api';
import endpoints from '@/constants/endpoints';
import type {
  IApiResponse,
  IContact,
  ICreateContactRequest,
} from '@/types';

/**
 * Contact Service
 */
class ContactService {
  /**
   * Get contractor contacts for a job post
   */
    async getContactsByJobPost(jobPostId: string): Promise<IContact[]> {
    const response = await api.get<IApiResponse<IContact[]>>(
      endpoints.contacts.getByJobPost(jobPostId)
    );
    return response.data.data || [];
  }

  /**
   * Get all contractor contacts for homeowner
   */
  async getHomeownerContacts(): Promise<IContact[]> {
    const response = await api.get<IApiResponse<IContact[]>>(
      endpoints.contacts.getHomeowner
    );
    return response.data.data || [];
  }

  /**
   * Check if contractor has contacted a job post
   */
  async checkContact(jobPostId: string): Promise<{ hasContacted: boolean; contact: IContact | null }> {
    const response = await api.get<IApiResponse<{ hasContacted: boolean; contact: IContact | null }>>(
      endpoints.contacts.checkContact(jobPostId)
    );
    return response.data.data || { hasContacted: false, contact: null };
  }

  /**
   * Create contractor contact
   */
  async createContact(data: ICreateContactRequest): Promise<IContact> {
    const response = await api.post<IApiResponse<IContact>>(
      endpoints.contacts.create,
      data
    );
    return response.data.data!;
  }

  /**
   * Process payment and create contact
   */
  async processPayment(data: {
    jobPostId: string;
    paymentMethodId: string;
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

export default new ContactService();

