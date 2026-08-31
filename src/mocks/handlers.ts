import { http, HttpResponse } from 'msw';
import { mockFarms, mockDevices, mockProducers, mockEvents } from './mockData';

const API_BASE_URL = 'http://localhost:3000';

export const handlers = [
  // Farms
  http.get(`${API_BASE_URL}/api/farms`, () => {
    return HttpResponse.json({ data: mockFarms }, { status: 200 });
  }),

  http.get(`${API_BASE_URL}/api/farms/:farmId`, ({ params }) => {
    const farm = mockFarms.find((f) => f.farm_id === params.farmId);
    if (!farm) {
      return HttpResponse.json({ error: 'Farm not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: farm }, { status: 200 });
  }),

  // Devices
  http.get(`${API_BASE_URL}/api/farms/:farmId/devices`, ({ params }) => {
    const devices = mockDevices.filter((d) => d.farm_id === params.farmId);
    return HttpResponse.json({ data: devices }, { status: 200 });
  }),

  http.get(`${API_BASE_URL}/api/farms/:farmId/devices/:deviceId`, ({ params }) => {
    const device = mockDevices.find(
      (d) => d.farm_id === params.farmId && d.device_id === params.deviceId
    );
    if (!device) {
      return HttpResponse.json({ error: 'Device not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: device }, { status: 200 });
  }),

  // Producers
  http.get(`${API_BASE_URL}/api/producers`, () => {
    return HttpResponse.json({ data: mockProducers }, { status: 200 });
  }),

  http.get(`${API_BASE_URL}/api/producers/:producerId`, ({ params }) => {
    const producer = mockProducers.find((p) => p.producer_id === params.producerId);
    if (!producer) {
      return HttpResponse.json({ error: 'Producer not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: producer }, { status: 200 });
  }),

  // Event History
  http.get(`${API_BASE_URL}/api/history/farm/:farmId`, ({ params, request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const farmEvents = mockEvents.filter((e) => e.farmId === params.farmId);
    const startIndex = (page - 1) * limit;
    const paginatedEvents = farmEvents.slice(startIndex, startIndex + limit);

    return HttpResponse.json(
      {
        data: paginatedEvents,
        total: farmEvents.length,
        page,
        limit,
        totalPages: Math.ceil(farmEvents.length / limit),
      },
      { status: 200 }
    );
  }),

  http.get(`${API_BASE_URL}/api/history/:eventId`, ({ params }) => {
    const event = mockEvents.find((e) => e.eventId === params.eventId);
    if (!event) {
      return HttpResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return HttpResponse.json(event, { status: 200 });
  }),
];
