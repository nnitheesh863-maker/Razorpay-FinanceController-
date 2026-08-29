import { apiClient as axiosInstance } from './axios';

// 1. Connect Razorpay
export const connectRazorpay = async (keyId: string) => {
  const response = await axiosInstance.post('/integrations/razorpay/connect', { keyId });
  return response.data;
};

// 2. Get Razorpay Status
export const getRazorpayStatus = async () => {
  const response = await axiosInstance.get('/integrations/razorpay/status');
  return response.data;
};

// 3. Sync Razorpay Data
export const syncRazorpay = async () => {
  const response = await axiosInstance.post('/integrations/razorpay/sync');
  return response.data;
};
