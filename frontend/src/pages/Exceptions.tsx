import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getExceptions, 
  getExceptionById, 
  getExceptionSummary, 
  updateExceptionStatus, 
  addExceptionNote, 
  investigateExceptionWithAI 
} from '../api/exceptions.api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PageContainer, SectionCard, EmptyState } from '../components/dashboard/ShellComponents';
import { 
  Search, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  RefreshCw,
  Send,
  ArrowRight,
  Filter,
  MessageSquare,
  Activity,
  CheckCircle,
  HelpCircle,
  FileText
} from 'lucide-react';

export default function ExceptionsPage() {
  const queryClient = useQueryClient();

  // Filter and search states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('OPEN'); // default to OPEN exceptions
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  // Selected Exception Detail ID
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  
  // AI investigation state
  const [investigating, setInvestigating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Note entry state
  const [noteContent, setNoteContent] = useState('');

  // Fetch Exceptions List
  const { data: exceptions = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['exceptions', page, status, severity, type, search],
    queryFn: async () => {
      const res = await getExceptions({
        page,
        limit: 15,
        status: status ? [status as any] : undefined,
        severity: severity ? [severity as any] : undefined,
        type: type ? [type as any] : undefined,
        search: search || undefined
      });
      return res || [];
    }
  });

  // Fetch general counts summary
  const { data: summaryData } = useQuery({
    queryKey: ['exceptions-summary'],
    queryFn: getExceptionSummary
  });

  // Fetch individual details
  const { data: exceptionDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['exception-detail', selectedExceptionId],
    queryFn: () => getExceptionById(selectedExceptionId!),
    enabled: !!selectedExceptionId
  });

  // Status Action Mutation (Manual only!)
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateExceptionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['exception-detail', selectedExceptionId] });
      queryClient.invalidateQueries({ queryKey: ['exceptions-summary'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update exception status.');
    }
  });

  // Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => addExceptionNote(id, { content } as any),
    onSuccess: () => {
      setNoteContent('');
      queryClient.invalidateQueries({ queryKey: ['exception-detail', selectedExceptionId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to post note.');
    }
  });

  // AI Investigation Mutation
  const aiMutation = useMutation({
    mutationFn: (id: string) => investigateExceptionWithAI(id),
    onMutate: () => {
      setInvestigating(true);
      setAiReport(null);
    },
    onSuccess: (data) => {
      setAiReport(data.analysis || data.investigation || data.response);
      setInvestigating(false);
    },
    onError: (err: any) => {
      setAiReport(err.response?.data?.message || 'AI Copilot investigation service is currently offline. Please try again later.');
      setInvestigating(false);
    }
  });

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !selectedExceptionId) return;
    addNoteMutation.mutate({ id: selectedExceptionId, content: noteContent });
  };

  const getSourceAmounts = (ex: any) => {
    const inv = ex.relatedRecords?.invoice?.amount || 0;
    const pay = ex.relatedRecords?.payment?.amount || 0;
    const setl = ex.relatedRecords?.settlement?.amount || 0;
    const bank = ex.relatedRecords?.reconciliationRecord?.bankAmount || 0;
    
    // Pick the two available layers that differ to show in the table
    if (inv > 0 && pay > 0) return { a: inv, b: pay };
    if (pay > 0 && setl > 0) return { a: pay, b: setl };
    if (setl > 0 && bank > 0) return { a: setl, b: bank };
    return { a: inv || pay || setl || 0, b: bank || setl || 0 };
  };

  // Helper to format category headers
  const exTypeLabels: Record<string, string> = {
    AMOUNT_MISMATCH: 'Amount mismatch',
    DATE_MISMATCH: 'Date mismatch',
    REFERENCE_MISMATCH: 'Reference mismatch',
    MISSING_RECORD: 'Missing record',
    DUPLICATE: 'Duplicate',
    UNRESOLVED: 'Unresolved'
  };

  return (
    <PageContainer>
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 text-left border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Exceptions</h2>
          <p className="text-xs font-semibold text-gray-500">Review transactions that need attention.</p>
        </div>
      </div>

      {/* SUMMARY STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-left">
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Open Exceptions</span>
          <span className="text-2xl font-black text-red-500 block mt-2">{summaryData?.open || 0}</span>
        </div>
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">High Priority</span>
          <span className="text-2xl font-black text-gray-900 block mt-2">{summaryData?.critical || 0}</span>
        </div>
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Difference</span>
          <span className="text-2xl font-black text-gray-900 block mt-2">
            {formatCurrency(exceptions.reduce((sum: number, e: any) => sum + Math.abs(e.difference || 0), 0))}
          </span>
        </div>
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Unresolved</span>
          <span className="text-2xl font-black text-gray-900 block mt-2">{summaryData?.unresolved || 0}</span>
        </div>
      </div>

      {/* FILTERS & SEARCH ROW */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white border border-gray-100 p-4 rounded-2xl shadow-2xs text-left">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exceptions by reference or ID..."
            className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2F6F73] focus:outline-hidden bg-neutral-50/20"
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {/* Issue dropdown */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="text-xs font-semibold p-2.5 border border-gray-200 rounded-xl bg-neutral-50/20 focus:border-[#2F6F73]"
          >
            <option value="">All Issues</option>
            <option value="AMOUNT_MISMATCH">Amount mismatch</option>
            <option value="DATE_MISMATCH">Date mismatch</option>
            <option value="REFERENCE_MISMATCH">Reference mismatch</option>
            <option value="MISSING_RECORD">Missing</option>
            <option value="DUPLICATE">Duplicate</option>
            <option value="UNRESOLVED">Unresolved</option>
          </select>

          {/* Severity dropdown */}
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="text-xs font-semibold p-2.5 border border-gray-200 rounded-xl bg-neutral-50/20 focus:border-[#2F6F73]"
          >
            <option value="">All Severities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status Tab selectors */}
          <div className="flex bg-neutral-100 p-0.5 rounded-xl text-[9px] font-bold text-gray-600">
            {['OPEN', 'IN_REVIEW', 'RESOLVED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  status === s 
                    ? 'bg-white text-gray-900 font-extrabold shadow-2xs' 
                    : 'hover:text-gray-900'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CORE WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* LEFT COLUMN: EXCEPTIONS LIST TABLE */}
        <div className={`space-y-4 lg:col-span-2 ${selectedExceptionId ? 'lg:col-span-1.5' : 'lg:col-span-3'}`}>
          <SectionCard title="Attention Registry">
            <div className="overflow-x-auto -mx-5 -my-4">
              <table className="min-w-full divide-y divide-gray-100 text-xs font-semibold text-gray-600">
                <thead className="bg-neutral-50 text-[9px] text-gray-400 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-5">Transaction</th>
                    <th>Issue</th>
                    <th>Source A</th>
                    <th>Source B</th>
                    <th>Diff</th>
                    <th>Severity</th>
                    <th className="text-right py-2.5 px-5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {exceptions.map((ex: any) => {
                    const amounts = getSourceAmounts(ex);
                    return (
                      <tr 
                        key={ex.id}
                        onClick={() => {
                          setSelectedExceptionId(ex.id);
                          setAiReport(null);
                        }}
                        className={`hover:bg-neutral-50/50 cursor-pointer transition-colors ${
                          selectedExceptionId === ex.id ? 'bg-[#2F6F73]/5' : ''
                        }`}
                      >
                        <td className="py-3 px-5 font-mono text-[9px] text-gray-900 font-bold truncate max-w-[100px]">
                          {ex.id.slice(0, 8).toUpperCase()}...
                        </td>
                        <td>{exTypeLabels[ex.type] || ex.type.replace(/_/g, ' ')}</td>
                        <td>{amounts.a > 0 ? formatCurrency(amounts.a) : '—'}</td>
                        <td>{amounts.b > 0 ? formatCurrency(amounts.b) : '—'}</td>
                        <td className="text-red-500 font-black">{formatCurrency(Math.abs(ex.difference || 0))}</td>
                        <td>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            ex.severity === 'CRITICAL' || ex.severity === 'HIGH'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {ex.severity}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button className="text-[10px] font-black text-[#2F6F73] hover:underline cursor-pointer flex items-center justify-end gap-0.5 ml-auto">
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {exceptions.length === 0 && !isLoadingList && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <EmptyState 
                          title="No exceptions found." 
                          description="Your latest reconciliation has no unresolved differences." 
                          icon={CheckCircle} 
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT COLUMN: FIELD-BY-FIELD COMPARISON & ACTION PANEL */}
        {selectedExceptionId && (
          <div className="lg:col-span-1.5 space-y-6 animate-in slide-in-from-right-5 duration-200">
            
            {isLoadingDetail ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2F6F73]" />
                <span className="block mt-2 text-[10px] font-bold">Querying ledger logs...</span>
              </div>
            ) : exceptionDetail && (
              <>
                {/* Visual Field-by-Field comparison card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <div>
                      <span className="text-[9px] font-extrabold text-[#2F6F73] uppercase tracking-widest block">Detailed View</span>
                      <h3 className="text-xs font-extrabold text-gray-900 mt-0.5 font-mono uppercase">
                        {exceptionDetail.id.slice(0, 12).toUpperCase()}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedExceptionId(null)}
                      className="p-1.5 hover:bg-neutral-50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* FIELD-BY-FIELD COMPARISON TABLE */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Field-by-Field Comparison</span>
                    
                    <div className="overflow-x-auto -mx-5">
                      <table className="min-w-full text-xs font-semibold text-gray-600 text-left">
                        <thead className="bg-neutral-50 text-[9px] text-gray-400 font-bold uppercase">
                          <tr>
                            <th className="py-2 px-5">Field</th>
                            <th>Invoice</th>
                            <th>Payment</th>
                            <th>Settlement</th>
                            <th>Bank statement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {/* Row 1: External ID */}
                          <tr>
                            <td className="py-2.5 px-5 text-gray-400 font-bold">ID / Ref</td>
                            <td>{exceptionDetail.relatedRecords?.invoice?.externalId || '—'}</td>
                            <td>{exceptionDetail.relatedRecords?.payment?.externalId || '—'}</td>
                            <td>{exceptionDetail.relatedRecords?.settlement?.externalId || '—'}</td>
                            <td>{exceptionDetail.relatedRecords?.reconciliationRecord?.bankRecordId?.slice(0, 8) || '—'}</td>
                          </tr>

                          {/* Row 2: Amount (Highlight if mismatch!) */}
                          {(() => {
                            const invAmt = exceptionDetail.relatedRecords?.invoice?.amount;
                            const payAmt = exceptionDetail.relatedRecords?.payment?.amount;
                            const setlAmt = exceptionDetail.relatedRecords?.settlement?.amount;
                            const bankAmt = exceptionDetail.relatedRecords?.reconciliationRecord?.bankAmount;
                            
                            const activeAmounts = [invAmt, payAmt, setlAmt, bankAmt].filter(a => a !== undefined && a !== null);
                            const hasDiff = activeAmounts.some(a => Math.abs(a - activeAmounts[0]) > 0.01);
                            
                            return (
                              <tr className={hasDiff ? 'bg-red-50/50' : ''}>
                                <td className="py-2.5 px-5 text-gray-400 font-bold">Amount</td>
                                <td className={hasDiff && invAmt !== undefined ? 'text-red-500 font-black' : ''}>
                                  {invAmt !== undefined ? formatCurrency(invAmt) : '—'}
                                </td>
                                <td className={hasDiff && payAmt !== undefined ? 'text-red-500 font-black' : ''}>
                                  {payAmt !== undefined ? formatCurrency(payAmt) : '—'}
                                </td>
                                <td className={hasDiff && setlAmt !== undefined ? 'text-red-500 font-black' : ''}>
                                  {setlAmt !== undefined ? formatCurrency(setlAmt) : '—'}
                                </td>
                                <td className={hasDiff && bankAmt !== undefined ? 'text-red-500 font-black' : ''}>
                                  {bankAmt !== undefined ? formatCurrency(bankAmt) : '—'}
                                </td>
                              </tr>
                            );
                          })()}

                          {/* Row 3: Date (Highlight if mismatch!) */}
                          {(() => {
                            const invDate = exceptionDetail.relatedRecords?.invoice?.transactionDate;
                            const payDate = exceptionDetail.relatedRecords?.payment?.transactionDate;
                            const setlDate = exceptionDetail.relatedRecords?.settlement?.transactionDate;
                            const bankDate = exceptionDetail.relatedRecords?.reconciliationRecord?.createdAt;
                            
                            return (
                              <tr>
                                <td className="py-2.5 px-5 text-gray-400 font-bold">Date</td>
                                <td>{invDate ? formatDate(invDate) : '—'}</td>
                                <td>{payDate ? formatDate(payDate) : '—'}</td>
                                <td>{setlDate ? formatDate(setlDate) : '—'}</td>
                                <td>{bankDate ? formatDate(bankDate) : '—'}</td>
                              </tr>
                            );
                          })()}

                          {/* Row 4: UTR / Reference */}
                          <tr>
                            <td className="py-2.5 px-5 text-gray-400 font-bold">UTR / Ref</td>
                            <td>{exceptionDetail.relatedRecords?.invoice?.reference || '—'}</td>
                            <td>{exceptionDetail.relatedRecords?.payment?.reference || '—'}</td>
                            <td>{exceptionDetail.relatedRecords?.settlement?.utr || exceptionDetail.relatedRecords?.settlement?.reference || '—'}</td>
                            <td>{exceptionDetail.relatedRecords?.reconciliationRecord?.notes?.match(/UTR:\s*(\w+)/)?.[1] || '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* MANUAL ACTIONS PANEL */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4 text-left">
                  <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wider block">Resolve Discrepancy</span>
                  
                  {/* Actions buttons (Explicit manual actions ONLY!) */}
                  <div className="flex gap-2 text-xs">
                    {exceptionDetail.status !== 'RESOLVED' ? (
                      <>
                        <button
                          onClick={() => statusMutation.mutate({ id: exceptionDetail.id, status: 'RESOLVED' })}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black transition-colors cursor-pointer"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ id: exceptionDetail.id, status: 'IN_REVIEW' })}
                          className="border border-gray-200 hover:border-gray-300 hover:bg-neutral-50 text-gray-700 px-4 py-2 rounded-xl font-black transition-all cursor-pointer"
                        >
                          Mark as Reviewed
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => statusMutation.mutate({ id: exceptionDetail.id, status: 'OPEN' })}
                        className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl font-black transition-colors cursor-pointer"
                      >
                        Leave Unresolved
                      </button>
                    )}
                  </div>

                  {/* Notes Feed section */}
                  <div className="border-t border-gray-50 pt-4 space-y-3">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Audit Log Comments</span>
                    
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {exceptionDetail.notes?.map((note: any) => (
                        <div key={note.id} className="p-3 border border-neutral-100 rounded-xl bg-neutral-50/50 space-y-1">
                          <p className="text-gray-700 font-medium text-[10px] leading-relaxed">{note.content}</p>
                          <div className="flex justify-between items-center text-[8px] font-bold text-gray-400 uppercase">
                            <span>{note.authorName}</span>
                            <span>{formatDate(note.createdAt)}</span>
                          </div>
                        </div>
                      ))}

                      {(!exceptionDetail.notes || exceptionDetail.notes.length === 0) && (
                        <span className="text-[10px] font-semibold text-gray-400 italic block">No audit notes recorded.</span>
                      )}
                    </div>

                    <form onSubmit={handleAddNoteSubmit} className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Add comment to exception history..."
                        className="flex-1 text-xs font-semibold p-2 border border-gray-200 rounded-xl focus:border-[#2F6F73] focus:outline-hidden"
                      />
                      <button
                        type="submit"
                        disabled={addNoteMutation.isPending || !noteContent.trim()}
                        className="bg-[#2F6F73] hover:bg-[#204c4f] disabled:opacity-50 text-white p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* GROQ AI ANOMALY INVESTIGATION */}
                <div className="bg-[#0B1726] border border-[#16273b] text-white p-5 rounded-2xl space-y-3 text-left">
                  <div className="flex items-center gap-1.5 font-extrabold border-b border-white/10 pb-2">
                    <Sparkles className="w-4 h-4 text-[#2F6F73] fill-white animate-pulse" />
                    <span className="text-[9px] uppercase tracking-wider">AI Copilot Analysis</span>
                  </div>

                  {investigating ? (
                    <div className="py-4 text-center text-gray-400 space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2F6F73]" />
                      <span className="text-[9px] font-bold block">Running anomaly investigation...</span>
                    </div>
                  ) : aiReport ? (
                    <p className="text-gray-300 leading-relaxed text-[10px] font-medium whitespace-pre-line bg-white/5 p-3 rounded-xl border border-white/5">{aiReport}</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-gray-400 text-[10px] leading-relaxed">
                        Trigger a Groq AI audit report to analyze narration files, detect gateway fee schedules, and explain why matching filters isolated this anomaly.
                      </p>
                      <button
                        onClick={() => aiMutation.mutate(exceptionDetail.id)}
                        className="bg-[#2F6F73] hover:bg-[#204c4f] text-white text-[10px] font-black px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-white" />
                        <span>Ask AI to explain this exception</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        )}

      </div>

    </PageContainer>
  );
}
