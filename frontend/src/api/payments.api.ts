import { apiClient as axiosInstance } from './axios';
import type { 
  PaymentFilters, 
  PaymentListResponse, 
  Payment,
  PaymentSummary 
} from '../types/payment.types';

export const getPayments = async (filters: PaymentFilters = {}): Promise<PaymentListResponse> => {
  const response = await axiosInstance.get('/payments', { params: filters });
  return response.data;
};

export const getPaymentById = async (id: string): Promise<{ data: Payment }> => {
  const response = await axiosInstance.get(`/payments/${id}`);
  return response.data;
};

export const getPaymentSummary = async (): Promise<{ data: PaymentSummary }> => {
  const response = await axiosInstance.get('/payments/summary');
  return response.data;
};

export const createPayment = async (data: Partial<Payment>): Promise<{ success: boolean; data: Payment }> => {
  const response = await axiosInstance.post('/payments', data);
  return response.data;
};

export const refundPayment = async (id: string, notes?: string): Promise<{ success: boolean; data: Payment }> => {
  const response = await axiosInstance.post(`/payments/${id}/refund`, { notes });
  return response.data;
};
