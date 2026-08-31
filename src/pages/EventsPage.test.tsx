import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventsPage } from './EventsPage';
import * as apiClient from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  farmsApi: {
    getAll: vi.fn(),
  },
  eventHistoryApi: {
    getByFarmId: vi.fn(),
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
  {
    farm_id: 'farm-002',
    name: 'Fazenda Sul',
    producer_id: 'producer-002',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    device_count: 3,
  },
];

const mockEvents = [
  {
    id: 'history-001',
    eventId: 'evt-001',
    farmId: 'farm-001',
    deviceId: 'temp-001',
    sensorType: 'AIR_TEMPERATURE',
    value: 36.5,
    unit: '°C',
    timestamp: '2024-01-15T14:30:00Z',
    receivedAt: '2024-01-15T14:30:01Z',
    validationStatus: 'valid' as const,
    isDuplicate: false,
    firedRules: [
      {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        ruleName: 'High Air Temperature',
        firedAt: '2024-01-15T14:30:02Z',
      },
    ],
    notifications: [],
    processedAt: '2024-01-15T14:30:03Z',
    processingDurationMs: 2,
  },
  {
    id: 'history-002',
    eventId: 'evt-002',
    farmId: 'farm-001',
    deviceId: 'humid-001',
    sensorType: 'AIR_HUMIDITY',
    value: 25.0,
    unit: '%',
    timestamp: '2024-01-15T14:25:00Z',
    receivedAt: '2024-01-15T14:25:01Z',
    validationStatus: 'valid' as const,
    isDuplicate: false,
    firedRules: [
      {
        ruleId: 'LOW_AIR_HUMIDITY',
        ruleName: 'Low Air Humidity',
        firedAt: '2024-01-15T14:25:02Z',
      },
    ],
    notifications: [],
    processedAt: '2024-01-15T14:25:03Z',
    processingDurationMs: 2,
  },
  {
    id: 'history-003',
    eventId: 'evt-003',
    farmId: 'farm-001',
    deviceId: 'temp-001',
    sensorType: 'AIR_TEMPERATURE',
    value: 36.5,
    unit: '°C',
    timestamp: '2024-01-15T14:20:00Z',
    receivedAt: '2024-01-15T14:20:01Z',
    validationStatus: 'valid' as const,
    isDuplicate: true,
    firedRules: [],
    notifications: [],
    processedAt: '2024-01-15T14:20:03Z',
    processingDurationMs: 2,
  },
  {
    id: 'history-004',
    eventId: 'evt-004',
    farmId: 'farm-001',
    deviceId: 'soil-001',
    sensorType: 'SOIL_MOISTURE',
    value: null,
    unit: '%',
    timestamp: '2024-01-15T14:15:00Z',
    receivedAt: '2024-01-15T14:15:01Z',
    validationStatus: 'rejected' as const,
    validationError: 'Invalid value: expected number',
    isDuplicate: false,
    firedRules: [],
    notifications: [],
    processedAt: '2024-01-15T14:15:03Z',
    processingDurationMs: 2,
  },
];

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

describe('EventsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially for farms', () => {
    vi.mocked(apiClient.farmsApi.getAll).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<EventsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading farms...')).toBeInTheDocument();
  });

  it('displays farm selection dropdown after loading', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);

    render(<EventsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Select Farm')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('shows empty state when no farms exist', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue([]);

    render(<EventsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No farms available/)).toBeInTheDocument();
    });
  });

  it('fetches events when a farm is selected', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Select Farm')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(apiClient.eventHistoryApi.getByFarmId).toHaveBeenCalledWith('farm-001', {
        page: 1,
        limit: 20,
      });
    });
  });

  it('displays events in table after selection and loading', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Select Farm')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('evt-001')).toBeInTheDocument();
    });

    // Check all events are displayed
    expect(screen.getByText('temp-001')).toBeInTheDocument();
    expect(screen.getByText('humid-001')).toBeInTheDocument();
    expect(screen.getByText('soil-001')).toBeInTheDocument();
  });

  it('displays correct sensor type labels', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('Air Temperature')).toBeInTheDocument();
    });

    expect(screen.getByText('Air Humidity')).toBeInTheDocument();
    expect(screen.getByText('Soil Moisture')).toBeInTheDocument();
  });

  it('displays correct status badges for valid/rejected/duplicate events', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });

    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('displays validation error message for rejected events', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText(/Invalid value: expected number/)).toBeInTheDocument();
    });
  });

  it('displays event values with units', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('36.5')).toBeInTheDocument();
    });

    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('applies sensor type filter correctly', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: [mockEvents[0]], // Only temperature events
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('🔍 Show Filters')).toBeInTheDocument();
    });

    const filterButton = screen.getByText('🔍 Show Filters');
    await userEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('All Types')).toBeInTheDocument();
    });

    const sensorTypeSelect = screen.getAllByRole('combobox')[1];
    await userEvent.selectOption(sensorTypeSelect, 'AIR_TEMPERATURE');

    const applyButton = screen.getByText('Apply Filters');
    await userEvent.click(applyButton);

    await waitFor(() => {
      expect(apiClient.eventHistoryApi.getByFarmId).toHaveBeenCalledWith('farm-001', {
        page: 1,
        limit: 20,
        sensorType: 'AIR_TEMPERATURE',
      });
    });
  });

  it('applies status filter correctly', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: [mockEvents[3]], // Only rejected events
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('🔍 Show Filters')).toBeInTheDocument();
    });

    const filterButton = screen.getByText('🔍 Show Filters');
    await userEvent.click(filterButton);

    const statusSelect = screen.getAllByRole('combobox')[2];
    await userEvent.selectOption(statusSelect, 'rejected');

    const applyButton = screen.getByText('Apply Filters');
    await userEvent.click(applyButton);

    await waitFor(() => {
      expect(apiClient.eventHistoryApi.getByFarmId).toHaveBeenCalledWith('farm-001', {
        page: 1,
        limit: 20,
        status: 'rejected',
      });
    });
  });

  it('applies date range filter correctly', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('🔍 Show Filters')).toBeInTheDocument();
    });

    const filterButton = screen.getByText('🔍 Show Filters');
    await userEvent.click(filterButton);

    const dateInputs = screen.getAllByRole('textbox');
    const fromDateInput = dateInputs[0];
    const toDateInput = dateInputs[1];

    await userEvent.type(fromDateInput, '2024-01-15');
    await userEvent.type(toDateInput, '2024-01-16');

    const applyButton = screen.getByText('Apply Filters');
    await userEvent.click(applyButton);

    await waitFor(() => {
      expect(apiClient.eventHistoryApi.getByFarmId).toHaveBeenCalledWith('farm-001', {
        page: 1,
        limit: 20,
        startDate: '2024-01-15',
        endDate: '2024-01-16',
      });
    });
  });

  it('resets filters when reset button is clicked', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('🔍 Show Filters')).toBeInTheDocument();
    });

    const filterButton = screen.getByText('🔍 Show Filters');
    await userEvent.click(filterButton);

    const sensorTypeSelect = screen.getAllByRole('combobox')[1];
    await userEvent.selectOption(sensorTypeSelect, 'AIR_TEMPERATURE');

    const resetButton = screen.getByText('Reset');
    await userEvent.click(resetButton);

    await waitFor(() => {
      expect(apiClient.eventHistoryApi.getByFarmId).toHaveBeenCalledWith('farm-001', {
        page: 1,
        limit: 20,
      });
    });
  });

  it('handles error loading events gracefully', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockRejectedValue(
      new Error('Failed to fetch events'),
    );

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText(/Error loading events/)).toBeInTheDocument();
    });
  });

  it('displays pagination controls when there are multiple pages', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: 50, // More than 20 per page
      page: 1,
      limit: 20,
      totalPages: 3,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3 (50 total)')).toBeInTheDocument();
    });

    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('handles pagination correctly', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: 50,
      page: 1,
      limit: 20,
      totalPages: 3,
    });

    const { rerender } = render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3 (50 total)')).toBeInTheDocument();
    });

    // Update mock for page 2
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: 50,
      page: 2,
      limit: 20,
      totalPages: 3,
    });

    const nextButton = screen.getByText('Next');
    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(apiClient.eventHistoryApi.getByFarmId).toHaveBeenCalledWith('farm-001', {
        page: 2,
        limit: 20,
      });
    });
  });

  it('shows no events message when farm has no events', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText(/No events found for the selected farm/)).toBeInTheDocument();
    });
  });

  it('displays timestamps in locale format', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      // Just verify timestamps are being displayed (exact format depends on locale)
      const cells = screen.getAllByText(/2024-01-15/);
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  it('hides filter UI when show/hide filter is toggled', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    await userEvent.selectOption(select, 'farm-001');

    await waitFor(() => {
      expect(screen.getByText('🔍 Show Filters')).toBeInTheDocument();
    });

    // Show filters
    let filterButton = screen.getByText('🔍 Show Filters');
    await userEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('✕ Hide Filters')).toBeInTheDocument();
    });

    // Hide filters
    filterButton = screen.getByText('✕ Hide Filters');
    await userEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('🔍 Show Filters')).toBeInTheDocument();
    });
  });

  it('changes farm and resets filters', async () => {
    vi.mocked(apiClient.farmsApi.getAll).mockResolvedValue(mockFarms);
    vi.mocked(apiClient.eventHistoryApi.getByFarmId).mockResolvedValue({
      data: mockEvents,
      total: mockEvents.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<EventsPage />, { wrapper: createWrapper() });

    const select = screen.getByRole('combobox');
    
    // Select farm-001
    await userEvent.selectOption(select, 'farm-001');
    await waitFor(() => {
      expect(apiClient.eventHistoryApi.getByFarmId).toHaveBeenCalledWith('farm-001', {
        page: 1,
        limit: 20,
      });
    });

    // Select farm-002
    await userEvent.selectOption(select, 'farm-002');
    await waitFor(() => {
      expect(apiClient.eventHistoryApi.getByFarmId).toHaveBeenCalledWith('farm-002', {
        page: 1,
        limit: 20,
      });
    });

    // Verify filters were reset when changing farms
    expect(apiClient.eventHistoryApi.getByFarmId).toHaveBeenLastCalledWith('farm-002', {
      page: 1,
      limit: 20,
    });
  });
});
