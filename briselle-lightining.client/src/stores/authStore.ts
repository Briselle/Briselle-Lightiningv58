import { create } from 'zustand';
import { authApi } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      const { token, user } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('auth_token', token);
      
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: 'Invalid email or password',
        isAuthenticated: false,
        user: null
      });
    }
  },
  
  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
      localStorage.removeItem('auth_token');
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
    } catch (error) {
      // Even if the API call fails, we still want to clear local state
      localStorage.removeItem('auth_token');
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
    }
  },
  
  getCurrentUser: async () => {
    // Only attempt to get current user if we have a token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false
      });
      return;
    }
    
    set({ isLoading: true });
    try {
      const response = await authApi.getCurrentUser();
      set({ 
        user: response.data, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      // If getting current user fails, clear auth state
      localStorage.removeItem('auth_token');
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: 'Session expired. Please login again.'
      });
    }
  }
}));