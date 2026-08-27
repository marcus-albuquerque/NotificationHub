import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Device } from '../api/client';
import { farmsApi, devicesApi, producersApi } from '../api/client';

type StatusColor = 'green' | 'yellow' | 'red' | 'gray';

export function FarmsPage() {
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

  // Query: Fetch all farms
  const {
    data: farms,
    isLoading: farmsLoading,
    error: farmsError,
    refetch: refetchFarms,
  } = useQuery({
    queryKey: ['farms'],
    queryFn: farmsApi.getAll,
  });

  // Query: Fetch devices for selected farm
  const {
    data: devices,
    isLoading: devicesLoading,
    error: devicesError,
  } = useQuery({
    queryKey: ['devices', selectedFarmId],
    queryFn: () => (selectedFarmId ? devicesApi.getByFarmId(selectedFarmId) : Promise.resolve([])),
    enabled: !!selectedFarmId,
  });

  // Query: Fetch producers for the selected farm
  const selectedFarm = farms?.find((f) => f.farm_id === selectedFarmId);
  const { data: producer, isLoading: producerLoading } = useQuery({
    queryKey: ['producer', selectedFarm?.producer_id],
    queryFn: () =>
      selectedFarm?.producer_id
        ? producersApi.getById(selectedFarm.producer_id)
        : Promise.resolve(null),
    enabled: !!selectedFarm?.producer_id,
  });

  // Determine status color based on device reading
  const getStatusColor = (device: Device): StatusColor => {
    if (!device.last_value) return 'gray';

    const sensorType = device.sensor_type;
    const value = parseFloat(device.last_value);

    // Temperature thresholds
    if (sensorType === 'AIR_TEMPERATURE') {
      if (value > 35) return 'red'; // HIGH_AIR_TEMPERATURE
      if (value > 30) return 'yellow';
      return 'green';
    }

    // Humidity thresholds
    if (sensorType === 'AIR_HUMIDITY') {
      if (value < 30) return 'red'; // LOW_AIR_HUMIDITY
      if (value < 40) return 'yellow';
      return 'green';
    }

    // Soil moisture thresholds
    if (sensorType === 'SOIL_MOISTURE') {
      if (value < 20) return 'red'; // LOW_SOIL_MOISTURE
      if (value < 30) return 'yellow';
      return 'green';
    }

    // Water reservoir thresholds
    if (sensorType === 'WATER_RESERVOIR_LEVEL') {
      if (value < 15) return 'red'; // LOW_WATER_RESERVOIR
      if (value < 30) return 'yellow';
      return 'green';
    }

    // Silo level thresholds
    if (sensorType === 'SILO_LEVEL') {
      if (value < 15) return 'red'; // LOW_SILO_LEVEL
      if (value < 30) return 'yellow';
      return 'green';
    }

    // Equipment status
    if (sensorType === 'EQUIPMENT_STATUS') {
      return device.last_value === 'FAILURE' ? 'red' : 'green'; // EQUIPMENT_FAILURE
    }

    return 'gray';
  };

  const getStatusIcon = (color: StatusColor) => {
    const iconMap: Record<StatusColor, string> = {
      green: '🟢',
      yellow: '🟡',
      red: '🔴',
      gray: '⚫',
    };
    return iconMap[color];
  };

  const getStatusLabel = (color: StatusColor) => {
    const labelMap: Record<StatusColor, string> = {
      green: 'Normal',
      yellow: 'Warning',
      red: 'Critical',
      gray: 'No data',
    };
    return labelMap[color];
  };

  const getSensorTypeLabel = (sensorType: string): string => {
    const labels: Record<string, string> = {
      AIR_TEMPERATURE: 'Air Temperature',
      AIR_HUMIDITY: 'Air Humidity',
      SOIL_MOISTURE: 'Soil Moisture',
      WATER_RESERVOIR_LEVEL: 'Water Reservoir',
      SILO_LEVEL: 'Silo Level',
      EQUIPMENT_STATUS: 'Equipment Status',
    };
    return labels[sensorType] || sensorType;
  };

  if (farmsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading farms...</div>
      </div>
    );
  }

  if (farmsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading farms: {(farmsError as Error).message}</p>
      </div>
    );
  }

  if (!farms || farms.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Farms</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">No farms found. Create your first farm to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Farms</h1>
        <button
          onClick={() => refetchFarms()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Farms List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Your Farms</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {farms.map((farm) => (
                <button
                  key={farm.farm_id}
                  onClick={() => setSelectedFarmId(farm.farm_id)}
                  className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors ${
                    selectedFarmId === farm.farm_id
                      ? 'bg-indigo-50 border-l-4 border-indigo-600'
                      : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">{farm.name}</div>
                  <div className="text-sm text-gray-500 mt-1">ID: {farm.farm_id}</div>
                  {farm.device_count !== undefined && (
                    <div className="text-xs text-gray-400 mt-1">{farm.device_count} devices</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Farm Details */}
        <div className="lg:col-span-2">
          {selectedFarmId && selectedFarm ? (
            <div className="space-y-6">
              {/* Farm Header */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{selectedFarm.name}</h2>

                {producerLoading ? (
                  <div className="text-gray-500">Loading producer...</div>
                ) : producer ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Producer</p>
                      <p className="font-medium text-gray-900">{producer.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{producer.phone}</p>
                    </div>
                    {producer.email && (
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{producer.email}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Farm ID</p>
                      <p className="font-medium text-gray-900 text-sm">{selectedFarm.farm_id}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Devices */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-lg">Devices</h3>
                </div>

                {devicesLoading ? (
                  <div className="p-6 text-center text-gray-500">Loading devices...</div>
                ) : devicesError ? (
                  <div className="p-6 bg-red-50 border-t border-red-200">
                    <p className="text-red-700">
                      Error loading devices: {(devicesError as Error).message}
                    </p>
                  </div>
                ) : !devices || devices.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No devices found for this farm.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {devices.map((device) => {
                      const statusColor = getStatusColor(device);
                      return (
                        <div
                          key={device.device_id}
                          className="p-6 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">{device.name}</h4>
                                <span className="text-lg">{getStatusIcon(statusColor)}</span>
                                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                  {getStatusLabel(statusColor)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {getSensorTypeLabel(device.sensor_type)}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">ID: {device.device_id}</p>
                            </div>
                          </div>

                          {/* Last Reading */}
                          <div className="bg-gray-50 rounded p-3">
                            {device.last_value !== null && device.last_value !== undefined ? (
                              <div>
                                <p className="text-2xl font-bold text-gray-900">
                                  {device.last_value}
                                </p>
                                <div className="flex justify-between items-end mt-2">
                                  <p className="text-xs text-gray-500">
                                    {device.sensor_type === 'EQUIPMENT_STATUS'
                                      ? 'Status'
                                      : device.sensor_type === 'AIR_TEMPERATURE'
                                        ? '°C'
                                        : device.sensor_type === 'AIR_HUMIDITY'
                                          ? '%'
                                          : device.sensor_type === 'SOIL_MOISTURE'
                                            ? '%'
                                            : device.sensor_type === 'WATER_RESERVOIR_LEVEL'
                                              ? '%'
                                              : device.sensor_type === 'SILO_LEVEL'
                                                ? '%'
                                                : 'Unit'}
                                  </p>
                                  {device.last_reading_at && (
                                    <p className="text-xs text-gray-400">
                                      Last reading:{' '}
                                      {new Date(device.last_reading_at).toLocaleTimeString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No readings yet</p>
                            )}
                          </div>

                          {/* Status Indicator */}
                          <div className="mt-3">
                            <p className="text-xs text-gray-600">
                              Status: <span className="font-medium">{device.status}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">Select a farm to view details and devices</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
