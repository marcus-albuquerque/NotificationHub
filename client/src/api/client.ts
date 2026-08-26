import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface Farm {
  id: string;
  name: string;
  location: string;
  producerId: string;
  createdAt: string;
}

export interface Producer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Event {
  id: string;
  farmId: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface Notification {
  id: string;
  farmId: string;
  producerId: string;
  type: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API functions
export const farmsApi = {
  getAll: async (): Promise<Farm[]> => {
    const response = await apiClient.get<Farm[]>('/api/farms');
    return response.data;
  },
  getById: async (id: string): Promise<Farm> => {
    const response = await apiClient.get<Farm>(`/api/farms/${id}`);
    return response.data;
  },
};

export const producersApi = {
  getAll: async (): Promise<Producer[]> => {
    const response = await apiClient.get<Producer[]>('/api/producers');
    return response.data;
  },
  getById: async (id: string): Promise<Producer> => {
    const response = await apiClient.get<Producer>(`/api/producers/${id}`);
    return response.data;
  },
};

export const eventsApi = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Event>> => {
    const response = await apiClient.get<PaginatedResponse<Event>>('/api/events', { params });
    return response.data;
  },
  getById: async (id: string): Promise<Event> => {
    const response = await apiClient.get<Event>(`/api/events/${id}`);
    return response.data;
  },
  getByFarm: async (farmId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Event>> => {
    const response = await apiClient.get<PaginatedResponse<Event>>(`/api/farms/${farmId}/events`, { params });
    return response.data;
  },
};

export const notificationsApi = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>('/api/notifications', { params });
    return response.data;
  },
  getById: async (id: string): Promise<Notification> => {
    const response = await apiClient.get<Notification>(`/api/notifications/${id}`);
    return response.data;
  },
  getByFarm: async (farmId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>(`/api/farms/${farmId}/notifications`, { params });
    return response.data;
  },
};

export default apiClient;