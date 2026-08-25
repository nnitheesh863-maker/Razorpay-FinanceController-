import axiosInstance from './axios';
import { DashboardOverviewResponse } from '../types/dashboard.types';

export const getDashboardOverview = async (): Promise<DashboardOverviewResponse> => {
  const response = await axiosInstance.get('/dashboard/overview');
  return response.data;
};
