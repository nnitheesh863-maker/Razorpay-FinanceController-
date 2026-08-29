import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  getReconciliationSummary, 
  getReconciliationRuns, 
  getBatchChains, 
  runReconciliation, 
  compareFiles 
} from '../api/reconciliation.api';
import { getImportStats } from '../api/imports.api';
import { investigateExceptionWithAI } from '../api/exceptions.api';
import { useSocket } from '../context/SocketContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PageContainer, SectionCard, EmptyState } from '../components/dashboard/ShellComponents';
import { 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  Search, 
  X,
  FileText,
  CreditCard,
  Coins,
  ArrowRight,
  History,
  TrendingUp,
  Sparkles,
  Database,
  ArrowLeft,
  Activity,
  Layers,
  FileSpreadsheet,
  Upload,
  CheckCircle,
  XCircle,
  Printer
} from 'lucide-react';

export default function ReconciliationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Mode Selection: 'multi' | 'two-file'
  const [reconcileMode, setReconcileMode] = useState<'multi' | 'two-file'>('multi');

  // Page workflow steps for Multi-Source
  const [step, setStep] = useState<'setup' | 'processing' | 'results'>('setup');
  
  // Selected flow type
  const [reconcileType, setReconcileType] = useState<string>('FULL_FLOW'); // FULL_FLOW, BANK_INVOICE, etc.
  
  // Active reconciliation batch ID
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Chains Table States
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Timeline detailed Modal
  const [selectedChain, setSelectedChain] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Two-File comparison local state
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [compareAmount, setCompareAmount] = useState(true);
  const [compareDate, setCompareDate] = useState(true);
  const [compareRef, setCompareRef] = useState(true);
  
  // Two-File stepper progress states: 'idle' | 'uploading' | 'cleaning' | 'matching' | 'results'
  const [twoFileStep, setTwoFileStep] = useState<'idle' | 'uploading' | 'cleaning' | 'matching' | 'results'>('idle');
  const [twoFileResults, setTwoFileResults] = useState<any | null>(null);
  const [twoFileError, setTwoFileError] = useState<string | null>(null);

  // Real-time progress updates for Multi-Source
  const [progress, setProgress] = useState<{
    runId: string;
    statusText: string;
    percent: number;
    processed: number;
    total: number;
    matches: number;
    exceptions: number;
    completed: boolean;
  } | null>(null);

  // Query database statistics to show selected datasets
  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['import-stats'],
    queryFn: getImportStats
  });

  // Query runs list
  const { data: runsResponse } = useQuery({
    queryKey: ['reconciliation-runs'],
    queryFn: getReconciliationRuns
  });

  // Query chains list for results step
  const { data: chainsResponse, isLoading: isLoadingChains } = useQuery({
    queryKey: ['batch-chains', selectedRunId, page, statusFilter, searchQuery],
    queryFn: () => getBatchChains(selectedRunId!, {
      page,
      limit: 15,
      status: statusFilter,
      search: searchQuery || undefined
    }),
    enabled: !!selectedRunId && step === 'results'
  });

  // Register Socket progress updates listener
  useEffect(() => {
    if (socket) {
      const handleProgress = (data: any) => {
        setProgress(data);
        if (data.completed) {
          setSelectedRunId(data.runId);
          setStep('results');
          queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] });
        }
      };

      socket.on('reconciliation.progress', handleProgress);
      return () => {
        socket.off('reconciliation.progress', handleProgress);
      };
    }
  }, [socket, queryClient]);

  // Reconciliation Run Mutation
  const reconcileMutation = useMutation({
    mutationFn: () => runReconciliation({
      reconcileType,
      startDate: null,
      endDate: null
    }),
    onMutate: () => {
      setStep('processing');
      setProgress({
        runId: 'executing',
        statusText: 'Reading records',
        percent: 10,
        processed: 0,
        total: 100,
        matches: 0,
        exceptions: 0,
        completed: false
      });
    },
    onSuccess: (data) => {
      setSelectedRunId(data.data.id);
      setTimeout(() => {
        setStep('results');
        queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] });
      }, 500);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Reconciliation engine execution failed.');
      setStep('setup');
    }
  });

  const handleRunReconciliation = () => {
    reconcileMutation.mutate();
  };

  const triggerAIInvestigation = async (exceptionId: string) => {
    if (!exceptionId) return;
    setIsLoadingAI(true);
    setAiAnalysis(null);
    try {
      const res = await investigateExceptionWithAI(exceptionId);
      setAiAnalysis(res.analysis || res.investigation || res.response);
    } catch (err: any) {
      setAiAnalysis(err.response?.data?.message || 'AI Investigation service is busy. Please try again shortly.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Two-File Handlers
  const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setInvoiceFile(e.target.files[0]);
    }
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBankFile(e.target.files[0]);
    }
  };

  const handleRunTwoFileAnalysis = async () => {
    if (!invoiceFile || !bankFile) {
      setTwoFileError('Please select both Invoice/Ledger and Bank Statement files.');
      return;
    }

    setTwoFileError(null);
    setTwoFileStep('uploading');

    try {
      await new Promise(r => setTimeout(r, 800));
      setTwoFileStep('cleaning');

      await new Promise(r => setTimeout(r, 800));
      setTwoFileStep('matching');

      const res = await compareFiles(bankFile, invoiceFile);

      await new Promise(r => setTimeout(r, 800));

      if (res.success || res.stats) {
        setTwoFileResults(res);
        setTwoFileStep('results');
      } else {
        throw new Error(res.message || 'Verification failed.');
      }
    } catch (err: any) {
      setTwoFileError(err.response?.data?.message || err.message || 'An error occurred during file comparison.');
      setTwoFileStep('idle');
    }
  };

  const handleResetTwoFile = () => {
    setInvoiceFile(null);
    setBankFile(null);
    setTwoFileResults(null);
    setTwoFileStep('idle');
    setTwoFileError(null);
  };

  const activeRun = runsResponse?.data?.find((r: any) => r.id === selectedRunId);
  const dbStats = statsResponse?.stats || { invoices: 0, payments: 0, settlements: 0, bankTransactions: 0 };

  return (
    <PageContainer>
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 text-left border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Reconciliation</h2>
          <p className="text-xs font-semibold text-gray-500">Compare your financial records and find what doesn't match.</p>
        </div>
        {step === 'results' && reconcileMode === 'multi' && (
          <button
            onClick={() => {
              setStep('setup');
              setSelectedRunId(null);
            }}
            className="text-[10px] font-black text-gray-500 hover:text-gray-950 flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>New Reconciliation</span>
          </button>
        )}
      </div>

      {/* Sub-tabs selector for Multi-Source vs Two-File */}
      {step === 'setup' && twoFileStep !== 'uploading' && twoFileStep !== 'cleaning' && twoFileStep !== 'matching' && twoFileStep !== 'results' && (
        <div className="flex border-b border-gray-200 mb-6 gap-6 text-xs font-bold text-gray-400 text-left">
          <button
            onClick={() => setReconcileMode('multi')}
            className={`pb-3 border-b-2 cursor-pointer transition-all ${
              reconcileMode === 'multi' 
                ? 'text-gray-900 border-[#2F6F73] font-black' 
                : 'border-transparent hover:text-gray-600'
            }`}
          >
            Multi-Source Reconciliation
          </button>
          <button
            onClick={() => setReconcileMode('two-file')}
            className={`pb-3 border-b-2 cursor-pointer transition-all ${
              reconcileMode === 'two-file' 
                ? 'text-gray-900 border-[#2F6F73] font-black' 
                : 'border-transparent hover:text-gray-600'
            }`}
          >
            Two-File Comparison
          </button>
        </div>
      )}

      {/* MULTI-SOURCE WORKFLOW */}
      {reconcileMode === 'multi' && (
        <>
          {/* SETUP STEP */}
          {step === 'setup' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left animate-in fade-in duration-200">
              
              {/* STEP 1: Choose Flow */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4 lg:col-span-2">
                <div>
                  <span className="text-xs font-black text-gray-900 block">Step 1: Choose Flow</span>
                  <p className="text-[10px] font-semibold text-gray-500 mt-0.5 font-bold">What would you like to reconcile?</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-50 pt-3">
                  {[
                    { id: 'BANK_INVOICE', label: 'Bank + Invoice', desc: 'Verify deposits against customer billing ledgers' },
                    { id: 'INVOICE_PAYMENT', label: 'Invoice + Payment', desc: 'Audit invoice collection logs' },
                    { id: 'PAYMENT_SETTLEMENT', label: 'Payment + Settlement', desc: 'Inspect payment logs against gateway details' },
                    { id: 'SETTLEMENT_BANK', label: 'Settlement + Bank', desc: 'Reconcile gateway payouts to bank statements' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setReconcileType(opt.id)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all space-y-1.5 ${
                        reconcileType === opt.id 
                          ? 'border-[#2F6F73] bg-[#2F6F73]/2' 
                          : 'border-gray-100 hover:border-gray-200 hover:bg-neutral-50/50'
                      }`}
                    >
                      <span className="text-xs font-black text-gray-900 block">{opt.label}</span>
                      <span className="text-[9px] font-bold text-gray-400 block leading-relaxed">{opt.desc}</span>
                    </button>
                  ))}

                  <button
                    onClick={() => setReconcileType('FULL_FLOW')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all space-y-1.5 sm:col-span-2 ${
                      reconcileType === 'FULL_FLOW' 
                        ? 'border-[#2F6F73] bg-[#2F6F73]/2' 
                        : 'border-gray-100 hover:border-gray-200 hover:bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-900 block">Full Finance Flow</span>
                      <span className="bg-[#2F6F73] text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Recommended</span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 block leading-relaxed">
                      Compare all connected financial records: Invoice → Payment → Settlement → Bank
                    </span>
                  </button>
                </div>
              </div>

              {/* STEP 2: Selected Datasets */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs h-fit space-y-5 lg:col-span-1">
                <div>
                  <span className="text-xs font-black text-gray-900 block">Step 2: Selected Datasets</span>
                  <p className="text-[10px] font-semibold text-gray-500 mt-0.5 font-bold">Review active imported records.</p>
                </div>

                <div className="space-y-3 border-t border-gray-50 pt-3 text-xs font-bold text-gray-500">
                  <div className="flex justify-between items-center py-1">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>Invoices</span>
                    </span>
                    <span className="text-gray-900 font-extrabold">{dbStats.invoices} records</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span>Payments</span>
                    </span>
                    <span className="text-gray-900 font-extrabold">{dbStats.payments} records</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-gray-400" />
                      <span>Settlements</span>
                    </span>
                    <span className="text-gray-900 font-extrabold">{dbStats.settlements} records</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-gray-400" />
                      <span>Bank Credits</span>
                    </span>
                    <span className="text-gray-900 font-extrabold">{dbStats.bankTransactions} records</span>
                  </div>
                </div>

                <button
                  onClick={handleRunReconciliation}
                  disabled={reconcileMutation.isPending}
                  className="w-full bg-[#2F6F73] hover:bg-[#204c4f] disabled:opacity-50 text-white p-3 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Run Reconciliation</span>
                </button>
              </div>

            </div>
          )}

          {/* PROCESSING STEP */}
          {step === 'processing' && progress && (
            <div className="max-w-xl mx-auto space-y-6 text-left animate-in fade-in duration-200">
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-5 text-center">
                
                <div className="py-8 space-y-4">
                  <RefreshCw className="w-10 h-10 animate-spin mx-auto text-[#2F6F73]" />
                  
                  <div className="space-y-2 max-w-xs mx-auto">
                    <div className="flex justify-between text-xs font-black text-gray-900 uppercase">
                      <span>{progress.statusText}</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#2F6F73] h-full transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs max-w-xs mx-auto border-t border-gray-100 pt-4 text-left font-bold text-gray-500">
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase">Analyzed</span>
                      <span className="text-gray-900 font-extrabold mt-0.5 block">{progress.processed} / {progress.total}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase">Match Rate</span>
                      <span className="text-gray-900 font-extrabold mt-0.5 block">
                        {progress.processed > 0 ? `${((progress.matches / progress.processed) * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase">Matched</span>
                      <span className="text-green-600 font-extrabold mt-0.5 block">{progress.matches}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase">Exceptions</span>
                      <span className="text-red-500 font-extrabold mt-0.5 block">{progress.exceptions}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* RESULTS STEP */}
          {step === 'results' && selectedRunId && activeRun && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              
              {/* STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Matched Records</span>
                  <span className="text-2xl font-black text-green-600 block mt-2">
                    {activeRun.matchedRecords} <span className="text-xs font-bold text-gray-400">/ {activeRun.recordsProcessed}</span>
                  </span>
                </div>

                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Exceptions Found</span>
                  <span className="text-2xl font-black text-amber-500 block mt-2">
                    {activeRun.exceptionsFound}
                  </span>
                </div>

                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Match Efficiency</span>
                  <span className="text-2xl font-black text-gray-900 block mt-2">
                    {activeRun.matchRate.toFixed(1)}%
                  </span>
                </div>

              </div>

              {/* FILTERS & CHAINS TABLE */}
              <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs space-y-4">
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <span className="text-xs font-black text-gray-900 uppercase">Analysis Results Mapping Registry</span>
                  
                  {/* Status Filters */}
                  <div className="flex flex-wrap gap-1">
                    {['All', 'FULLY_RECONCILED', 'AMOUNT_MISMATCH', 'UNRESOLVED'].map(f => (
                      <button
                        key={f}
                        onClick={() => { setStatusFilter(f); setPage(1); }}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase cursor-pointer border ${
                          statusFilter === f 
                            ? 'bg-[#2F6F73] text-white border-[#2F6F73]' 
                            : 'bg-white text-gray-500 border-gray-100 hover:bg-neutral-50'
                        }`}
                      >
                        {f === 'FULLY_RECONCILED' ? 'Matched' : (f === 'All' ? 'All Rows' : f.replace(/_/g, ' '))}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto -mx-5">
                  <table className="min-w-full divide-y divide-gray-100 text-xs font-semibold text-gray-600">
                    <thead className="bg-neutral-50 text-[9px] text-gray-400 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-5 text-left">Invoice Ref</th>
                        <th className="text-left">Payment Ref</th>
                        <th className="text-left">Settlement Ref</th>
                        <th className="text-left">Bank Ref</th>
                        <th className="text-left">Status</th>
                        <th className="text-left">Diff</th>
                        <th className="text-right py-2.5 px-5 font-bold">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {chainsResponse?.chains?.map((chain: any) => (
                        <tr key={chain.id} className="hover:bg-neutral-50/50">
                          <td className="py-3 px-5 text-gray-900 font-bold font-mono text-[10px]">
                            {chain.invoice?.externalId || '—'}
                          </td>
                          <td className="text-gray-500 font-mono text-[10px]">{chain.payment?.externalId || '—'}</td>
                          <td className="text-gray-500 font-mono text-[10px]">{chain.settlement?.externalId || '—'}</td>
                          <td className="text-gray-500 font-mono text-[10px]">
                            {chain.bank?.utr || chain.bank?.externalId || '—'}
                          </td>
                          <td>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              chain.status === 'FULLY_RECONCILED'
                                ? 'bg-green-50 text-green-700'
                                : (chain.status === 'AMOUNT_MISMATCH' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')
                            }`}>
                              {chain.status === 'FULLY_RECONCILED' ? 'MATCHED' : chain.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className={`font-black ${chain.difference !== 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {chain.difference !== 0 ? formatCurrency(chain.difference) : '—'}
                          </td>
                          <td className="py-3 px-5 text-right">
                            <button
                              onClick={() => { setSelectedChain(chain); setAiAnalysis(null); }}
                              className="text-[10px] font-black text-[#2F6F73] hover:underline cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {chainsResponse?.chains?.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400 italic font-semibold">No records found matching filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {chainsResponse && chainsResponse.totalPages > 1 && (
                  <div className="flex justify-between items-center pt-4 border-t border-gray-50 text-[10px] font-bold text-gray-500">
                    <span>Page {page} of {chainsResponse.totalPages}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-2.5 py-1.5 border border-gray-100 rounded-lg disabled:opacity-40 cursor-pointer"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(chainsResponse.totalPages, p + 1))}
                        disabled={page === chainsResponse.totalPages}
                        className="px-2.5 py-1.5 border border-gray-100 rounded-lg disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </>
      )}

      {/* TWO-FILE COMPARISON WORKFLOW */}
      {reconcileMode === 'two-file' && (
        <div className="space-y-6 text-left animate-in fade-in duration-200">
          
          {twoFileStep === 'idle' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* UPLOAD FORM PANEL */}
              <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-6">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Two-File Reconciliation</h3>
                  <p className="text-xs text-gray-400 font-semibold mt-1">Upload an invoice ledger and a bank statement to find matching entries and exceptions.</p>
                </div>

                {twoFileError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-[#C94C4C] rounded-lg text-xs flex items-start gap-2.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{twoFileError}</span>
                  </div>
                )}

                {/* FILE UPLOAD GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ledger Box */}
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 hover:border-[#2F6F73]/50 transition-colors relative flex flex-col items-center justify-center min-h-[160px] text-center">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.json"
                      onChange={handleInvoiceChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-8 h-8 text-gray-300 mb-2" />
                    <span className="text-xs font-black text-gray-800">UPLOAD INVOICE/LEDGER</span>
                    <span className="text-[10px] text-gray-400 font-semibold mt-1">CSV / XLSX / JSON</span>
                    {invoiceFile && (
                      <span className="mt-3 bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-black px-2.5 py-1 rounded-lg">
                        {invoiceFile.name} ({(invoiceFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>

                  {/* Bank Statement Box */}
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 hover:border-[#2F6F73]/50 transition-colors relative flex flex-col items-center justify-center min-h-[160px] text-center">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.json"
                      onChange={handleBankChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-8 h-8 text-gray-300 mb-2" />
                    <span className="text-xs font-black text-gray-800">UPLOAD BANK STATEMENT</span>
                    <span className="text-[10px] text-gray-400 font-semibold mt-1">CSV / XLSX / JSON</span>
                    {bankFile && (
                      <span className="mt-3 bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-black px-2.5 py-1 rounded-lg">
                        {bankFile.name} ({(bankFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                </div>

                {/* MATCH CRITERIA */}
                <div className="border-t border-gray-50 pt-5 space-y-3">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wide">Comparison Criteria Options</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl hover:bg-neutral-50/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={compareAmount}
                        onChange={(e) => setCompareAmount(e.target.checked)}
                        className="rounded border-gray-300 text-[#2F6F73] focus:ring-[#2F6F73]"
                      />
                      <span className="text-xs font-bold text-gray-700">Compare Amount</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl hover:bg-neutral-50/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={compareDate}
                        onChange={(e) => setCompareDate(e.target.checked)}
                        className="rounded border-gray-300 text-[#2F6F73] focus:ring-[#2F6F73]"
                      />
                      <span className="text-xs font-bold text-gray-700">Compare Date</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl hover:bg-neutral-50/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={compareRef}
                        onChange={(e) => setCompareRef(e.target.checked)}
                        className="rounded border-gray-300 text-[#2F6F73] focus:ring-[#2F6F73]"
                      />
                      <span className="text-xs font-bold text-gray-700">Compare Reference</span>
                    </label>
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <div className="pt-2 text-right">
                  <button
                    onClick={handleRunTwoFileAnalysis}
                    disabled={!invoiceFile || !bankFile}
                    className="bg-[#2F6F73] hover:bg-[#204c4f] disabled:opacity-40 text-white text-xs font-black px-6 py-3 rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Run Match Analysis</span>
                  </button>
                </div>
              </div>

              {/* AUDIT FLOW DIAGRAM GRAPH */}
              <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wider block mb-4">Reconciliation Workflow</span>
                  <div className="relative pl-6 space-y-5 border-l-2 border-dashed border-gray-100 ml-3 py-1">
                    {[
                      { title: 'Upload Files', desc: 'Ledger spreadsheet and bank statement credit feeds.' },
                      { title: 'Clean Data', desc: 'Column auto-mapping, formatting dates, and normalization.' },
                      { title: 'Find Possible Match', desc: 'Verify amount, date ranges, and reference keys.' },
                      { title: 'Evaluation Split', desc: 'Categorize records into Match, Partial, or Unmatched.' },
                      { title: 'Exceptions Workspace', desc: 'Identify difference values and flag for review.' },
                      { title: 'Final Report Card', desc: 'Overall health audit report ready for review.' }
                    ].map((step, idx) => (
                      <div key={idx} className="relative text-xs">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        </div>
                        <h4 className="font-black text-gray-800 uppercase tracking-wide">{step.title}</h4>
                        <p className="text-[10px] text-gray-400 font-semibold leading-relaxed mt-0.5">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* LOADING STATE */}
          {(twoFileStep === 'uploading' || twoFileStep === 'cleaning' || twoFileStep === 'matching') && (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-6 shadow-2xs">
              <div className="w-14 h-14 bg-[#2F6F73]/5 text-[#2F6F73] rounded-2xl flex items-center justify-center mx-auto animate-spin">
                <RefreshCw className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black text-gray-900 uppercase animate-pulse">
                  {twoFileStep === 'uploading' && 'Uploading Documents...'}
                  {twoFileStep === 'cleaning' && 'Cleaning & Normalizing Data...'}
                  {twoFileStep === 'matching' && 'Finding Possible Matches...'}
                </h3>
                <p className="text-xs text-gray-400 font-semibold max-w-xs mx-auto leading-relaxed">
                  {twoFileStep === 'uploading' && 'Parsing input buffers and checking header maps...'}
                  {twoFileStep === 'cleaning' && 'Stripping currency symbols, validating formats, and isolating dates...'}
                  {twoFileStep === 'matching' && 'Comparing ledger values against bank statement entries...'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#2F6F73] h-full transition-all duration-700" 
                  style={{ 
                    width: twoFileStep === 'uploading' ? '30%' : (twoFileStep === 'cleaning' ? '65%' : '90%') 
                  }} 
                />
              </div>
            </div>
          )}

          {/* TWO-FILE RESULTS */}
          {twoFileStep === 'results' && twoFileResults && (
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              
              {/* Actions Header bar */}
              <div className="flex justify-between items-center bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-black text-gray-900 uppercase">Comparison Results</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="border border-gray-200 hover:border-gray-300 hover:bg-neutral-50/50 text-gray-700 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Report</span>
                  </button>
                  <button
                    onClick={handleResetTwoFile}
                    className="bg-[#2F6F73] hover:bg-[#204c4f] text-white px-4 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer"
                  >
                    Compare New Files
                  </button>
                </div>
              </div>

              {/* Match Category Split Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                
                {/* Column 1: Match */}
                <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-2xs space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Matched</span>
                    <span className="text-3xl font-black text-emerald-600 block mt-1">{twoFileResults.stats.matchedCount}</span>
                    <span className="text-[9px] font-bold text-emerald-600 block mt-1">Successfully Reconciled ✅</span>
                  </div>
                </div>

                {/* Column 2: Partial */}
                <div className="bg-white border border-amber-100 rounded-3xl p-6 shadow-2xs space-y-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Partial Matches</span>
                    <span className="text-3xl font-black text-amber-500 block mt-1">
                      {twoFileResults.mismatches.filter((m: any) => m.type !== 'MISSING_IN_INVOICE' && m.type !== 'MISSING_IN_BANK').length}
                    </span>
                    <span className="text-[9px] font-bold text-amber-600 block mt-1">Variance Detected ⚠️</span>
                  </div>
                </div>

                {/* Column 3: Unmatched */}
                <div className="bg-white border border-red-100 rounded-3xl p-6 shadow-2xs space-y-4">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Unmatched</span>
                    <span className="text-3xl font-black text-red-500 block mt-1">
                      {twoFileResults.mismatches.filter((m: any) => m.type === 'MISSING_IN_INVOICE' || m.type === 'MISSING_IN_BANK').length}
                    </span>
                    <span className="text-[9px] font-bold text-red-500 block mt-1">Counterpart Missing ❌</span>
                  </div>
                </div>

              </div>

              {/* Exceptions Table */}
              <SectionCard title="Exceptions Identified">
                <div className="overflow-x-auto -mx-5 -my-4">
                  <table className="min-w-full divide-y divide-gray-100 text-xs font-semibold text-gray-600">
                    <thead className="bg-neutral-50 text-[9px] text-gray-400 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-5 text-left">Transaction Ref</th>
                        <th className="text-left">Issue Type</th>
                        <th className="text-left">Bank Amount</th>
                        <th className="text-left">Invoice Amount</th>
                        <th className="text-left">Difference</th>
                        <th className="text-left">Severity</th>
                        <th className="text-right py-2.5 px-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {twoFileResults.mismatches.map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-neutral-50/30">
                          <td className="py-3 px-5 text-gray-900 font-mono text-[9px] font-bold">{m.reference}</td>
                          <td className="text-gray-900">{m.type.replace(/_/g, ' ')}</td>
                          <td>{m.bankAmount > 0 ? formatCurrency(m.bankAmount) : '—'}</td>
                          <td>{m.invoiceAmount > 0 ? formatCurrency(m.invoiceAmount) : '—'}</td>
                          <td className="text-red-500 font-black">{formatCurrency(Math.abs(m.difference))}</td>
                          <td>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              m.severity === 'CRITICAL' || m.severity === 'HIGH'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {m.severity}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black bg-red-50 text-red-600 uppercase">
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {twoFileResults.mismatches.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400 font-semibold italic">No exceptions found. The files match perfectly!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              {/* Final Report Card Summary */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider block">Final Report Card Summary</span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 border border-gray-50 rounded-2xl bg-neutral-50/50">
                    <span className="text-gray-400 font-bold block uppercase text-[8px] tracking-wider">Total Bank Records</span>
                    <span className="text-xl font-black text-gray-900 mt-1 block">{twoFileResults.stats.totalBankRecords}</span>
                  </div>
                  <div className="p-4 border border-gray-50 rounded-2xl bg-neutral-50/50">
                    <span className="text-gray-400 font-bold block uppercase text-[8px] tracking-wider">Total Invoice Records</span>
                    <span className="text-xl font-black text-gray-900 mt-1 block">{twoFileResults.stats.totalInvoiceRecords}</span>
                  </div>
                  <div className="p-4 border border-gray-50 rounded-2xl bg-neutral-50/50">
                    <span className="text-gray-400 font-bold block uppercase text-[8px] tracking-wider">Reconciled Match Rate</span>
                    <span className={`text-xl font-black mt-1 block ${twoFileResults.stats.matchRate >= 90 ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {twoFileResults.stats.matchRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-4 border border-gray-50 rounded-2xl bg-neutral-50/50">
                    <span className="text-gray-400 font-bold block uppercase text-[8px] tracking-wider">Total Monetary Discrepancies</span>
                    <span className="text-xl font-black text-red-500 mt-1 block">
                      {formatCurrency(twoFileResults.mismatches.reduce((sum: number, m: any) => sum + Math.abs(m.difference), 0))}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* CHAIN DETAIL SIDEBAR TIMELINE DRAWER */}
      {selectedChain && (
        <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs flex justify-end">
          <div 
            className="bg-white border-l border-gray-100 w-full max-w-lg h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between text-left animate-in slide-in-from-right duration-200"
          >
            
            {/* Drawer Header */}
            <div>
              <div className="flex justify-between items-center border-b border-neutral-100 pb-4 mb-5">
                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Transaction Audit Lifecycle</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Chronological comparison audit timeline</p>
                </div>
                <button 
                  onClick={() => { setSelectedChain(null); setAiAnalysis(null); }}
                  className="text-gray-400 hover:text-gray-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* TIMELINE LIST */}
              <div className="relative pl-5 border-l-2 border-neutral-100 space-y-6 py-2 ml-4">
                
                {/* 1. Invoice Card */}
                <div className="flex gap-4 items-start relative z-10">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    selectedChain.invoice 
                      ? 'bg-green-50 border border-green-200 text-green-600 font-black' 
                      : 'bg-red-50 border border-red-200 text-red-600 font-black'
                  }`}>
                    {selectedChain.invoice ? '✓' : '✗'}
                  </div>
                  <div className="p-2.5 border border-neutral-100 rounded-xl bg-neutral-50/50 flex-1 space-y-0.5 text-xs">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Invoice Entry</span>
                    {selectedChain.invoice ? (
                      <>
                        <span className="font-mono font-extrabold text-gray-900 block text-[10px] truncate">{selectedChain.invoice.externalId}</span>
                        <span className="font-bold text-gray-900 mt-0.5 block">{formatCurrency(selectedChain.invoice.amount)}</span>
                      </>
                    ) : (
                      <span className="text-red-500 font-bold italic block mt-1">Invoice Missing</span>
                    )}
                  </div>
                </div>

                {/* 2. Payment Card */}
                <div className="flex gap-4 items-start relative z-10">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    selectedChain.payment 
                      ? 'bg-green-50 border border-green-200 text-green-600 font-black' 
                      : 'bg-red-50 border border-red-200 text-red-600 font-black'
                  }`}>
                    {selectedChain.payment ? '✓' : '✗'}
                  </div>
                  <div className="p-2.5 border border-neutral-100 rounded-xl bg-neutral-50/50 flex-1 space-y-0.5 text-xs">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Payment Capture (Razorpay)</span>
                    {selectedChain.payment ? (
                      <>
                        <span className="font-mono font-extrabold text-gray-900 block text-[10px] truncate">{selectedChain.payment.externalId}</span>
                        <span className="font-bold text-gray-900 mt-0.5 block">{formatCurrency(selectedChain.payment.amount)}</span>
                      </>
                    ) : (
                      <span className="text-red-500 font-bold italic block mt-1">Payment Capture Missing</span>
                    )}
                  </div>
                </div>

                {/* 3. Settlement Card */}
                <div className="flex gap-4 items-start relative z-10">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    selectedChain.settlement 
                      ? 'bg-green-50 border border-green-200 text-green-600 font-black' 
                      : 'bg-red-50 border border-red-200 text-red-600 font-black'
                  }`}>
                    {selectedChain.settlement ? '✓' : '✗'}
                  </div>
                  <div className="p-2.5 border border-neutral-100 rounded-xl bg-neutral-50/50 flex-1 space-y-0.5 text-xs">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Razorpay Gateway Payout</span>
                    {selectedChain.settlement ? (
                      <>
                        <span className="font-mono font-extrabold text-gray-900 block text-[10px] truncate">{selectedChain.settlement.externalId}</span>
                        <span className="font-bold text-gray-900 mt-0.5 block">{formatCurrency(selectedChain.settlement.amount)}</span>
                      </>
                    ) : (
                      <span className="text-red-500 font-bold italic block mt-1">Settlement Payout Missing</span>
                    )}
                  </div>
                </div>

                {/* 4. Bank Card */}
                <div className="flex gap-4 items-start relative z-10">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    selectedChain.bank 
                      ? 'bg-green-50 border border-green-200 text-green-600 font-black' 
                      : 'bg-red-50 border border-red-200 text-red-600 font-black'
                  }`}>
                    {selectedChain.bank ? '✓' : '✗'}
                  </div>
                  <div className="p-2.5 border border-neutral-100 rounded-xl bg-neutral-50/50 flex-1 space-y-0.5 text-xs">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Bank Statement Credit</span>
                    {selectedChain.bank ? (
                      <>
                        <span className="font-mono font-extrabold text-gray-900 block text-[10px] truncate">{selectedChain.bank.externalId}</span>
                        <span className="font-bold text-gray-900 mt-0.5 block">{formatCurrency(selectedChain.bank.amount)}</span>
                      </>
                    ) : (
                      <span className="text-red-500 font-bold italic block mt-1">Bank Credit Missing</span>
                    )}
                  </div>
                </div>

              </div>

              {/* COGNITIVE INVESTIGATION & RECOMMENDATION PANEL */}
              <div className="space-y-4 text-xs font-semibold mt-6">
                
                {/* Exception info card */}
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-3 text-left">
                  <div className="flex items-center gap-1.5 font-bold text-red-800">
                    <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
                    <span className="text-[10px] uppercase tracking-wider font-extrabold">Reconciliation Discrepancy</span>
                  </div>
                  
                  <div className="space-y-2 text-[10px] leading-relaxed text-red-700">
                    <p><span className="font-extrabold block">What is different?</span> {selectedChain.notes || 'Incomplete transaction flow.'}</p>
                    <p><span className="font-extrabold block">Where is it different?</span> In the lifecycle chain between the connected financial source datasets.</p>
                    {selectedChain.difference !== 0 && (
                      <p><span className="font-extrabold block">How much is different?</span> {formatCurrency(Math.abs(selectedChain.difference))} gap detected.</p>
                    )}
                    <p>
                      <span className="font-extrabold block">Which records caused the exception?</span>
                      <span className="font-mono text-[9px] block">
                        Invoice ID: {selectedChain.invoice?.externalId || 'Missing'}<br />
                        Payment ID: {selectedChain.payment?.externalId || 'Missing'}<br />
                        Settlement ID: {selectedChain.settlement?.externalId || 'Missing'}<br />
                        Bank UTR: {selectedChain.bank?.utr || selectedChain.bank?.externalId || 'Missing'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* AI Agent investigational card */}
                <div className="bg-[#0B1726] border border-[#16273b] text-white p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 font-extrabold text-white border-b border-white/10 pb-2">
                    <Sparkles className="w-4 h-4 text-[#2F6F73] fill-white" />
                    <span className="text-[9px] uppercase tracking-wider">AI Copilot Analysis</span>
                  </div>

                  {isLoadingAI ? (
                    <div className="py-4 text-center text-gray-400 space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2F6F73]" />
                      <span className="text-[9px] font-bold block">Running anomaly investigation...</span>
                    </div>
                  ) : aiAnalysis ? (
                    <p className="text-gray-300 leading-relaxed text-[10px] font-medium whitespace-pre-line">{aiAnalysis}</p>
                  ) : (
                    <div className="text-left space-y-2">
                      <p className="text-gray-400 text-[10px] leading-relaxed">
                        Flagged exception has not been queried. Run the Groq AI Copilot anomaly investigator to analyze narration text and deduct gateway fees.
                      </p>
                      {selectedChain.exceptionId ? (
                        <button
                          onClick={() => triggerAIInvestigation(selectedChain.exceptionId)}
                          className="bg-[#2F6F73] hover:bg-[#204c4f] text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 fill-white" />
                          <span>Run AI Investigation</span>
                        </button>
                      ) : (
                        <span className="text-gray-500 italic text-[9px] block">No anomaly ID mapped for AI query.</span>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="border-t border-neutral-100 pt-4 mt-6 flex justify-end gap-2">
              <button 
                onClick={() => { setSelectedChain(null); setAiAnalysis(null); }}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-neutral-50 rounded-xl text-xs font-black cursor-pointer"
              >
                Close Panel
              </button>
            </div>

          </div>
        </div>
      )}

    </PageContainer>
  );
}
