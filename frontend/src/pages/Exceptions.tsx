import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getExceptions, 
  getExceptionById, 
  getExceptionSummary, 
  getExceptionAnalytics,
  assignException, 
  updateExceptionStatus, 
  resolveException, 
  addExceptionNote, 
  investigateExceptionWithAI 
} from '../api/exceptions.api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Search, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  User,
  MessageSquare,
  RefreshCw,
  Send,
  Bookmark
} from 'lucide-react';

export default function ExceptionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  // Selected Exception Detail state
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  
  // AI investigation state
  const [investigating, setInvestigating] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);

  // Note entry state
  const [noteContent, setNoteContent] = useState('');

  // Fetch Exceptions List
  const { data: exceptionsResponse, isLoading } = useQuery({
    queryKey: ['exceptions', page, status, severity, type, search],
    queryFn: () => getExceptions({
      page,
      limit: 10,
      status: status ? [status] : undefined,
      severity: severity ? [severity] : undefined,
      type: type ? [type] : undefined,
      search: search || undefined
    })
  });

  // Fetch general counts summary
  const { data: summaryData } = useQuery({
    queryKey: ['exceptions-summary'],
    queryFn: getExceptionSummary
  });

  // Fetch analytics rates
  const { data: analyticsData } = useQuery({
    queryKey: ['exceptions-analytics'],
    queryFn: getExceptionAnalytics
  });

  // Fetch individual details
  const { data: exceptionDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['exception-detail', selectedExceptionId],
    queryFn: () => getExceptionById(selectedExceptionId!),
    enabled: !!selectedExceptionId
  });

  // Action mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateExceptionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['exception-detail', selectedExceptionId] });
      queryClient.invalidateQueries({ queryKey: ['exceptions-summary'] });
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) => assignException(id, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['exception-detail', selectedExceptionId] });
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => addExceptionNote(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exception-detail', selectedExceptionId] });
      setNoteContent('');
    }
  });

  const handleInvestigateAI = async () => {
    if (!selectedExceptionId) return;
    try {
      setInvestigating(true);
      setAiReport(null);
      const res = await investigateExceptionWithAI(selectedExceptionId);
      if (res.success && res.data) {
        setAiReport(res.data);
        queryClient.invalidateQueries({ queryKey: ['exception-detail', selectedExceptionId] });
      } else {
        alert('AI service was unable to compile analysis. Review Groq API configuration.');
      }
    } catch (err: any) {
      alert(err.message || 'AI Exception investigation failed.');
    } finally {
      setInvestigating(false);
    }
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !selectedExceptionId) return;
    addNoteMutation.mutate({ id: selectedExceptionId, content: noteContent.trim() });
  };

  const handlePrevPage = () => setPage(p => Math.max(1, p - 1));
  const handleNextPage = () => {
    if (exceptionsResponse?.pagination?.totalPages && page < exceptionsResponse.pagination.totalPages) {
      setPage(p => p + 1);
    }
  };

  return (
    <div className="space-y-6 text-left relative min-h-[70vh]">
      {/* Top Banner KPI counts */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Exceptions</span>
            <span className="text-sm font-extrabold text-gray-900 mt-0.5 block">
              {summaryData?.total || 0} items
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100/60 border border-red-200/40 flex items-center justify-center text-red-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Critical Severity</span>
            <span className="text-sm font-extrabold text-red-600 mt-0.5 block">
              {summaryData?.critical || 0} critical
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Unresolved</span>
            <span className="text-sm font-extrabold text-gray-900 mt-0.5 block">
              {summaryData?.unresolved || 0} items
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Resolved Rate</span>
            <span className="text-sm font-extrabold text-green-600 mt-0.5 block">
              {((analyticsData?.resolutionRate || 0) * 100).toFixed(0)}% accuracy
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main List Table */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search exception description..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs w-full focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
              />
            </div>

            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 cursor-pointer bg-white"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_REVIEW">IN REVIEW</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>

            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 cursor-pointer bg-white"
            >
              <option value="">All Severities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>

            <select
              value={type}
              onChange={(e) => { setType(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 cursor-pointer bg-white"
            >
              <option value="">All Types</option>
              <option value="AMOUNT_MISMATCH">AMOUNT MISMATCH</option>
              <option value="MISSING_RECORD">MISSING RECORD</option>
              <option value="DUPLICATE">DUPLICATE</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-bold uppercase">
                  <tr>
                    <th className="py-3 px-4">Exception ID</th>
                    <th>Type</th>
                    <th>Difference</th>
                    <th>Description</th>
                    <th>Severity</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-right py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </td>
                    </tr>
                  ) : exceptionsResponse?.map((ex: any) => (
                    <tr 
                      key={ex.id}
                      onClick={() => { setSelectedExceptionId(ex.id); setAiReport(null); }}
                      className={`hover:bg-neutral-50/70 transition-colors cursor-pointer ${selectedExceptionId === ex.id ? 'bg-[#eff6ff]/30 font-semibold' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-900 truncate max-w-[80px]">{ex.id}</td>
                      <td className="font-bold text-gray-500 text-[10px]">{ex.type}</td>
                      <td className="font-bold text-red-500">{formatCurrency(ex.difference || 0)}</td>
                      <td className="truncate max-w-[160px]">{ex.description}</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          ex.severity === 'CRITICAL' || ex.severity === 'HIGH'
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : 'bg-neutral-50 text-neutral-600 border border-neutral-100'
                        }`}>
                          {ex.severity}
                        </span>
                      </td>
                      <td className="text-gray-400">{formatDate(ex.createdAt)}</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          ex.status === 'RESOLVED'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : ex.status === 'IN_REVIEW'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {ex.status}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <button className="text-[10px] font-bold text-[#0048ff] hover:underline cursor-pointer">
                          Investigate →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && (!exceptionsResponse || exceptionsResponse.length === 0) && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">No exceptions currently logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="bg-white px-4 py-3.5 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-semibold">
                Showing recent batches
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
                  className="p-1 border border-gray-200 rounded-lg hover:bg-neutral-50 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Exception Detail Drawer */}
        {selectedExceptionId && (
          <div className="w-full lg:w-110 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm self-start flex flex-col gap-5 text-xs text-left h-fit">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Discrepancy Card</h3>
                <p className="text-[10px] text-gray-400 font-semibold">AI audit investigations & assignment logs</p>
              </div>
              <button 
                onClick={() => setSelectedExceptionId(null)}
                className="p-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : exceptionDetail ? (
              <div className="space-y-5">
                {/* Meta details */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Exception ID</span>
                    <span className="font-mono font-bold text-gray-900 truncate max-w-[150px]">{exceptionDetail.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Difference</span>
                    <span className="font-bold text-red-500">{formatCurrency(exceptionDetail.difference || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Severity</span>
                    <span className="font-bold text-gray-900">{exceptionDetail.severity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Description</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[200px]">{exceptionDetail.description}</span>
                  </div>
                  {exceptionDetail.rootCause && (
                    <div className="border-t border-gray-200/50 pt-2 flex flex-col gap-0.5">
                      <span className="text-gray-400 font-medium text-[9px] font-bold uppercase tracking-wider">Root Cause (AI Drafted)</span>
                      <p className="text-gray-800 text-[10px] leading-normal font-semibold italic">{exceptionDetail.rootCause}</p>
                    </div>
                  )}
                </div>

                {/* Status and assignee edit panels */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Recon Status</label>
                    <select
                      value={exceptionDetail.status}
                      onChange={(e) => statusMutation.mutate({ id: exceptionDetail.id, status: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg bg-white cursor-pointer"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_REVIEW">IN REVIEW</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Assigned auditor</label>
                    <select
                      value={exceptionDetail.assignedTo?.id || ''}
                      onChange={(e) => assignMutation.mutate({ id: exceptionDetail.id, assigneeId: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg bg-white cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      <option value="admin-user-id">Corporate Admin</option>
                      <option value="manager-user-id">Finance Manager</option>
                    </select>
                  </div>
                </div>

                {/* AI Investigation Block (glowing and prominent) */}
                <div className="p-4 rounded-xl border border-blue-100 bg-[#eff6ff]/35 shadow-2xs space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-[#0048ff] font-extrabold">
                      <Sparkles className="w-4 h-4 text-[#0048ff]" />
                      <span>AI Controller Agent</span>
                    </div>
                    <button
                      onClick={handleInvestigateAI}
                      disabled={investigating}
                      className="flex items-center gap-1 bg-[#0048ff] hover:bg-[#003be0] text-white py-1 px-2.5 rounded-md text-[9px] font-bold cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${investigating ? 'animate-spin' : ''}`} />
                      Investigate discrepancy
                    </button>
                  </div>

                  {investigating && (
                    <div className="py-4 text-center text-gray-400 font-semibold italic flex items-center justify-center gap-1">
                      <div className="w-3.5 h-3.5 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin"></div>
                      Analyzing payments and settlement ledgers...
                    </div>
                  )}

                  {!investigating && aiReport && (
                    <div className="space-y-2 text-[11px] animate-in fade-in duration-200">
                      <div>
                        <span className="font-bold text-gray-900">Summary Findings:</span>
                        <p className="text-neutral-700 leading-relaxed mt-0.5">{aiReport.summary}</p>
                      </div>

                      {aiReport.findings?.length > 0 && (
                        <div>
                          <span className="font-bold text-gray-900">Findings:</span>
                          <ul className="list-disc list-inside text-neutral-600 space-y-0.5 mt-0.5">
                            {aiReport.findings.map((f: string, idx: number) => (
                              <li key={idx}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiReport.recommendedActions?.length > 0 && (
                        <div>
                          <span className="font-bold text-gray-900">Recommended Steps:</span>
                          <ul className="list-decimal list-inside text-neutral-800 space-y-0.5 mt-0.5 font-semibold">
                            {aiReport.recommendedActions.map((a: string, idx: number) => (
                              <li key={idx}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-gray-100">
                        <span>Confidence: <strong className="text-green-600">{aiReport.confidence?.toUpperCase()}</strong></span>
                        <span>Model: <strong>Groq Llama-3.3</strong></span>
                      </div>
                    </div>
                  )}

                  {!investigating && !aiReport && (
                    <p className="text-[10px] text-gray-400 italic">Click Investigate to dispatch the Groq AI agent. It will verify expected amounts vs actual gateway payouts to isolate leakages or fee discrepancies.</p>
                  )}
                </div>

                {/* Notes logs section */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Activity logs / Notes</span>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {exceptionDetail.notes?.map((note: any) => (
                      <div key={note.id} className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100/50 space-y-0.5">
                        <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                          <span>{note.authorName}</span>
                          <span>{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="text-neutral-700 leading-normal font-medium">{note.content}</p>
                      </div>
                    ))}
                    {(!exceptionDetail.notes || exceptionDetail.notes.length === 0) && (
                      <p className="text-[10px] text-gray-400 italic">No notes logged on this exception.</p>
                    )}
                  </div>

                  <form onSubmit={handleAddNoteSubmit} className="flex gap-1.5 pt-1.5">
                    <input
                      type="text"
                      placeholder="Add update note..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="flex-1 p-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                    />
                    <button
                      type="submit"
                      disabled={addNoteMutation.isPending || !noteContent.trim()}
                      className="p-2 bg-[#0048ff] hover:bg-[#003be0] text-white rounded-lg cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-gray-400">Failed to load exception details card.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
