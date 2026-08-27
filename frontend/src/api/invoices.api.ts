import { apiClient as axiosInstance } from './axios';
import type { 
  InvoiceFilters, 
  InvoiceListResponse, 
  Invoice,
  InvoiceSummary 
} from '../types/invoice.types';

export const getInvoices = async (filters: InvoiceFilters = {}): Promise<InvoiceListResponse> => {
  const response = await axiosInstance.get('/invoices', { params: filters });
  return response.data;
};

export const getInvoiceById = async (id: string): Promise<{ data: Invoice }> => {
  const response = await axiosInstance.get(`/invoices/${id}`);
  return response.data;
};

export const getInvoiceSummary = async (): Promise<{ data: InvoiceSummary }> => {
  const response = await axiosInstance.get('/invoices/summary');
  return response.data;
};

export const createInvoice = async (data: Partial<Invoice>): Promise<{ success: boolean; data: Invoice }> => {
  const response = await axiosInstance.post('/invoices', data);
  return response.data;
};

export const updateInvoice = async (id: string, data: Partial<Invoice>): Promise<{ success: boolean; data: Invoice }> => {
  const response = await axiosInstance.patch(`/invoices/${id}`, data);
  return response.data;
};

export const deleteInvoice = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.delete(`/invoices/${id}`);
  return response.data;
};

export const issueInvoice = async (id: string): Promise<{ success: boolean; data: Invoice }> => {
  const response = await axiosInstance.post(`/invoices/${id}/issue`);
  return response.data;
};

export const cancelInvoice = async (id: string): Promise<{ success: boolean; data: Invoice }> => {
  const response = await axiosInstance.post(`/invoices/${id}/cancel`);
  return response.data;
};
