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
export interface Device {
  device_id: string;
  farm_id: string;
  name: string;
  sensor_type: string;
  status: 'active' | 'inactive' | 'error';
  last_reading_at?: string;
  last_value?: string;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  farm_id: string;
  name: string;
  producer_id: string;
  created_at: string;
  updated_at?: string;
  devices?: Device[];
  producer?: Producer;
  device_count?: number;
}

export interface Producer {
  producer_id: string;
  name: string;
  phone: string;
  email?: string;
  notification_preferences?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id: string;
  farmId: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface FiredRule {
  ruleId: string;
  ruleName: string;
  firedAt: string;
}

export interface NotificationRecord {
  notificationId: string;
  message: string;
  generatedAt: string;
  dispatchStatus: 'pending' | 'sent' | 'failed' | 'retrying';
  dispatchError?: string;
}

export interface EventHistoryEntry {
  id: string;
  eventId: string;
  farmId: string;
  deviceId: string;
  receivedAt: string;
  validationStatus: 'valid' | 'rejected';
  validationError?: string;
  isDuplicate: boolean;
  previousEventId?: string;
  firedRules: FiredRule[];
  notifications: NotificationRecord[];
  processedAt: string;
  processingDurationMs: number;
  sensorType?: string;
  value?: number | string;
  unit?: string;
  timestamp?: string;
}

export interface Notification {
  notification_id: string;
  event_id: string;
  farm_id: string;
  device_id: string;
  producer_id: string;
  rule_id: string;
  rule_name: string;
  message: string;
  event_value?: string | number;
  event_timestamp?: string;
  generated_at: string;
  dispatch_status: 'pending' | 'sent' | 'failed' | 'retrying';
  dispatch_error?: string;
  retry_count?: number;
  last_retry_at?: string;
  created_at: string;
  updated_at: string;
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
    const response = await apiClient.get<any>('/api/farms');
    return response.data?.data || response.data || [];
  },
  getById: async (id: string): Promise<Farm> => {
    const response = await apiClient.get<any>(`/api/farms/${id}`);
    return response.data?.data || response.data;
  },
};

export const devicesApi = {
  getByFarmId: async (farmId: string): Promise<Device[]> => {
    const response = await apiClient.get<any>(`/api/farms/${farmId}/devices`);
    return response.data?.data || response.data || [];
  },
  getById: async (farmId: string, deviceId: string): Promise<Device> => {
    const response = await apiClient.get<any>(`/api/farms/${farmId}/devices/${deviceId}`);
    return response.data?.data || response.data;
  },
};

export const producersApi = {
  getAll: async (): Promise<Producer[]> => {
    const response = await apiClient.get<any>('/api/producers');
    return response.data?.data || response.data || [];
  },
  getById: async (id: string): Promise<Producer> => {
    const response = await apiClient.get<any>(`/api/producers/${id}`);
    return response.data?.data || response.data;
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
  getByFarm: async (
    farmId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Event>> => {
    const response = await apiClient.get<PaginatedResponse<Event>>(`/api/farms/${farmId}/events`, {
      params,
    });
    return response.data;
  },
};

export const eventHistoryApi = {
  getByFarmId: async (
    farmId: string,
    params?: {
      page?: number;
      limit?: number;
      sensorType?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ): Promise<PaginatedResponse<EventHistoryEntry>> => {
    const response = await apiClient.get<PaginatedResponse<EventHistoryEntry>>(
      `/api/history/farm/${farmId}`,
      { params }
    );
    return response.data;
  },
  getByEventId: async (eventId: string): Promise<EventHistoryEntry> => {
    const response = await apiClient.get<EventHistoryEntry>(`/api/history/${eventId}`);
    return response.data;
  },
};

export const notificationsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>('/api/notifications', {
      params,
    });
    return response.data;
  },
  getById: async (id: string): Promise<Notification> => {
    const response = await apiClient.get<Notification>(`/api/notifications/${id}`);
    return response.data;
  },
  getByFarm: async (
    farmId: string,
    params?: {
      page?: number;
      limit?: number;
      ruleId?: string;
      ruleName?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>(
      `/api/farms/${farmId}/notifications`,
      { params }
    );
    return response.data;
  },
  retry: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.post<Notification>(
      `/api/notifications/${notificationId}/retry`
    );
    return response.data;
  },
};

export default apiClient;
