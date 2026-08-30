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

export const compareFiles = async (
  bankFile: File, 
  invoiceFile: File, 
  options?: { compareAmount?: boolean; compareDate?: boolean; compareReference?: boolean }
): Promise<any> => {
  const formData = new FormData();
  formData.append('bankFile', bankFile);
  formData.append('invoiceFile', invoiceFile);
  if (options) {
    formData.append('compareAmount', String(options.compareAmount ?? true));
    formData.append('compareDate', String(options.compareDate ?? true));
    formData.append('compareReference', String(options.compareReference ?? true));
  }
  const response = await apiClient.post('/reconciliation/compare-files', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const uploadBatch = async (files: {
  invoiceFile?: File;
  paymentFile?: File;
  settlementFile?: File;
  bankFile?: File;
}): Promise<any> => {
  const formData = new FormData();
  if (files.invoiceFile) formData.append('invoiceFile', files.invoiceFile);
  if (files.paymentFile) formData.append('paymentFile', files.paymentFile);
  if (files.settlementFile) formData.append('settlementFile', files.settlementFile);
  if (files.bankFile) formData.append('bankFile', files.bankFile);

  const response = await apiClient.post('/imports/upload-batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const getBatchChains = async (runId: string, filters: any = {}): Promise<any> => {
  const response = await apiClient.get(`/reconciliation/batch/${runId}/chains`, { params: filters });
  return response.data;
};
