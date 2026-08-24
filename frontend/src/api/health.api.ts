import { apiClient } from './axios';
import type { ApiResponse } from '../types/api.types';

export interface HealthData {
  server: string;
  timestamp: string;
}

export const checkBackendHealth = async (): Promise<ApiResponse<HealthData>> => {
  const response = await apiClient.get<ApiResponse<HealthData>>('/health');
  return response.data;
};
