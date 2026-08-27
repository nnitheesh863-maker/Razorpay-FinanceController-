import { apiClient as axiosInstance } from './axios';
import type { DashboardOverviewResponse } from '../types/dashboard.types';

export const getDashboardOverview = async (startDate?: string, endDate?: string): Promise<DashboardOverviewResponse> => {
  const response = await axiosInstance.get('/dashboard/overview', {
    params: { startDate, endDate }
  });
  return response.data;
};
