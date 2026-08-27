import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { EventHistoryEntry } from '../api/client';
import { eventHistoryApi, farmsApi } from '../api/client';

interface EventFilters {
  sensorType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

const SENSOR_TYPES = [
  'AIR_TEMPERATURE',
  'AIR_HUMIDITY',
  'SOIL_MOISTURE',
  'WATER_RESERVOIR_LEVEL',
  'SILO_LEVEL',
  'EQUIPMENT_STATUS',
];

const SENSOR_LABELS: Record<string, string> = {
  AIR_TEMPERATURE: 'Air Temperature',
  AIR_HUMIDITY: 'Air Humidity',
  SOIL_MOISTURE: 'Soil Moisture',
  WATER_RESERVOIR_LEVEL: 'Water Reservoir',
  SILO_LEVEL: 'Silo Level',
  EQUIPMENT_STATUS: 'Equipment Status',
};

const STATUS_OPTIONS = [
  { value: 'valid', label: 'Valid' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'duplicate', label: 'Duplicate' },
];

export function EventsPage() {
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<EventFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  // Query: Fetch all farms to allow selection
  const { data: farms, isLoading: farmsLoading } = useQuery({
    queryKey: ['farms'],
    queryFn: farmsApi.getAll,
  });

  // Query: Fetch events for selected farm
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['eventHistory', selectedFarmId, page, filters],
    queryFn: () => {
      if (!selectedFarmId)
        return Promise.resolve({ data: [], total: 0, page: 1, limit, totalPages: 0 });
      return eventHistoryApi.getByFarmId(selectedFarmId, {
        page,
        limit,
        ...filters,
      });
    },
    enabled: !!selectedFarmId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'duplicate':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return '✅';
      case 'rejected':
        return '❌';
      case 'duplicate':
        return '🔄';
      default:
        return '❓';
    }
  };

  const handleFilterChange = (field: keyof EventFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleApplyFilters = () => {
    setPage(1);
    refetch();
  };

  const handleFarmChange = (farmId: string) => {
    setSelectedFarmId(farmId);
    setPage(1);
    setFilters({});
  };

  if (farmsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading farms...</div>
      </div>
    );
  }

  if (!farms || farms.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No farms available. Please create a farm first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showFilters ? '✕ Hide Filters' : '🔍 Show Filters'}
        </button>
      </div>

      {/* Farm Selection */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Farm</label>
        <select
          value={selectedFarmId || ''}
          onChange={(e) => handleFarmChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Choose a farm...</option>
          {farms.map((farm) => (
            <option key={farm.farm_id} value={farm.farm_id}>
              {farm.name} ({farm.farm_id})
            </option>
          ))}
        </select>
      </div>

      {selectedFarmId && (
        <>
          {/* Filters Section */}
          {showFilters && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sensor Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sensor Type
                  </label>
                  <select
                    value={filters.sensorType || ''}
                    onChange={(e) => handleFilterChange('sensorType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Types</option>
                    {SENSOR_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {SENSOR_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleApplyFilters}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleResetFilters}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Events Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">Loading events...</div>
            ) : error ? (
              <div className="p-6 bg-red-50 border-b border-red-200">
                <p className="text-red-700">Error loading events: {(error as Error).message}</p>
              </div>
            ) : !data?.data || data.data.length === 0 ? (
              <div className="p-6">
                <p className="text-gray-500">No events found for the selected farm.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sensor Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.data.map((event: EventHistoryEntry) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {event.eventId.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.deviceId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {event.sensorType
                              ? SENSOR_LABELS[event.sensorType] || event.sensorType
                              : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {event.value}{' '}
                          <span className="text-gray-500 font-normal">{event.unit}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getStatusColor(
                                event.isDuplicate ? 'duplicate' : event.validationStatus
                              )}`}
                            >
                              {getStatusIcon(
                                event.isDuplicate ? 'duplicate' : event.validationStatus
                              )}
                              {event.isDuplicate
                                ? 'Duplicate'
                                : event.validationStatus === 'valid'
                                  ? 'Valid'
                                  : 'Rejected'}
                            </span>
                            {event.validationError && (
                              <span className="text-xs text-red-600 max-w-xs truncate">
                                Error: {event.validationError}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Page {data.page} of {data.totalPages} ({data.total} total)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm font-medium text-gray-700">{page}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
