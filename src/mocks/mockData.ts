import type { Farm, Producer, Device, EventHistoryEntry } from '../api/client';

export const mockProducers: Producer[] = [
  {
    producer_id: 'producer-001',
    name: 'João Silva',
    phone: '(11) 98765-4321',
    email: 'joao@example.com',
  },
  {
    producer_id: 'producer-002',
    name: 'Maria Santos',
    phone: '(21) 99876-5432',
    email: 'maria@example.com',
  },
];

export const mockFarms: Farm[] = [
  {
    farm_id: 'farm-001',
    name: 'Fazenda São José',
    producer_id: 'producer-001',
    created_at: '2024-01-15T10:00:00Z',
    device_count: 6,
  },
  {
    farm_id: 'farm-002',
    name: 'Fazenda Vista Verde',
    producer_id: 'producer-002',
    created_at: '2024-02-20T14:30:00Z',
    device_count: 4,
  },
  {
    farm_id: 'farm-003',
    name: 'Fazenda Rio Doce',
    producer_id: 'producer-001',
    created_at: '2024-03-10T09:15:00Z',
    device_count: 5,
  },
];

export const mockDevices: Device[] = [
  {
    device_id: 'device-001',
    farm_id: 'farm-001',
    name: 'Sensor Estufa 01',
    sensor_type: 'AIR_TEMPERATURE',
    status: 'active',
    last_value: '28.5',
    last_reading_at: new Date(Date.now() - 5 * 60000).toISOString(),
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-08-26T14:00:00Z',
  },
  {
    device_id: 'device-002',
    farm_id: 'farm-001',
    name: 'Sensor Umidade 01',
    sensor_type: 'AIR_HUMIDITY',
    status: 'active',
    last_value: '65',
    last_reading_at: new Date(Date.now() - 3 * 60000).toISOString(),
    created_at: '2024-01-16T11:00:00Z',
    updated_at: '2024-08-26T14:02:00Z',
  },
  {
    device_id: 'device-003',
    farm_id: 'farm-001',
    name: 'Sensor Solo 01',
    sensor_type: 'SOIL_MOISTURE',
    status: 'active',
    last_value: '45',
    last_reading_at: new Date(Date.now() - 2 * 60000).toISOString(),
    created_at: '2024-01-17T12:00:00Z',
    updated_at: '2024-08-26T14:01:00Z',
  },
  {
    device_id: 'device-004',
    farm_id: 'farm-001',
    name: 'Sensor Reservatório',
    sensor_type: 'WATER_RESERVOIR_LEVEL',
    status: 'active',
    last_value: '78',
    last_reading_at: new Date(Date.now() - 1 * 60000).toISOString(),
    created_at: '2024-01-18T13:00:00Z',
    updated_at: '2024-08-26T14:03:00Z',
  },
  {
    device_id: 'device-005',
    farm_id: 'farm-001',
    name: 'Sensor Silo',
    sensor_type: 'SILO_LEVEL',
    status: 'active',
    last_value: '92',
    last_reading_at: new Date(Date.now() - 4 * 60000).toISOString(),
    created_at: '2024-01-19T14:00:00Z',
    updated_at: '2024-08-26T14:04:00Z',
  },
  {
    device_id: 'device-006',
    farm_id: 'farm-001',
    name: 'Monitor Equipamento',
    sensor_type: 'EQUIPMENT_STATUS',
    status: 'active',
    last_value: 'OK',
    last_reading_at: new Date(Date.now() - 10 * 60000).toISOString(),
    created_at: '2024-01-20T15:00:00Z',
    updated_at: '2024-08-26T14:05:00Z',
  },
];

export const mockEvents: EventHistoryEntry[] = [
  {
    id: '1',
    eventId: 'event-001',
    farmId: 'farm-001',
    deviceId: 'device-001',
    sensorType: 'AIR_TEMPERATURE',
    value: 28.5,
    unit: '°C',
    receivedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    validationStatus: 'valid',
    isDuplicate: false,
    firedRules: [
      {
        ruleId: 'rule-001',
        ruleName: 'HIGH_AIR_TEMPERATURE',
        firedAt: new Date(Date.now() - 5 * 60000).toISOString(),
      },
    ],
    notifications: [
      {
        notificationId: 'notif-001',
        message: 'Temperatura elevada detectada (28.5°C)',
        generatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
        dispatchStatus: 'sent',
      },
    ],
    processedAt: new Date(Date.now() - 5 * 60000 + 100).toISOString(),
    processingDurationMs: 100,
  },
];
