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

export const getTransactionSummary = async (): Promise<{ data: TransactionSummary }> => {
  const response = await axiosInstance.get('/transactions/summary');
  return response.data;
};
