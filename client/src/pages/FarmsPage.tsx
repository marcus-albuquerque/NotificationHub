import { useQuery } from '@tanstack/react-query';
import { farmsApi } from '../api/client';

export function FarmsPage() {
  const { data: farms, isLoading, error } = useQuery({
    queryKey: ['farms'],
    queryFn: farmsApi.getAll,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading farms...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading farms: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Farms</h1>
      
      {(!farms || farms.length === 0) ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">No farms found. Create your first farm to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm) => (
            <div
              key={farm.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-medium text-gray-900">{farm.name}</h3>
              <p className="text-gray-500 mt-1">{farm.location}</p>
              <p className="text-sm text-gray-400 mt-2">
                Created: {new Date(farm.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}