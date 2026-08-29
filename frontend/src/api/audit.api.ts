import { apiClient as axiosInstance } from './axios';

export interface AuditLogFilter {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export const getAuditLogs = async (filters: AuditLogFilter = {}) => {
  const response = await axiosInstance.get('/audit-logs', { params: filters });
  return response.data;
};
