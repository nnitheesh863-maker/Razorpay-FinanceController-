import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPayments, 
  getPaymentById, 
  getPaymentSummary, 
  createPayment, 
  refundPayment 
} from '../api/payments.api';
import { getInvoices } from '../api/invoices.api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Search, 
  Plus, 
  X, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  RotateCcw,
  ArrowRight
} from 'lucide-react';

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentStatus, setPaymentStatus] = useState('CAPTURED');
  const [gatewayPaymentId, setGatewayPaymentId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Selected Detail state
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [refundNotes, setRefundNotes] = useState('');

  // Fetch Payments
  const { data: paymentsResponse, isLoading } = useQuery({
    queryKey: ['payments', page, status, search],
    queryFn: () => getPayments({
      page,
      limit: 10,
      status: status || undefined,
      search: search || undefined
    })
  });

  // Fetch Payments Summary
  const { data: summaryData } = useQuery({
    queryKey: ['payments-summary'],
    queryFn: getPaymentSummary
  });

  // Fetch Details
  const { data: paymentDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['payment-detail', selectedPaymentId],
    queryFn: () => getPaymentById(selectedPaymentId!),
    enabled: !!selectedPaymentId
  });

  // Fetch outstanding invoices for dropdown
  const { data: outstandingInvoices } = useQuery({
    queryKey: ['outstanding-invoices-dropdown'],
    queryFn: () => getInvoices({ limit: 100, status: 'ISSUED' })
  });

  // Create Payment Mutation
  const createPaymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-summary'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowCreateModal(false);
      // Reset form
      setAmount('');
      setGatewayPaymentId('');
      setSelectedInvoiceId('');
      setCustomerName('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to record payment.');
    }
  });

  // Refund Mutation
  const refundMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => refundPayment(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-detail', selectedPaymentId] });
      queryClient.invalidateQueries({ queryKey: ['payments-summary'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setRefundNotes('');
      alert('Payment refund processed successfully! Associated invoice balance updated.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Refund processing failed.');
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !gatewayPaymentId || !selectedInvoiceId) {
      alert('Please fill out all required fields.');
      return;
    }
    createPaymentMutation.mutate({
      amount: Number(amount),
      paymentMethod,
      gatewayPaymentId,
      status: paymentStatus,
      invoiceId: selectedInvoiceId,
      customerName: customerName || undefined
    });
  };

  const handlePrevPage = () => setPage(p => Math.max(1, p - 1));
  const handleNextPage = () => {
    if (paymentsResponse?.pagination?.totalPages && page < paymentsResponse.pagination.totalPages) {
      setPage(p => p + 1);
    }
  };

  return (
    <div className="space-y-6 text-left relative min-h-[70vh]">
      {/* Summary KPI section */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Captured</span>
            <span className="text-sm font-extrabold text-gray-900 mt-0.5 block">
              {(summaryData?.data as any)?.captured?.count || 0} ({formatCurrency((summaryData?.data as any)?.captured?.sum || 0)})
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pending</span>
            <span className="text-sm font-extrabold text-gray-900 mt-0.5 block">
              {(summaryData?.data as any)?.pending?.count || 0} ({formatCurrency((summaryData?.data as any)?.pending?.sum || 0)})
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Refunded</span>
            <span className="text-sm font-extrabold text-orange-600 mt-0.5 block">
              {(summaryData?.data as any)?.refunded?.count || 0} ({formatCurrency((summaryData?.data as any)?.refunded?.sum || 0)})
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Failed</span>
            <span className="text-sm font-extrabold text-red-600 mt-0.5 block">
              {(summaryData?.data as any)?.failed?.count || 0} ({formatCurrency((summaryData?.data as any)?.failed?.sum || 0)})
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main list */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
            <div className="flex flex-1 gap-2 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search gateway reference, customer..."
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
                <option value="CAPTURED">CAPTURED</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-[#0048ff] hover:bg-[#003be0] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Payment
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-bold uppercase">
                  <tr>
                    <th className="py-3 px-4">Gateway Pay ID</th>
                    <th>Customer Name</th>
                    <th>Method</th>
                    <th>Amount</th>
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
                  ) : paymentsResponse?.data?.map((payment) => (
                    <tr 
                      key={payment.id}
                      onClick={() => setSelectedPaymentId(payment.id)}
                      className={`hover:bg-neutral-50/70 transition-colors cursor-pointer ${selectedPaymentId === payment.id ? 'bg-[#eff6ff]/30 font-semibold' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-900">{payment.gatewayPaymentId || 'N/A'}</td>
                      <td>{payment.customerName || 'Walk-in Client'}</td>
                      <td className="font-bold text-gray-400 text-[10px]">{payment.paymentMethod}</td>
                      <td className="font-bold text-gray-900">{formatCurrency(payment.amount)}</td>
                      <td className="text-gray-400">{formatDate(payment.paymentDate)}</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          payment.status === 'CAPTURED'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : payment.status === 'REFUNDED'
                            ? 'bg-orange-50 text-orange-700 border border-orange-100'
                            : 'bg-neutral-50 text-neutral-600 border border-neutral-100'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <button className="text-[10px] font-bold text-[#0048ff] hover:underline cursor-pointer">
                          View details →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && (!paymentsResponse?.data || paymentsResponse.data.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">No payment logs match selected criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {paymentsResponse?.pagination && (
              <div className="bg-white px-4 py-3.5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-semibold">
                  Page {paymentsResponse.pagination.page} of {paymentsResponse.pagination.totalPages} ({paymentsResponse.pagination.total} records)
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
                    disabled={page === paymentsResponse.pagination.totalPages}
                    className="p-1 border border-gray-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Detail drawer */}
        {selectedPaymentId && (
          <div className="w-full lg:w-96 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm self-start flex flex-col gap-5 text-xs text-left">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Payment Detail Card</h3>
                <p className="text-[10px] text-gray-400 font-semibold">Transaction ledger mapping & refund panel</p>
              </div>
              <button 
                onClick={() => setSelectedPaymentId(null)}
                className="p-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : paymentDetail?.data ? (
              <div className="space-y-5">
                {/* Meta details */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Gateway Pay ID</span>
                    <span className="font-mono font-bold text-gray-900">{paymentDetail.data.gatewayPaymentId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Method / Mode</span>
                    <span className="font-bold text-gray-900">{paymentDetail.data.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Captured Amount</span>
                    <span className="font-bold text-gray-900">{formatCurrency(paymentDetail.data.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Payment Date</span>
                    <span className="font-semibold text-gray-900">{formatDate(paymentDetail.data.paymentDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Status</span>
                    <span className={`font-bold ${paymentDetail.data.status === 'CAPTURED' ? 'text-green-600' : 'text-orange-500'}`}>
                      {paymentDetail.data.status}
                    </span>
                  </div>
                </div>

                {/* Linked Invoice */}
                {(paymentDetail.data as any).invoice && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Linked Invoice</span>
                    <div className="p-3 border border-gray-100 rounded-lg bg-white space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-800">{(paymentDetail.data as any).invoice.invoiceNumber}</span>
                        <span className="font-bold text-gray-900">{formatCurrency((paymentDetail.data as any).invoice.totalAmount)}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">{(paymentDetail.data as any).invoice.customerName}</p>
                    </div>
                  </div>
                )}

                {/* Refund Form (Only shown if payment status is CAPTURED) */}
                {paymentDetail.data.status === 'CAPTURED' && (
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-red-600">Issue Gateway Refund</span>
                    <div className="space-y-2">
                      <textarea
                        placeholder="Provide reason for refund..."
                        value={refundNotes}
                        onChange={(e) => setRefundNotes(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500/25 h-16"
                      />
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to refund this payment? This will roll back invoice balance.')) {
                            refundMutation.mutate({ id: paymentDetail.data.id, notes: refundNotes });
                          }
                        }}
                        disabled={refundMutation.isPending}
                        className="w-full py-2 bg-red-50 hover:bg-red-100/50 border border-red-100 text-red-600 font-bold rounded-lg text-center cursor-pointer transition-colors"
                      >
                        {refundMutation.isPending ? 'Processing Refund...' : 'Confirm Refund'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-gray-400">Failed to load payment card.</div>
            )}
          </div>
        )}
      </div>

      {/* Payment Entry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-100 shadow-xl space-y-4 text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-sm text-gray-900">Record Corporate Payment</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Invoice *</label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const selectedInv = outstandingInvoices?.data?.find((i: any) => i.id === e.target.value);
                    if (selectedInv) {
                      setAmount(String(selectedInv.balanceDue));
                      setCustomerName(selectedInv.customerName);
                    }
                  }}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 cursor-pointer bg-white"
                >
                  <option value="">Select outstanding invoice...</option>
                  {outstandingInvoices?.data?.map((inv: any) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.customerName} (Due: {formatCurrency(inv.balanceDue)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="25000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gateway Pay ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="pay_8EFD938FD8"
                    value={gatewayPaymentId}
                    onChange={(e) => setGatewayPaymentId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 cursor-pointer bg-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CARD">Credit/Debit Card</option>
                    <option value="NETBANKING">Net Banking</option>
                    <option value="WALLET">Wallet</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 cursor-pointer bg-white"
                  >
                    <option value="CAPTURED">CAPTURED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
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
                  disabled={createPaymentMutation.isPending}
                  className="px-4 py-2 bg-[#0048ff] hover:bg-[#003be0] text-white font-bold rounded-lg cursor-pointer disabled:opacity-40"
                >
                  {createPaymentMutation.isPending ? 'Logging...' : 'Log Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
