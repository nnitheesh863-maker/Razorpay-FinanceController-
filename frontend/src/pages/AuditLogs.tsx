import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../api/audit.api';
import { formatDate } from '../utils/formatters';
import { 
  Shield, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Database,
  UserCheck
} from 'lucide-react';

export default function AuditLogsPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  // Fetch Audit Logs
  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action],
    queryFn: () => getAuditLogs({
      page,
      limit: 15,
      action: action || undefined
    })
  });

  const handlePrevPage = () => setPage(p => Math.max(1, p - 1));
  const handleNextPage = () => {
    if (logsResponse?.pagination?.totalPages && page < logsResponse.pagination.totalPages) {
      setPage(p => p + 1);
    }
  };

  const getActionBadgeColor = (act: string) => {
    if (act.includes('CREATE') || act.includes('RESOLVE')) return 'bg-green-50 text-green-700 border border-green-100';
    if (act.includes('DELETE') || act.includes('REFUND') || act.includes('CANCEL')) return 'bg-red-50 text-red-700 border border-red-100';
    if (act.includes('AI') || act.includes('ANALYZE')) return 'bg-blue-50 text-blue-700 border border-blue-100';
    if (act.includes('RECONCILIATION')) return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
    return 'bg-neutral-50 text-neutral-600 border border-neutral-100';
  };

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      {/* Banner */}
      <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">Audit & Security logs</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Append-only log record tracking corporate actions and database events</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <div className="flex-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Filter by Operations Action</label>
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 cursor-pointer bg-white w-full max-w-xs"
            >
              <option value="">All Actions</option>
              <option value="PAYMENT_CREATE">PAYMENT_CREATE</option>
              <option value="PAYMENT_REFUND">PAYMENT_REFUND</option>
              <option value="INVOICE_CREATE">INVOICE_CREATE</option>
              <option value="INVOICE_ISSUE">INVOICE_ISSUE</option>
              <option value="INVOICE_CANCEL">INVOICE_CANCEL</option>
              <option value="SETTLEMENT_CREATE">SETTLEMENT_CREATE</option>
              <option value="RECONCILIATION_RUN">RECONCILIATION_RUN</option>
              <option value="EXCEPTION_ASSIGN">EXCEPTION_ASSIGN</option>
              <option value="EXCEPTION_STATUS_UPDATE">EXCEPTION_STATUS_UPDATE</option>
              <option value="EXCEPTION_RESOLVE">EXCEPTION_RESOLVE</option>
              <option value="EXCEPTION_AI_INVESTIGATE">EXCEPTION_AI_INVESTIGATE</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
              <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-bold uppercase">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th>Action</th>
                  <th>User Profile</th>
                  <th>Details metadata payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : logsResponse?.data?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-neutral-50/40 font-mono text-[11px]">
                    <td className="py-3 px-4 text-gray-400 font-sans">{formatDate(log.createdAt)}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold font-sans ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-gray-900 font-sans flex items-center gap-1.5 py-3">
                      <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                      <span>{log.userEmail || 'system-daemon'}</span>
                    </td>
                    <td className="text-gray-500 max-w-[400px] truncate">{log.details || '{}'}</td>
                  </tr>
                ))}
                {!isLoading && (!logsResponse?.data || logsResponse.data.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">No audit log entries matched filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {logsResponse?.pagination && (
            <div className="bg-white px-4 py-3.5 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-semibold">
                Page {logsResponse.pagination.page} of {logsResponse.pagination.totalPages} ({logsResponse.pagination.total} records)
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className="p-1 border border-gray-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={page === logsResponse.pagination.totalPages}
                  className="p-1 border border-gray-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
