import { apiClient } from './axios';

export const adminRegister = async (data: any) => {
  const response = await apiClient.post('/auth/admin/register', data);
  return response.data;
};

export const adminLogin = async (data: any) => {
  const response = await apiClient.post('/auth/admin/login', data);
  return response.data;
};

export const getAdminDashboard = async () => {
  const response = await apiClient.get('/admin/dashboard');
  return response.data;
};
