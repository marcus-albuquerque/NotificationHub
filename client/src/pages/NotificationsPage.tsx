import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '../api/client';
import { notificationsApi } from '../api/client';

interface NotificationFilters {
  ruleName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [replyingNotificationId, setReplyingNotificationId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const limit = 20;

  // Query: Fetch notifications
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', page, filters],
    queryFn: () => {
      return notificationsApi.getAll({
        page,
        limit,
      });
    },
    enabled: true,
  });

  // Mutation: Retry failed notification
  const retryMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsApi.retry(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setReplyingNotificationId(null);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'retrying':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return '✅';
      case 'pending':
        return '⏳';
      case 'retrying':
        return '🔄';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const handleFilterChange = (field: keyof NotificationFilters, value: string | undefined) => {
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

  const handleRetry = useCallback(
    (notificationId: string) => {
      setReplyingNotificationId(notificationId);
      retryMutation.mutate(notificationId);
    },
    [retryMutation]
  );

  const handleApplyFilters = () => {
    setPage(1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading notifications: {(error as Error).message}</p>
      </div>
    );
  }

  // Collect unique rule names for filter dropdown
  const uniqueRuleNames = Array.from(
    new Set(data?.data?.map((n) => n.rule_name).filter(Boolean))
  ).sort();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showFilters ? '✕ Hide Filters' : '🔍 Show Filters'}
        </button>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rule Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fired Rule</label>
              <select
                value={filters.ruleName || ''}
                onChange={(e) => handleFilterChange('ruleName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Rules</option>
                {uniqueRuleNames.map((ruleName) => (
                  <option key={ruleName} value={ruleName}>
                    {ruleName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Send Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="retrying">Retrying</option>
                <option value="failed">Failed</option>
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

      {/* Notifications Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {!data?.data || data.data.length === 0 ? (
          <div className="p-6">
            <p className="text-gray-500">No notifications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notification ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fired Rule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Send Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.data.map((notification: Notification) => (
                  <tr key={notification.notification_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {notification.notification_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {notification.rule_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      <div className="truncate">{notification.message}</div>
                      {notification.dispatch_error && notification.dispatch_status === 'failed' && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {notification.dispatch_error}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(notification.generated_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          notification.dispatch_status
                        )}`}
                      >
                        {getStatusIcon(notification.dispatch_status)}
                        {notification.dispatch_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {notification.dispatch_status === 'failed' && (
                        <button
                          onClick={() => handleRetry(notification.notification_id)}
                          disabled={
                            replyingNotificationId === notification.notification_id &&
                            retryMutation.isPending
                          }
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {replyingNotificationId === notification.notification_id &&
                          retryMutation.isPending
                            ? '🔄 Retrying...'
                            : '🔄 Retry'}
                        </button>
                      )}
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
    </div>
  );
}
