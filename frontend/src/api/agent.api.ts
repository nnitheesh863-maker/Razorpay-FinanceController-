import { apiClient as axiosInstance } from './axios';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  data: ChatMessage;
}

export const sendMessageToAgent = async (messages: ChatMessage[]): Promise<ChatResponse> => {
  const response = await axiosInstance.post('/agent/chat', { messages });
  return response.data;
};
