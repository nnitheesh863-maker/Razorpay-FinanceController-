import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/axios';

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  authProvider: 'EMAIL' | 'PHONE' | 'BOTH';
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (payload: any) => Promise<void>;
  signup: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  setAuthData: (user: User, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiClient.get('/auth/me');
        if (response.data?.success && response.data?.data?.user) {
          const userDetails = response.data.data.user;
          setUser(userDetails);
          localStorage.setItem('user', JSON.stringify(userDetails));
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Session restoration failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (payload: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', payload);
      if (response.data?.success && response.data?.data?.token) {
        const { token, user: userDetails } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userDetails));
        setUser(userDetails);
      } else {
        throw new Error(response.data?.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      // Extract clean error message from Axios error
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (status === 401) throw new Error('Invalid email or password. Please try again.');
      if (status === 429) throw new Error('Too many login attempts. Please wait a moment and try again.');
      if (status === 403) throw new Error('Access denied. Your account may be suspended.');
      if (!err?.response) throw new Error('Cannot connect to server. Please check your connection.');
      throw new Error(serverMsg || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/signup', payload);
      if (response.data?.success && response.data?.data?.token) {
        const { token, user: userDetails } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userDetails));
        setUser(userDetails);
      } else {
        throw new Error(response.data?.message || 'Registration failed.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (status === 409) throw new Error('An account with this email already exists.');
      if (status === 429) throw new Error('Too many attempts. Please wait a moment and try again.');
      if (!err?.response) throw new Error('Cannot connect to server. Please check your connection.');
      throw new Error(serverMsg || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  const logout = async () => {
    setLoading(true);
    try {
      await apiClient.post('/auth/logout').catch(() => { });
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    }
  };

  const setAuthData = (userDetails: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userDetails));
    setUser(userDetails);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        setAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
