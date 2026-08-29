import { apiClient as axiosInstance } from './axios';

// 1. Fetch cash flow overview statistics
export const getCashSummary = async () => {
  const response = await axiosInstance.get('/cash/summary');
  return response.data;
};

// 2. Fetch daily forecasting timeline data
export const getCashForecast = async () => {
  const response = await axiosInstance.get('/cash/forecast');
  return response.data;
};
