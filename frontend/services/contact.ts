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
   * Get contractor contacts for a job
   */
    async getContactsByJob(jobId: string): Promise<IContact[]> {
    const response = await api.get<IApiResponse<IContact[]>>(
      endpoints.contacts.getByJob(jobId)
    );
    return response.data.data || [];
  }

  /**
   * Legacy method for backward compatibility
   */
  async getContactsByjob(jobId: string): Promise<IContact[]> {
    return this.getContactsByJob(jobId);
  }

  /**
   * Check if contractor has contacted a job
   */
  async checkContact(jobId: string): Promise<{ hasContacted: boolean; contact: IContact | null }> {
    const response = await api.get<IApiResponse<{ hasContacted: boolean; contact: IContact | null }>>(
      endpoints.contacts.checkContact(jobId)
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
    jobId: string;
    paymentMethodId: string;
    cardholderName: string;
    saveCard: boolean;
  }): Promise<{ success: boolean; chatId?: string; error?: string }> {
    // Use jobId if provided, otherwise fall back to jobId for backward compatibility
    const finalJobId = data.jobId || data.jobId;
    if (!finalJobId) {
      return { success: false, error: 'Job ID is required' };
    }
    try {
      const response = await api.post<IApiResponse<{ paymentIntentId: string; chatId?: string }>>(
        endpoints.payments.process,
        { ...data, jobId: finalJobId }
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

