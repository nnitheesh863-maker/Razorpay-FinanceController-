import { apiClient } from './axios';
import type { 
  ReconciliationRun, 
  ReconciliationRecord, 
  ReconciliationSummary, 
  ReconciliationFilters, 
  PaginatedResponse 
} from '../types/reconciliation.types';

export const getReconciliationSummary = async (): Promise<{ data: ReconciliationSummary }> => {
  const response = await apiClient.get<{ data: ReconciliationSummary }>('/reconciliation/summary');
  return response.data;
};

export const getReconciliationRuns = async (filters: any = {}): Promise<PaginatedResponse<ReconciliationRun>> => {
  const response = await apiClient.get<PaginatedResponse<ReconciliationRun>>('/reconciliation/runs', { params: filters });
  return response.data;
};

export const getReconciliationRunById = async (id: string): Promise<{ data: ReconciliationRun }> => {
  const response = await apiClient.get<{ data: ReconciliationRun }>(`/reconciliation/runs/${id}`);
  return response.data;
};

export const getReconciliationRecords = async (filters: ReconciliationFilters = {}): Promise<PaginatedResponse<ReconciliationRecord>> => {
  const response = await apiClient.get<PaginatedResponse<ReconciliationRecord>>('/reconciliation/records', { params: filters });
  return response.data;
};

export const getReconciliationRecordById = async (id: string): Promise<{ data: ReconciliationRecord }> => {
  const response = await apiClient.get<{ data: ReconciliationRecord }>(`/reconciliation/records/${id}`);
  return response.data;
};

export const runReconciliation = async (config: any): Promise<{ data: ReconciliationRun }> => {
  const response = await apiClient.post<{ success: boolean; data: ReconciliationRun }>('/reconciliation/run', config);
  return { data: response.data.data };
};
