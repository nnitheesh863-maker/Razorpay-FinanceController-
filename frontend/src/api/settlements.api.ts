import { apiClient as axiosInstance } from './axios';

export interface SettlementFilter {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const getSettlements = async (filters: SettlementFilter = {}) => {
  const response = await axiosInstance.get('/settlements', { params: filters });
  return response.data;
};

export const getSettlementById = async (id: string) => {
  const response = await axiosInstance.get(`/settlements/${id}`);
  return response.data;
};

export const createSettlement = async (data: {
  expectedAmount: number;
  settledAmount: number;
  fees: number;
  gatewayReference: string;
  settlementDate: string;
}) => {
  const response = await axiosInstance.post('/settlements', data);
  return response.data;
};

export const updateSettlement = async (id: string, data: any) => {
  const response = await axiosInstance.patch(`/settlements/${id}`, data);
  return response.data;
};

export const linkTransactionsToSettlement = async (id: string, transactionIds: string[]) => {
  const response = await axiosInstance.post(`/settlements/${id}/link-transactions`, { transactionIds });
  return response.data;
};
