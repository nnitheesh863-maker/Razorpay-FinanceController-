import { apiClient as axiosInstance } from './axios';
import type { 
  TransactionFilters, 
  TransactionListResponse, 
  Transaction,
  TransactionSummary 
} from '../types/transaction.types';

export const getTransactions = async (filters: TransactionFilters = {}): Promise<TransactionListResponse> => {
  const response = await axiosInstance.get('/transactions', { params: filters });
  return response.data;
};

export const getTransactionById = async (id: string): Promise<{ data: Transaction }> => {
  const response = await axiosInstance.get(`/transactions/${id}`);
  return response.data;
};

export const getTransactionSummary = async (filters: { startDate?: string; endDate?: string } = {}): Promise<{ data: TransactionSummary }> => {
  const response = await axiosInstance.get('/transactions/summary', { params: filters });
  return response.data;
};

export const createTransaction = async (data: Partial<Transaction>): Promise<{ success: boolean; data: Transaction }> => {
  const response = await axiosInstance.post('/transactions', data);
  return response.data;
};

export const updateTransaction = async (id: string, data: Partial<Transaction>): Promise<{ success: boolean; data: Transaction }> => {
  const response = await axiosInstance.patch(`/transactions/${id}`, data);
  return response.data;
};

export const cancelTransaction = async (id: string): Promise<{ success: boolean; data: Transaction }> => {
  const response = await axiosInstance.delete(`/transactions/${id}`);
  return response.data;
};
