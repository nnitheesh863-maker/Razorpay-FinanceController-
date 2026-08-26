import { apiClient as axiosInstance } from './axios';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: UserResponse;
    token: string;
  };
}

export const loginUser = async (payload: any): Promise<AuthResponse> => {
  const response = await axiosInstance.post('/auth/login', payload);
  return response.data;
};

export const registerUser = async (payload: any): Promise<AuthResponse> => {
  const response = await axiosInstance.post('/auth/register', payload);
  return response.data;
};

export const getCurrentUser = async (): Promise<{ success: boolean; data: UserResponse }> => {
  const response = await axiosInstance.get('/auth/me');
  return response.data;
};
