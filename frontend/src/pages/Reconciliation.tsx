import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getReconciliationSummary, 
  getReconciliationRuns, 
  getReconciliationRunById, 
  getReconciliationRecords,
  runReconciliation 
} from '../api/reconciliation.api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Calendar, 
  ChevronRight, 
  X,
  FileText,
  TrendingUp,
  History
} from 'lucide-react';

export default function ReconciliationPage() {
  const queryClient = useQueryClient();
  
  // Date period for triggering reconciliation run
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reconciling, setReconciling] = useState(false);

  // Selected Reconciliation Run Detail
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Query general matching stats
  const { data: summaryData } = useQuery({
    queryKey: ['reconciliation-summary'],
    queryFn: getReconciliationSummary
  });

  // Query run history list
  const { data: runsResponse, isLoading: isLoadingRuns } = useQuery({
    queryKey: ['reconciliation-runs'],
    queryFn: getReconciliationRuns
  });

  // Query details of selected run
  const { data: runDetail, isLoading: isLoadingRunDetail } = useQuery({
    queryKey: ['reconciliation-run-detail', selectedRunId],
    queryFn: () => getReconciliationRunById(selectedRunId!),
    enabled: !!selectedRunId
  });

  // Run Reconciliation mutation
  const runMutation = useMutation({
    mutationFn: runReconciliation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] });
      setStartDate('');
      setEndDate('');
      alert('Deterministic reconciliation engine run completed! Audit logs created.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Reconciliation execution failed.');
    }
  });

  const handleRunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('Please specify a valid start and end date range.');
      return;
    }
    runMutation.mutate({
      source: 'Payments',
      target: 'Settlements',
      startDate,
      endDate
    });
  };

  return (
    <div className="space-y-6 text-left relative min-h-[70vh]">
      {/* Top Aggregates Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <History className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Runs</span>
            <span className="text-sm font-extrabold text-gray-900 mt-0.5 block">
              {summaryData?.data?.totalRuns || 0} batches
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Reconciled</span>
            <span className="text-sm font-extrabold text-green-600 mt-0.5 block">
              {summaryData?.data?.reconciledRecords || 0} records
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Mismatches / Exs</span>
            <span className="text-sm font-extrabold text-red-600 mt-0.5 block">
              {summaryData?.data?.totalExceptions || 0} exceptions
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Audit Accuracy</span>
            <span className="text-sm font-extrabold text-indigo-600 mt-0.5 block">
              {summaryData?.data?.matchRate?.toFixed(2) || '0.00'}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trigger Run & Run History Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trigger Reconciliation Form */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Trigger Reconciliation Audit</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Perform deterministic matching between gateway captured payments and actual payouts.</p>
            </div>

            <form onSubmit={handleRunSubmit} className="flex flex-wrap items-end gap-3 text-xs">
              <div className="space-y-1 flex-1 min-w-[130px]">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff] bg-white"
                />
              </div>

              <div className="space-y-1 flex-1 min-w-[130px]">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff] bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={runMutation.isPending}
                className="flex items-center justify-center gap-1.5 bg-[#0048ff] hover:bg-[#003be0] text-white px-5 py-2.5 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runMutation.isPending ? 'animate-spin' : ''}`} />
                Run Matching Engine
              </button>
            </form>
          </div>

          {/* Run History Table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-900">Audit Batch History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-bold uppercase">
                  <tr>
                    <th className="py-3 px-4">Run Date</th>
                    <th>Period Range</th>
                    <th>Records Processed</th>
                    <th>Match Rate</th>
                    <th>Exceptions</th>
                    <th>Status</th>
                    <th className="text-right py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                  {isLoadingRuns ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center">
                        <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </td>
                    </tr>
                  ) : runsResponse?.data?.map((run: any) => (
                    <tr 
                      key={run.id}
                      onClick={() => setSelectedRunId(run.id)}
                      className={`hover:bg-neutral-50/70 transition-colors cursor-pointer ${selectedRunId === run.id ? 'bg-[#eff6ff]/30 font-semibold' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-gray-900">{formatDate(run.createdAt)}</td>
                      <td className="text-gray-400">{formatDate(run.startDate)} to {formatDate(run.endDate)}</td>
                      <td className="font-bold">{run.recordsProcessed}</td>
                      <td className={`font-bold ${run.matchRate >= 95 ? 'text-green-600' : 'text-blue-600'}`}>
                        {run.matchRate.toFixed(2)}%
                      </td>
                      <td className="font-bold text-red-500">{run.exceptionsFound}</td>
                      <td>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-100">
                          {run.status}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <button className="text-[10px] font-bold text-[#0048ff] hover:underline cursor-pointer">
                          Inspect records →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isLoadingRuns && (!runsResponse?.data || runsResponse.data.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">No reconciliation runs recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Batch Record Details Panel (Sidebar style) */}
        {selectedRunId && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex flex-col gap-5 text-xs text-left h-fit self-start">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Batch Mapping Records</h3>
                <p className="text-[10px] text-gray-400 font-semibold">Deterministic verification list</p>
              </div>
              <button 
                onClick={() => setSelectedRunId(null)}
                className="p-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {isLoadingRunDetail ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : runDetail?.data?.records ? (
              <div className="space-y-4">
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex justify-between items-center">
                  <div>
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Match Rate</span>
                    <span className="text-lg font-extrabold text-indigo-600 block mt-0.5">{runDetail.data.matchRate.toFixed(2)}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Discrepancies</span>
                    <span className="text-lg font-extrabold text-red-500 block mt-0.5">{runDetail.data.exceptionsFound}</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {runDetail.data.records.map((rec: any) => (
                    <div key={rec.id} className="p-3 border border-neutral-100 rounded-xl space-y-2 bg-white hover:border-gray-200 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          rec.matchStatus === 'MATCHED'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {rec.matchStatus}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold">{rec.matchType}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Payment ID</span>
                          <span className="font-mono text-gray-900 font-semibold">{rec.sourceRecordId || 'MISSING'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Settlement ID</span>
                          <span className="font-mono text-gray-900 font-semibold">{rec.targetRecordId || 'MISSING'}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1 border-t border-gray-50">
                          <span className="text-gray-500">Difference</span>
                          <span className={rec.difference !== 0 ? 'text-red-500' : 'text-gray-900'}>
                            {formatCurrency(rec.difference)}
                          </span>
                        </div>
                      </div>

                      {rec.notes && (
                        <p className="text-[10px] text-neutral-500 leading-normal bg-neutral-50 p-2 rounded-lg mt-1 border border-neutral-100/30">
                          {rec.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-gray-400">Failed to load run details.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
