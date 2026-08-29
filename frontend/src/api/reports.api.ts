import { apiClient as axiosInstance } from './axios';

export const getReportMetrics = async () => {
  const response = await axiosInstance.get('/reports/metrics');
  return response.data;
};

export const getReportCharts = async () => {
  const response = await axiosInstance.get('/reports/charts');
  return response.data;
};

// Fetch synthetic batch testing accuracy metrics and performance logs
export const getAccuracyReport = async () => {
  const response = await axiosInstance.get('/reports/accuracy');
  return response.data;
};
