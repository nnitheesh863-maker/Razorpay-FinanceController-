import { apiClient as axiosInstance } from './axios';

// Fetch current dynamic Finance Control Score and component explanations
export const getControlScore = async () => {
  const response = await axiosInstance.get('/control-score');
  return response.data;
};
