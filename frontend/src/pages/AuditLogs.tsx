import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../api/audit.api';
import { PageContainer, SectionCard, LoadingSkeleton } from '../components/dashboard/ShellComponents';
import { 
  Shield, 
  Calendar, 
  User, 
  Tag, 
  Layers, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Database,
  ArrowRight,
  SlidersHorizontal,
  Activity,
  Code,
  X
} from 'lucide-react';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch Audit Logs
  const { data: response, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action, userId, entityType, startDate, endDate],
    queryFn: () => getAuditLogs({
      page,
      limit: 15,
      action: action || undefined,
      userId: userId || undefined,
      entityType: entityType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })
  });

  const logs = response?.data || [];
  const actionsList = response?.filters?.actions || [];
  const entityTypesList = response?.filters?.entityTypes || [];
  const pagination = response?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handlePrevPage = () => setPage(p => Math.max(1, p - 1));
  const handleNextPage = () => {
    if (page < pagination.totalPages) {
      setPage(p => p + 1);
    }
  };

  const getActionStyles = (act: string) => {
    const a = act.toUpperCase();
    if (a.includes('IMPORT') || a.includes('NORMALIZATION')) return { bg: 'bg-[#2F6F73]/10 text-[#2F6F73] border-[#2F6F73]/20', label: 'Data Integration' };
    if (a.includes('RECONCILIATION')) return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', label: 'Matching Job' };
    if (a.includes('EXCEPTION')) return { bg: 'bg-amber-50 text-amber-700 border border-amber-100', label: 'Ledger Dispute' };
    if (a.includes('AI_ANALYSIS')) return { bg: 'bg-blue-50 text-blue-700 border-blue-100', label: 'AI Copilot' };
    if (a.includes('WEBHOOK')) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Razorpay Webhook' };
    return { bg: 'bg-neutral-50 text-neutral-600 border border-neutral-100', label: 'System Action' };
  };

  const formatLogTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatLogDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <PageContainer>
      
      {/* Header Banner */}
      <div className="space-y-1 text-left mb-6">
        <h2 className="text-xl font-bold tracking-tight text-[#0B1726]">Audit Trail</h2>
        <p className="text-xs text-[#667085] font-semibold">Immutable, append-only security logs tracing corporate financial decisions, webhooks, and ledger corrections.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left">
        
        {/* LEFT COLUMN: ADVANCED FILTERS PANEL */}
        <div className="lg:col-span-1 bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs space-y-4 h-fit">
          <div className="flex items-center gap-1.5 border-b border-[#F2F4F7] pb-3">
            <SlidersHorizontal className="w-4 h-4 text-[#2F6F73]" />
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Log Filters</span>
          </div>

          {/* Action Filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Action</label>
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="border border-[#E4E7EC] rounded-lg text-xs py-2 px-3 focus:outline-none bg-white w-full cursor-pointer font-bold text-[#0B1726]"
            >
              <option value="">All Actions</option>
              {actionsList.map((a: string) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              className="border border-[#E4E7EC] rounded-lg text-xs py-2 px-3 focus:outline-none bg-white w-full cursor-pointer font-bold text-[#0B1726]"
            >
              <option value="">All Entity Types</option>
              {entityTypesList.map((e: string) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* User ID Filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setPage(1); }}
              placeholder="e.g. user_101"
              className="border border-[#E4E7EC] rounded-lg text-xs py-2 px-3 focus:outline-none bg-white w-full font-bold text-[#0B1726]"
            />
          </div>

          {/* Date range Filters */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Date Range</label>
            <div className="space-y-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="border border-[#E4E7EC] rounded-lg text-[10px] py-1.5 px-2 bg-white w-full font-bold text-[#0B1726]"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="border border-[#E4E7EC] rounded-lg text-[10px] py-1.5 px-2 bg-white w-full font-bold text-[#0B1726]"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {(action || entityType || userId || startDate || endDate) && (
            <button
              onClick={() => { setAction(''); setEntityType(''); setUserId(''); setStartDate(''); setEndDate(''); setPage(1); }}
              className="w-full mt-2 bg-[#F6F8FA] hover:bg-[#F2F4F7] border border-[#E4E7EC] text-[#0B1726] text-[10px] font-black py-2 rounded-xl cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
          )}

        </div>

        {/* RIGHT COLUMN: TIMELINE LIST */}
        <div className="lg:col-span-3 space-y-4">
          
          <div className="bg-white border border-[#E4E7EC] rounded-2xl shadow-2xs p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-[#F2F4F7] pb-4">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#2F6F73]" />
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">System Activity Timeline</span>
              </div>
              <span className="text-[10px] text-gray-400 font-bold">{pagination.total} logs captured</span>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <LoadingSkeleton className="h-16 rounded-xl" />
                <LoadingSkeleton className="h-16 rounded-xl" />
                <LoadingSkeleton className="h-16 rounded-xl" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <Shield className="w-8 h-8 text-gray-300 animate-pulse" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">No matching audit logs</span>
                <p className="text-[10px] text-gray-400 font-semibold">Try relaxing your advanced filter settings.</p>
              </div>
            ) : (
              <div className="relative border-l border-[#F2F4F7] ml-3 pl-6 space-y-6 text-left">
                {logs.map((log: any) => {
                  const styles = getActionStyles(log.action);
                  const isExpanded = expandedLogId === log.id;
                  
                  return (
                    <div key={log.id} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-[#2F6F73]" />

                      {/* Header block */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-baseline gap-2 text-xs">
                          <span className="font-mono text-gray-400 font-bold">{formatLogTime(log.createdAt)}</span>
                          <span className="text-gray-300 font-light">|</span>
                          <span className="font-sans text-[10px] font-bold text-gray-400">{formatLogDate(log.createdAt)}</span>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ml-auto ${styles.bg}`}>
                            {log.action}
                          </span>
                        </div>

                        {/* Details Content Card */}
                        <div className="bg-[#F6F8FA] hover:bg-[#F2F4F7] border border-[#E4E7EC] rounded-2xl p-4 transition-colors">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-[#0B1726] leading-relaxed">{log.details}</p>
                              
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-gray-400">
                                {log.userId && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-[#2F6F73]" />
                                    <span>Operator: {log.userEmail || log.userId}</span>
                                  </span>
                                )}
                                {log.entityType && (
                                  <span className="flex items-center gap-1">
                                    <Layers className="w-3 h-3 text-indigo-500" />
                                    <span>Entity: {log.entityType} ({log.entityId?.slice(0, 8)}...)</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Expand Payload Trigger */}
                            {(log.previousValue || log.newValue || log.metadata) && (
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="bg-white border border-[#E4E7EC] hover:bg-neutral-50 p-1.5 rounded-lg text-gray-500 cursor-pointer shadow-3xs"
                                title="View metadata payload"
                              >
                                <Code className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Expanded JSON Inspector details */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-[#E4E7EC] space-y-3 font-mono text-[9px] text-[#0B1726] bg-white p-3 rounded-xl overflow-x-auto">
                              
                              {log.previousValue && (
                                <div className="space-y-1 text-left">
                                  <span className="text-[#C94C4C] font-extrabold uppercase text-[8px] tracking-wider block">- Previous Value State</span>
                                  <pre className="whitespace-pre p-2 bg-red-50/50 rounded-lg text-red-800 leading-normal">
                                    {JSON.stringify(log.previousValue, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.newValue && (
                                <div className="space-y-1 text-left">
                                  <span className="text-[#198754] font-extrabold uppercase text-[8px] tracking-wider block">+ New Value State</span>
                                  <pre className="whitespace-pre p-2 bg-green-50/50 rounded-lg text-green-800 leading-normal">
                                    {JSON.stringify(log.newValue, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.metadata && (
                                <div className="space-y-1 text-left">
                                  <span className="text-[#2F6F73] font-extrabold uppercase text-[8px] tracking-wider block">✦ Metadata payload</span>
                                  <pre className="whitespace-pre p-2 bg-blue-50/50 rounded-lg text-blue-800 leading-normal">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination footer */}
            {!isLoading && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#F2F4F7] pt-4 text-xs font-bold text-[#667085]">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[#E4E7EC] rounded-lg disabled:opacity-40 cursor-pointer bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span>Page {page} of {pagination.totalPages}</span>

                <button
                  onClick={handleNextPage}
                  disabled={page === pagination.totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[#E4E7EC] rounded-lg disabled:opacity-40 cursor-pointer bg-white"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

    </PageContainer>
  );
}
