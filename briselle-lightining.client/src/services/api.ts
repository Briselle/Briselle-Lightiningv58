import axios from 'axios';

// In a real application, you would configure the base URL to your .NET Core API
const baseURL = '/api';

// Create axios instance
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors (401, 403, etc.)
    if (error.response) {
      const { status } = error.response;
      
      if (status === 401) {
        // Redirect to login page
        window.location.href = '/login';
      }
      
      if (status === 403) {
        // Handle forbidden access
        console.error('Access forbidden');
      }
    }
    
    return Promise.reject(error);
  }
);

// API service methods
export const objectsApi = {
  getObjects: () => api.get('/objects'),
  getObjectById: (id: string) => api.get(`/objects/${id}`),
  createObject: (data: any) => api.post('/objects', data),
  updateObject: (id: string, data: any) => api.put(`/objects/${id}`, data),
  deleteObject: (id: string) => api.delete(`/objects/${id}`),
  
  // Fields
  getFields: (objectId: string) => api.get(`/objects/${objectId}/fields`),
  createField: (objectId: string, data: any) => api.post(`/objects/${objectId}/fields`, data),
  updateField: (objectId: string, fieldId: string, data: any) => 
    api.put(`/objects/${objectId}/fields/${fieldId}`, data),
  deleteField: (objectId: string, fieldId: string) => 
    api.delete(`/objects/${objectId}/fields/${fieldId}`),
};

export const recordsApi = {
  getRecords: (objectId: string, params: any = {}) => 
    api.get(`/objects/${objectId}/records`, { params }),
  getRecordById: (objectId: string, id: string) => 
    api.get(`/objects/${objectId}/records/${id}`),
  createRecord: (objectId: string, data: any) => 
    api.post(`/objects/${objectId}/records`, data),
  updateRecord: (objectId: string, id: string, data: any) => 
    api.put(`/objects/${objectId}/records/${id}`, data),
  deleteRecord: (objectId: string, id: string) => 
    api.delete(`/objects/${objectId}/records/${id}`),
};

export const usersApi = {
  getUsers: () => api.get('/users'),
  getUserById: (id: string) => api.get(`/users/${id}`),
  createUser: (data: any) => api.post('/users', data),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
};

export const authApi = {
  login: (credentials: { email: string; password: string }) => 
    api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

export default api;