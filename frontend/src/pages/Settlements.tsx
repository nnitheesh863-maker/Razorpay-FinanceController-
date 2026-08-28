import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getSettlements, 
  getSettlementById, 
  createSettlement, 
  linkTransactionsToSettlement 
} from '../api/settlements.api';
import { getTransactions } from '../api/transactions.api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Search, 
  Plus, 
  X, 
  Coins, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  Link2,
  TrendingDown
} from 'lucide-react';

export default function SettlementsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expectedAmount, setExpectedAmount] = useState('');
  const [settledAmount, setSettledAmount] = useState('');
  const [fees, setFees] = useState('');
  const [gatewayReference, setGatewayReference] = useState('');
  const [settlementDate, setSettlementDate] = useState('');

  // Selected Detail state
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);

  // Fetch Settlements
  const { data: settlementsResponse, isLoading } = useQuery({
    queryKey: ['settlements', page, status, search],
    queryFn: () => getSettlements({
      page,
      limit: 10,
      status: status || undefined,
      search: search || undefined
    })
  });

  // Fetch Details
  const { data: settlementDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['settlement-detail', selectedSettlementId],
    queryFn: () => getSettlementById(selectedSettlementId!),
    enabled: !!selectedSettlementId
  });

  // Fetch unlinked transactions for link dropdown
  const { data: unlinkedTransactions } = useQuery({
    queryKey: ['unlinked-transactions-dropdown'],
    queryFn: () => getTransactions({ limit: 50, status: 'SUCCESS' })
  });

  // Create Settlement Mutation
  const createSettlementMutation = useMutation({
    mutationFn: createSettlement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      setShowCreateModal(false);
      setExpectedAmount('');
      setSettledAmount('');
      setFees('');
      setGatewayReference('');
      setSettlementDate('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to record settlement.');
    }
  });

  // Link Transactions Mutation
  const linkMutation = useMutation({
    mutationFn: ({ id, txIds }: { id: string; txIds: string[] }) => linkTransactionsToSettlement(id, txIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement-detail', selectedSettlementId] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      alert('Transactions linked to settlement payout log!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Linking failed.');
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedAmount || !settledAmount || !gatewayReference) {
      alert('Please fill out all required fields.');
      return;
    }
    createSettlementMutation.mutate({
      expectedAmount: Number(expectedAmount),
      settledAmount: Number(settledAmount),
      fees: Number(fees || 0),
      gatewayReference,
      settlementDate: settlementDate || new Date().toISOString()
    });
  };

  const handlePrevPage = () => setPage(p => Math.max(1, p - 1));
  const handleNextPage = () => {
    if (settlementsResponse?.pagination?.totalPages && page < settlementsResponse.pagination.totalPages) {
      setPage(p => p + 1);
    }
  };

  return (
    <div className="space-y-6 text-left relative min-h-[70vh]">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main list */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
            <div className="flex flex-1 gap-2 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search gateway reference..."
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
                <option value="SETTLED">SETTLED</option>
                <option value="PENDING">PENDING</option>
                <option value="DISCREPANCY">DISCREPANCY</option>
              </select>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-[#0048ff] hover:bg-[#003be0] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Settlement
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-bold uppercase">
                  <tr>
                    <th className="py-3 px-4">Gateway Reference</th>
                    <th>Expected</th>
                    <th>Settled</th>
                    <th>Gateway Fees</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-right py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </td>
                    </tr>
                  ) : settlementsResponse?.data?.map((setl) => (
                    <tr 
                      key={setl.id}
                      onClick={() => setSelectedSettlementId(setl.id)}
                      className={`hover:bg-neutral-50/70 transition-colors cursor-pointer ${selectedSettlementId === setl.id ? 'bg-[#eff6ff]/30 font-semibold' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-900">{setl.gatewayReference}</td>
                      <td className="font-bold">{formatCurrency(setl.expectedAmount)}</td>
                      <td className="font-bold text-green-600">{formatCurrency(setl.settledAmount)}</td>
                      <td className="text-gray-400">{formatCurrency(setl.fees)}</td>
                      <td className="text-gray-400">{formatDate(setl.settlementDate)}</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          setl.status === 'SETTLED'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : setl.status === 'DISCREPANCY'
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : 'bg-neutral-50 text-neutral-600 border border-neutral-100'
                        }`}>
                          {setl.status}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <button className="text-[10px] font-bold text-[#0048ff] hover:underline cursor-pointer">
                          View details →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && (!settlementsResponse?.data || settlementsResponse.data.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">No settlements log entries match selection.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {settlementsResponse?.pagination && (
              <div className="bg-white px-4 py-3.5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-semibold">
                  Page {settlementsResponse.pagination.page} of {settlementsResponse.pagination.totalPages} ({settlementsResponse.pagination.total} records)
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
                    disabled={page === settlementsResponse.pagination.totalPages}
                    className="p-1 border border-gray-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settlement Detail drawer */}
        {selectedSettlementId && (
          <div className="w-full lg:w-96 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm self-start flex flex-col gap-5 text-xs text-left">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Settlement Payout Card</h3>
                <p className="text-[10px] text-gray-400 font-semibold">Gateway deductions & ledger mappings</p>
              </div>
              <button 
                onClick={() => setSelectedSettlementId(null)}
                className="p-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : settlementDetail?.data ? (
              <div className="space-y-5">
                {/* Meta details */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Gateway Reference</span>
                    <span className="font-mono font-bold text-gray-900">{settlementDetail.data.gatewayReference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Expected Payout</span>
                    <span className="font-bold text-gray-900">{formatCurrency(settlementDetail.data.expectedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Actual Settled</span>
                    <span className="font-bold text-green-600">{formatCurrency(settlementDetail.data.settledAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Gateway Fees</span>
                    <span className="font-bold text-gray-900">{formatCurrency(settlementDetail.data.fees)}</span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200/60 pt-2 font-bold">
                    <span className="text-gray-500">Difference</span>
                    <span className={settlementDetail.data.expectedAmount - settlementDetail.data.settledAmount - settlementDetail.data.fees !== 0 ? 'text-red-500' : 'text-gray-900'}>
                      {formatCurrency(settlementDetail.data.expectedAmount - settlementDetail.data.settledAmount - settlementDetail.data.fees)}
                    </span>
                  </div>
                </div>

                {/* Discrepancy warning */}
                {settlementDetail.data.expectedAmount - settlementDetail.data.settledAmount - settlementDetail.data.fees !== 0 && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2.5 text-[11px] text-red-800 leading-normal font-semibold">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>Gateway Payout Mismatch!</span>
                      <p className="text-[10px] text-red-600/90 font-medium mt-0.5">The difference cannot be explained by standard processing fees. Exception flag raised.</p>
                    </div>
                  </div>
                )}

                {/* Linked transactions */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Linked Ledger Transactions</span>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden bg-white max-h-[200px] overflow-y-auto">
                    {settlementDetail.data.transactions?.map((tx: any) => (
                      <div key={tx.id} className="p-3 flex justify-between items-center hover:bg-neutral-50/40">
                        <div>
                          <p className="font-mono text-gray-900 text-[10px]">{tx.reference || 'N/A'}</p>
                          <span className="text-[9px] text-gray-400">{formatDate(tx.createdAt)}</span>
                        </div>
                        <span className="font-bold text-gray-900">{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                    {(!settlementDetail.data.transactions || settlementDetail.data.transactions.length === 0) && (
                      <p className="p-4 text-center text-gray-400 italic">No ledger transactions mapped yet.</p>
                    )}
                  </div>
                </div>

                {/* Quick Link Transactions dropdown */}
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Map Unlinked Transaction</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        linkMutation.mutate({ id: settlementDetail.data.id, txIds: [e.target.value] });
                        e.target.value = '';
                      }
                    }}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 cursor-pointer bg-white"
                  >
                    <option value="">Choose transaction reference...</option>
                    {unlinkedTransactions?.data
                      ?.filter((tx: any) => !tx.settlementId)
                      ?.map((tx: any) => (
                        <option key={tx.id} value={tx.id}>
                          {tx.reference || 'TX'} - {formatCurrency(tx.amount)} ({formatDate(tx.createdAt)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-gray-400">Failed to load settlement card.</div>
            )}
          </div>
        )}
      </div>

      {/* Settlement Entry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-100 shadow-xl space-y-4 text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-sm text-gray-900">Record Payout Settlement</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gateway Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="setl_8FD982FD9"
                  value={gatewayReference}
                  onChange={(e) => setGatewayReference(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Expected (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Settled (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="9800"
                    value={settledAmount}
                    onChange={(e) => setSettledAmount(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gate Fee (₹)</label>
                  <input
                    type="number"
                    placeholder="200"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Settlement Date</label>
                <input
                  type="date"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg font-bold text-gray-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSettlementMutation.isPending}
                  className="px-4 py-2 bg-[#0048ff] hover:bg-[#003be0] text-white font-bold rounded-lg cursor-pointer disabled:opacity-40"
                >
                  {createSettlementMutation.isPending ? 'Logging...' : 'Log Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
