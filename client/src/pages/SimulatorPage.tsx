import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { farmsApi, apiClient } from '../api/client';

export function SimulatorPage() {
  const { data: farms } = useQuery({
    queryKey: ['farms'],
    queryFn: farmsApi.getAll,
  });

  const [selectedFarm, setSelectedFarm] = useState('');
  const [eventType, setEventType] = useState('temperature');
  const [payload, setPayload] = useState('{"value": 35, "unit": "celsius"}');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) {
      setMessage('Please select a farm');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setMessage('');

    try {
      const parsedPayload = JSON.parse(payload);
      await apiClient.post('/api/events', {
        farmId: selectedFarm,
        type: eventType,
        payload: parsedPayload,
      });
      setStatus('success');
      setMessage('Event sent successfully!');
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Event Simulator</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Farm
            </label>
            <select
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- Select a farm --</option>
              {farms?.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name} ({farm.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
              <option value="soil_moisture">Soil Moisture</option>
              <option value="light">Light</option>
              <option value="rain">Rain</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payload (JSON)
            </label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'sending' ? 'Sending...' : 'Send Event'}
          </button>

          {message && (
            <div
              className={`p-4 rounded-md ${
                status === 'success'
                  ? 'bg-green-50 text-green-800'
                  : status === 'error'
                  ? 'bg-red-50 text-red-800'
                  : ''
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}