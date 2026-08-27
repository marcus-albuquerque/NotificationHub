import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { farmsApi, devicesApi, apiClient } from '../api/client';

type SensorType =
  | 'AIR_TEMPERATURE'
  | 'AIR_HUMIDITY'
  | 'SOIL_MOISTURE'
  | 'WATER_RESERVOIR_LEVEL'
  | 'SILO_LEVEL'
  | 'EQUIPMENT_STATUS';

interface SensorConfig {
  label: string;
  unit: string;
  suggestedValue: number | string;
  minValue?: number;
  maxValue?: number;
  description: string;
}

const SENSOR_CONFIGS: Record<SensorType, SensorConfig> = {
  AIR_TEMPERATURE: {
    label: 'Air Temperature',
    unit: '°C',
    suggestedValue: 25,
    minValue: -10,
    maxValue: 50,
    description: 'Typical range: 15-35°C (Critical if > 35°C)',
  },
  AIR_HUMIDITY: {
    label: 'Air Humidity',
    unit: '%',
    suggestedValue: 60,
    minValue: 0,
    maxValue: 100,
    description: 'Typical range: 40-80% (Critical if < 30%)',
  },
  SOIL_MOISTURE: {
    label: 'Soil Moisture',
    unit: '%',
    suggestedValue: 45,
    minValue: 0,
    maxValue: 100,
    description: 'Typical range: 30-60% (Critical if < 20%)',
  },
  WATER_RESERVOIR_LEVEL: {
    label: 'Water Reservoir Level',
    unit: '%',
    suggestedValue: 80,
    minValue: 0,
    maxValue: 100,
    description: 'Typical range: 30-100% (Critical if < 15%)',
  },
  SILO_LEVEL: {
    label: 'Silo Level',
    unit: '%',
    suggestedValue: 70,
    minValue: 0,
    maxValue: 100,
    description: 'Typical range: 30-100% (Critical if < 15%)',
  },
  EQUIPMENT_STATUS: {
    label: 'Equipment Status',
    unit: 'Status',
    suggestedValue: 'OK',
    description: 'Valid values: OK, FAILURE (Alert if = FAILURE)',
  },
};

export function SimulatorPage() {
  const { data: farms, isLoading: farmsLoading } = useQuery({
    queryKey: ['farms'],
    queryFn: farmsApi.getAll,
  });

  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedSensorType, setSelectedSensorType] = useState<SensorType>('AIR_TEMPERATURE');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [resultEventId, setResultEventId] = useState<string | null>(null);

  // Fetch devices for selected farm
  const { data: devices = [] } = useQuery({
    queryKey: ['devices', selectedFarmId],
    queryFn: () => (selectedFarmId ? devicesApi.getByFarmId(selectedFarmId) : Promise.resolve([])),
    enabled: !!selectedFarmId,
  });

  // Filter devices by selected sensor type
  const filteredDevices = devices.filter((d) => d.sensor_type === selectedSensorType);

  // Get current sensor config
  const sensorConfig = SENSOR_CONFIGS[selectedSensorType];

  // Handle farm selection change
  const handleFarmChange = (farmId: string) => {
    setSelectedFarmId(farmId);
    setSelectedDeviceId('');
    setValue('');
    setUnit(sensorConfig.unit);
  };

  // Handle sensor type change
  const handleSensorTypeChange = (sensorType: SensorType) => {
    setSelectedSensorType(sensorType);
    setSelectedDeviceId('');
    const config = SENSOR_CONFIGS[sensorType];
    setValue(String(config.suggestedValue));
    setUnit(config.unit);
  };

  // Auto-fill with suggested value when sensor type changes
  const fillSuggestedValue = () => {
    setValue(String(sensorConfig.suggestedValue));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultEventId(null);

    // Validation
    if (!selectedFarmId) {
      setMessage('Please select a farm');
      setStatus('error');
      return;
    }

    if (!selectedDeviceId) {
      setMessage('Please select a device');
      setStatus('error');
      return;
    }

    if (!value) {
      setMessage('Please enter a value');
      setStatus('error');
      return;
    }

    if (!unit) {
      setMessage('Please enter a unit');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setMessage('');

    try {
      // Parse value based on sensor type
      let parsedValue: number | string = value;
      if (selectedSensorType !== 'EQUIPMENT_STATUS') {
        parsedValue = parseFloat(value);
        if (isNaN(parsedValue)) {
          throw new Error('Value must be a number');
        }
      }

      const response = await apiClient.post('/api/events', {
        farmId: selectedFarmId,
        deviceId: selectedDeviceId,
        sensorType: selectedSensorType,
        value: parsedValue,
        unit: unit,
        timestamp: new Date().toISOString(),
      });

      const eventId = response.data?.eventId || response.data?.data?.eventId;
      setResultEventId(eventId);
      setStatus('success');
      setMessage('✓ Event sent successfully!');

      // Reset form
      setTimeout(() => {
        setValue(String(sensorConfig.suggestedValue));
      }, 500);
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Event Simulator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Farm Selection */}
              <div>
                <label htmlFor="farm" className="block text-sm font-medium text-gray-700 mb-2">
                  Farm *
                </label>
                {farmsLoading ? (
                  <div className="text-gray-500 text-sm">Loading farms...</div>
                ) : (
                  <select
                    id="farm"
                    value={selectedFarmId}
                    onChange={(e) => handleFarmChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">-- Select a farm --</option>
                    {farms?.map((farm) => (
                      <option key={farm.farm_id} value={farm.farm_id}>
                        {farm.name} ({farm.farm_id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Sensor Type Selection */}
              <div>
                <label
                  htmlFor="sensor-type"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Sensor Type *
                </label>
                <select
                  id="sensor-type"
                  value={selectedSensorType}
                  onChange={(e) => handleSensorTypeChange(e.target.value as SensorType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {Object.entries(SENSOR_CONFIGS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-600">{sensorConfig.description}</p>
              </div>

              {/* Device Selection */}
              <div>
                <label htmlFor="device" className="block text-sm font-medium text-gray-700 mb-2">
                  Device ({selectedSensorType}) *
                </label>
                {!selectedFarmId ? (
                  <div className="text-gray-500 text-sm">Select a farm first</div>
                ) : filteredDevices.length === 0 ? (
                  <div className="text-red-600 text-sm">
                    No devices found for {sensorConfig.label} on this farm
                  </div>
                ) : (
                  <select
                    id="device"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">-- Select a device --</option>
                    {filteredDevices.map((device) => (
                      <option key={device.device_id} value={device.device_id}>
                        {device.name} ({device.device_id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Value and Unit */}
              <div className="grid grid-cols-3 gap-4">
                {/* Value */}
                <div className="col-span-2">
                  <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-2">
                    Value *
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="value"
                      type={selectedSensorType === 'EQUIPMENT_STATUS' ? 'text' : 'number'}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={
                        selectedSensorType === 'EQUIPMENT_STATUS'
                          ? 'OK or FAILURE'
                          : `e.g., ${sensorConfig.suggestedValue}`
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={fillSuggestedValue}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
                      title="Fill suggested value"
                    >
                      Suggest
                    </button>
                  </div>
                </div>

                {/* Unit */}
                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
                    Unit *
                  </label>
                  <input
                    id="unit"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder={sensorConfig.unit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Constraints Info */}
              {selectedSensorType !== 'EQUIPMENT_STATUS' && sensorConfig.minValue !== undefined && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Valid range:</strong> {sensorConfig.minValue} - {sensorConfig.maxValue}{' '}
                    {sensorConfig.unit}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === 'sending' || !selectedFarmId || !selectedDeviceId}
                className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'sending' ? '⏳ Sending...' : '📤 Send Event'}
              </button>

              {/* Status Messages */}
              {message && (
                <div
                  className={`p-4 rounded-md border ${
                    status === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : status === 'error'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : ''
                  }`}
                >
                  <p className="font-medium">{message}</p>
                  {resultEventId && (
                    <p className="text-xs mt-2 opacity-75">Event ID: {resultEventId}</p>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Help Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">ℹ️ Sensor Types Guide</h3>
            <div className="space-y-4">
              {Object.entries(SENSOR_CONFIGS).map(([key, config]) => (
                <div
                  key={key}
                  className="p-3 bg-gray-50 rounded-md border-l-4 border-indigo-400 cursor-pointer hover:bg-indigo-50 transition-colors"
                  onClick={() => handleSensorTypeChange(key as SensorType)}
                >
                  <p className="font-medium text-sm text-gray-900">{config.label}</p>
                  <p className="text-xs text-gray-600 mt-1">{config.description}</p>
                  {config.minValue !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">
                      Range: {config.minValue}-{config.maxValue} {config.unit}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">💡 Tips</h4>
              <ul className="text-xs text-gray-600 space-y-2">
                <li>• Select a farm first to populate devices</li>
                <li>• Devices are filtered by sensor type</li>
                <li>• Use the "Suggest" button to fill typical values</li>
                <li>• Check event history to see results</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
