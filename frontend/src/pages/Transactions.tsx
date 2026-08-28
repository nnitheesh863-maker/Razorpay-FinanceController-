import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactions, getTransactionById } from '../api/transactions.api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Search, 
  ArrowRightLeft, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Link2,
  FileText,
  CreditCard,
  Coins,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  // Fetch transactions list
  const { data: txListResponse, isLoading } = useQuery({
    queryKey: ['transactions', page, status, type, search],
    queryFn: () => getTransactions({
      page,
      limit: 12,
      status: status || undefined,
      type: type || undefined,
      search: search || undefined
    })
  });

  // Fetch detailed transaction data for relation auditing
  const { data: detailResponse, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['transaction-detail', selectedTxId],
    queryFn: () => getTransactionById(selectedTxId!),
    enabled: !!selectedTxId
  });

  const handlePrevPage = () => setPage(p => Math.max(1, p - 1));
  const handleNextPage = () => {
    if (txListResponse?.pagination?.totalPages && page < txListResponse.pagination.totalPages) {
      setPage(p => p + 1);
    }
  };

  return (
    <div className="space-y-6 text-left flex flex-col xl:flex-row gap-6 relative min-h-[70vh]">
      {/* List Panel */}
      <div className="flex-1 space-y-4">
        {/* Filters strip */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search reference, description..."
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
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 cursor-pointer bg-white"
          >
            <option value="">All Types</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="REFUND">REFUND</option>
            <option value="TRANSFER">TRANSFER</option>
            <option value="FEE">FEE</option>
          </select>
        </div>

        {/* Transactions Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
              <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-bold uppercase">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right py-3 px-4">Auditing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : txListResponse?.data?.map((tx) => (
                  <tr 
                    key={tx.id} 
                    onClick={() => setSelectedTxId(tx.id)}
                    className={`hover:bg-neutral-50/70 transition-colors cursor-pointer ${selectedTxId === tx.id ? 'bg-[#eff6ff]/30 font-semibold' : ''}`}
                  >
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-900">{tx.reference || 'N/A'}</td>
                    <td className="truncate max-w-[180px]">{tx.description || 'Corporate Transaction'}</td>
                    <td>
                      <span className="font-bold text-neutral-500 text-[10px]">{tx.type}</span>
                    </td>
                    <td className={`font-bold ${tx.amount < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="text-gray-400">{formatDate(tx.createdAt)}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        tx.status === 'SUCCESS' || tx.status === 'CAPTURED'
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <button className="text-[10px] font-bold text-[#0048ff] hover:underline cursor-pointer">
                        Audit Details →
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && (!txListResponse?.data || txListResponse.data.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">No transaction logs match selection.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {txListResponse?.pagination && (
            <div className="bg-white px-4 py-3.5 border-t border-gray-100 flex items-center justify-between gap-4">
              <span className="text-xs text-gray-400 font-semibold">
                Page {txListResponse.pagination.page} of {txListResponse.pagination.totalPages} ({txListResponse.pagination.total} records)
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
                  disabled={page === txListResponse.pagination.totalPages}
                  className="p-1 border border-gray-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audit Detail Panel (Drawer style) */}
      {selectedTxId && (
        <div className="w-full xl:w-96 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm self-start flex flex-col gap-5 text-xs">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Financial Audit Flow</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Linked record reconciliation path</p>
            </div>
            <button 
              onClick={() => setSelectedTxId(null)}
              className="p-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {isLoadingDetail ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : detailResponse?.data ? (
            <div className="space-y-6 relative">
              {/* Vertical timeline connector */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />

              {/* Step 1: Transaction */}
              <div className="flex gap-3 relative z-10">
                <div className="w-8.5 h-8.5 rounded-full bg-[#eff6ff] border border-[#0048ff]/25 flex items-center justify-center text-[#0048ff] flex-shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="bg-neutral-50/60 p-3 rounded-xl border border-neutral-100 flex-1 text-left">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Transaction Ledger</span>
                  <span className="font-bold text-gray-900 block mt-0.5">{detailResponse.data.reference || 'N/A'}</span>
                  <span className="text-[11px] font-extrabold text-[#0048ff] block mt-1">{formatCurrency(detailResponse.data.amount)}</span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">Logged: {formatDate(detailResponse.data.createdAt)}</span>
                </div>
              </div>

              {/* Step 2: Payment */}
              <div className="flex gap-3 relative z-10">
                <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  detailResponse.data.payment 
                    ? 'bg-green-50 border border-green-200 text-green-600' 
                    : 'bg-amber-50 border border-amber-200 text-amber-600'
                }`}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="bg-neutral-50/60 p-3 rounded-xl border border-neutral-100 flex-1 text-left">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gateway Payment</span>
                  {detailResponse.data.payment ? (
                    <>
                      <span className="font-bold text-gray-900 block mt-0.5">{detailResponse.data.payment.gatewayPaymentId || 'N/A'}</span>
                      <span className="text-[11px] font-bold text-green-600 block mt-0.5">{formatCurrency(detailResponse.data.payment.amount)}</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">Status: {detailResponse.data.payment.status}</span>
                    </>
                  ) : (
                    <span className="text-gray-400 font-semibold italic block mt-1">No captured payment linked</span>
                  )}
                </div>
              </div>

              {/* Step 3: Invoice */}
              <div className="flex gap-3 relative z-10">
                <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  detailResponse.data.invoice 
                    ? 'bg-blue-50 border border-blue-200 text-blue-600' 
                    : 'bg-neutral-50 border border-neutral-200 text-neutral-400'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="bg-neutral-50/60 p-3 rounded-xl border border-neutral-100 flex-1 text-left">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Customer Invoice</span>
                  {detailResponse.data.invoice ? (
                    <>
                      <span className="font-bold text-gray-900 block mt-0.5">{detailResponse.data.invoice.invoiceNumber}</span>
                      <span className="text-[11px] text-gray-500 block mt-0.5">{detailResponse.data.invoice.customerName}</span>
                      <span className="text-[10px] font-semibold text-gray-400 block mt-0.5">
                        Total: {formatCurrency(detailResponse.data.invoice.totalAmount)} | Due: {formatCurrency(detailResponse.data.invoice.balanceDue)}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 font-semibold italic block mt-1">No invoice relation mapped</span>
                  )}
                </div>
              </div>

              {/* Step 4: Settlement */}
              <div className="flex gap-3 relative z-10">
                <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  detailResponse.data.settlementId 
                    ? 'bg-purple-50 border border-purple-200 text-purple-600' 
                    : 'bg-neutral-50 border border-neutral-200 text-neutral-400'
                }`}>
                  <Coins className="w-4 h-4" />
                </div>
                <div className="bg-neutral-50/60 p-3 rounded-xl border border-neutral-100 flex-1 text-left">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gateway Settlement</span>
                  {detailResponse.data.settlementId ? (
                    <span className="font-mono text-[10px] text-gray-900 block mt-1">{detailResponse.data.settlementId}</span>
                  ) : (
                    <span className="text-gray-400 font-semibold italic block mt-1">Unsettled / Pending payout</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-gray-400">Failed to load auditing graph.</div>
          )}
        </div>
      )}
    </div>
  );
}
