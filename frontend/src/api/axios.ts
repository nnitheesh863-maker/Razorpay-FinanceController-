import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Phase 4 will fully implement auth token retrieval.
    // For now, we mock the retrieval if a token exists in localStorage.
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      
      if (status === 401) {
        // Clear token and redirect to login (Implementation in Phase 4)
        console.warn('Unauthorized access - token may be invalid or expired.');
      }
      
      // Standardize error message from backend
      const data = error.response.data as any;
      const errorMessage = data?.error?.message || data?.message || 'An unexpected error occurred';
      
      error.message = errorMessage;
    } else if (error.request) {
      // The request was made but no response was received
      error.message = 'No response from the server. Please check your connection.';
    } else {
      // Something happened in setting up the request that triggered an Error
      error.message = 'Error setting up the request.';
    }
    
    return Promise.reject(error);
  }
);
