import { apiClient as axiosInstance } from './axios';

// Query the AI Finance Copilot with question & optional conversation context
export const queryCopilot = async (question: string, conversationId?: string) => {
  const response = await axiosInstance.post('/copilot/query', { question, conversationId });
  return response.data;
};

// Retrieve specific financial record details from database for evidence chip previews
export const getRecordDetails = async (externalId: string) => {
  const response = await axiosInstance.get(`/copilot/records/${externalId}`);
  return response.data;
};
