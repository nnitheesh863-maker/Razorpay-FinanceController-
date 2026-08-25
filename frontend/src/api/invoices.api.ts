import axiosInstance from './axios';
import { 
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
