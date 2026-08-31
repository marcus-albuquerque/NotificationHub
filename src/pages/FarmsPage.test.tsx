import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FarmsPage } from './FarmsPage';
import * as apiClient from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  farmsApi: {
    getAll: vi.fn(),
  },
  devicesApi: {
    getByFarmId: vi.fn(),
  },
  producersApi: {
    getById: vi.fn(),
  },
}));

const mockFarms = [
  {
    farm_id: 'farm-001',
    name: 'Boa Esperança',
    producer_id: 'producer-001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    device_count: 6,
  },
];

const mockDevices = [
  {
    device_id: 'temp-001',
    farm_id: 'farm-001',
    name: 'Sensor de Temperatura - Estufa 1',
    sensor_type: 'AIR_TEMPERATURE',
    status: 'active' as const,
    last_reading_at: '2024-01-15T14:30:00Z',
    last_value: '36.5',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    device_id: 'humid-001',
    farm_id: 'farm-001',
    name: 'Sensor de Umidade do Ar',
    sensor_type: 'AIR_HUMIDITY',
    status: 'active' as const,
    last_reading_at: '2024-01-15T14:30:00Z',
    last_value: '25.0',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockProducer = {
  producer_id: 'producer-001',
  name: 'João Silva',
  phone: '+5535999999999',
  email: 'joao.silva@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('FarmsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiClient.farmsApi.getAll).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<FarmsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading farms...')).toBeInTheDocument();
  });

  it('displays farms list after loading', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);

    render(<FarmsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Boa Esperança')).toBeInTheDocument();
    });

    expect(screen.getByText('ID: farm-001')).toBeInTheDocument();
    expect(screen.getByText('6 devices')).toBeInTheDocument();
  });

  it('displays error when farms fail to load', async () => {
    const error = new Error('Failed to fetch farms');
    vi.mocked(apiClient.farmsApi.getAll).mockRejectedValue(error);

    render(<FarmsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Error loading farms/)).toBeInTheDocument();
    });
  });

  it('displays devices when a farm is selected', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.devicesApi.getByFarmId).mockResolvedValue(mockDevices);
    vi.mocked(apiClient.producersApi.getById).mockResolvedValue(mockProducer);

    render(<FarmsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Boa Esperança')).toBeInTheDocument();
    });

    // Click on the farm to select it
    const farmButton = screen.getByText('Boa Esperança');
    await userEvent.click(farmButton);

    // Wait for devices to load
    await waitFor(() => {
      expect(screen.getByText('Sensor de Temperatura - Estufa 1')).toBeInTheDocument();
    });

    // Check device information is displayed
    expect(screen.getByText('Sensor de Umidade do Ar')).toBeInTheDocument();
    expect(screen.getByText('Air Temperature')).toBeInTheDocument();
    expect(screen.getByText('Air Humidity')).toBeInTheDocument();
  });

  it('displays producer information for selected farm', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.devicesApi.getByFarmId).mockResolvedValue(mockDevices);
    vi.mocked(apiClient.producersApi.getById).mockResolvedValue(mockProducer);

    render(<FarmsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Boa Esperança')).toBeInTheDocument();
    });

    const farmButton = screen.getByText('Boa Esperança');
    await userEvent.click(farmButton);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    expect(screen.getByText('+5535999999999')).toBeInTheDocument();
    expect(screen.getByText('joao.silva@example.com')).toBeInTheDocument();
  });

  it('shows correct status color for temperature threshold', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.devicesApi.getByFarmId).mockResolvedValue(mockDevices);
    vi.mocked(apiClient.producersApi.getById).mockResolvedValue(mockProducer);

    render(<FarmsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Boa Esperança')).toBeInTheDocument();
    });

    const farmButton = screen.getByText('Boa Esperança');
    await userEvent.click(farmButton);

    await waitFor(() => {
      expect(screen.getByText('Sensor de Temperatura - Estufa 1')).toBeInTheDocument();
    });

    // Temperature is 36.5, which is > 35, so should show "Critical" status
    const criticalStatus = screen.getByText('Critical');
    expect(criticalStatus).toBeInTheDocument();

    // Humidity is 25, which is < 30, so should show "Warning" status
    const warningStatus = screen.getByText('Warning');
    expect(warningStatus).toBeInTheDocument();
  });

  it('displays device last reading value', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.devicesApi.getByFarmId).mockResolvedValue(mockDevices);
    vi.mocked(apiClient.producersApi.getById).mockResolvedValue(mockProducer);

    render(<FarmsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Boa Esperança')).toBeInTheDocument();
    });

    const farmButton = screen.getByText('Boa Esperança');
    await userEvent.click(farmButton);

    await waitFor(() => {
      expect(screen.getByText('36.5')).toBeInTheDocument();
    });

    expect(screen.getByText('25.0')).toBeInTheDocument();
  });

  it('displays refresh button and allows refresh', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);

    render(<FarmsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Boa Esperança')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('🔄 Refresh');
    expect(refreshButton).toBeInTheDocument();

    await userEvent.click(refreshButton);

    // Verify the API was called again
    expect(apiClient.farmsApi.getAll).toHaveBeenCalledTimes(2);
  });

  it('shows empty state when no farms exist', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue([]);

    render(<FarmsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No farms found/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no farm is selected', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);

    render(<FarmsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Boa Esperança')).toBeInTheDocument();
    });

    // Should show prompt to select a farm
    expect(screen.getByText('Select a farm to view details and devices')).toBeInTheDocument();
  });

  it('handles device loading error gracefully', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.devicesApi.getByFarmId).mockRejectedValue(
      new Error('Failed to fetch devices'),
    );
    vi.mocked(apiClient.producersApi.getById).mockResolvedValue(mockProducer);

    render(<FarmsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Boa Esperança')).toBeInTheDocument();
    });

    const farmButton = screen.getByText('Boa Esperança');
    await userEvent.click(farmButton);

    await waitFor(() => {
      expect(screen.getByText(/Error loading devices/)).toBeInTheDocument();
    });
  });
});
