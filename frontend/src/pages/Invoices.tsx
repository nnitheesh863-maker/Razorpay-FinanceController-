import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getInvoices, 
  getInvoiceById, 
  getInvoiceSummary,
  createInvoice, 
  issueInvoice, 
  cancelInvoice, 
  deleteInvoice 
} from '../api/invoices.api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Search, 
  Plus, 
  X, 
  FileText, 
  FileCheck, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Selected Detail state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Fetch Invoices
  const { data: invoicesResponse, isLoading } = useQuery({
    queryKey: ['invoices', page, status, search],
    queryFn: () => getInvoices({
      page,
      limit: 10,
      status: status || undefined,
      search: search || undefined
    })
  });

  // Fetch Invoices Summary
  const { data: summaryData } = useQuery({
    queryKey: ['invoices-summary'],
    queryFn: getInvoiceSummary
  });

  // Fetch Details
  const { data: invoiceDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['invoice-detail', selectedInvoiceId],
    queryFn: () => getInvoiceById(selectedInvoiceId!),
    enabled: !!selectedInvoiceId
  });

  // Create Invoice Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
      setShowCreateModal(false);
      // Reset form
      setInvoiceNumber('');
      setCustomerName('');
      setTotalAmount('');
      setIssueDate('');
      setDueDate('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create invoice.');
    }
  });

  // Update Status Mutations
  const issueMutation = useMutation({
    mutationFn: issueInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-detail', selectedInvoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-detail', selectedInvoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      setSelectedInvoiceId(null);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !customerName || !totalAmount) {
      alert('Please fill out all required fields.');
      return;
    }
    createInvoiceMutation.mutate({
      invoiceNumber,
      customerName,
      subtotal: Number(totalAmount),
      tax: 0,
      discount: 0,
      totalAmount: Number(totalAmount),
      issueDate: issueDate || new Date().toISOString(),
      dueDate: dueDate || new Date().toISOString(),
      currency: 'INR',
      lineItems: [
        {
          description: 'Standard Corporate Service Charge',
          quantity: 1,
          unitPrice: Number(totalAmount),
          totalPrice: Number(totalAmount)
        }
      ]
    });
  };

  const handlePrevPage = () => setPage(p => Math.max(1, p - 1));
  const handleNextPage = () => {
    if (invoicesResponse?.pagination?.totalPages && page < invoicesResponse.pagination.totalPages) {
      setPage(p => p + 1);
    }
  };

  return (
    <div className="space-y-6 text-left relative min-h-[70vh]">
      {/* Top Banner KPI section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Invoiced</span>
            <span className="text-lg font-extrabold text-gray-900 mt-0.5 block">
              {formatCurrency(summaryData?.data?.totalInvoiced || 0)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Collected Payments</span>
            <span className="text-lg font-extrabold text-green-600 mt-0.5 block">
              {formatCurrency(summaryData?.data?.paidInvoiced || 0)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Outstanding Balance</span>
            <span className="text-lg font-extrabold text-orange-600 mt-0.5 block">
              {formatCurrency(summaryData?.data?.outstandingBalance || 0)}
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
                  placeholder="Search invoice number, client..."
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
                <option value="DRAFT">DRAFT</option>
                <option value="ISSUED">ISSUED</option>
                <option value="PAID">PAID</option>
                <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-[#0048ff] hover:bg-[#003be0] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-bold uppercase">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th>Client</th>
                    <th>Total</th>
                    <th>Due Balance</th>
                    <th>Issue Date</th>
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
                  ) : invoicesResponse?.data?.map((inv) => (
                    <tr 
                      key={inv.id}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className={`hover:bg-neutral-50/70 transition-colors cursor-pointer ${selectedInvoiceId === inv.id ? 'bg-[#eff6ff]/30 font-semibold' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-900">{inv.invoiceNumber}</td>
                      <td>{inv.customerName}</td>
                      <td className="font-bold">{formatCurrency(inv.totalAmount)}</td>
                      <td className="font-bold text-orange-600">{formatCurrency(inv.balanceDue)}</td>
                      <td className="text-gray-400">{formatDate(inv.issueDate)}</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : inv.status === 'ISSUED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-neutral-50 text-neutral-600 border border-neutral-100'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <button className="text-[10px] font-bold text-[#0048ff] hover:underline cursor-pointer">
                          View details →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && (!invoicesResponse?.data || invoicesResponse.data.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">No invoices match selected criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {invoicesResponse?.pagination && (
              <div className="bg-white px-4 py-3.5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-semibold">
                  Page {invoicesResponse.pagination.page} of {invoicesResponse.pagination.totalPages} ({invoicesResponse.pagination.total} records)
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
                    disabled={page === invoicesResponse.pagination.totalPages}
                    className="p-1 border border-gray-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Detail panel (Drawer) */}
        {selectedInvoiceId && (
          <div className="w-full lg:w-96 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm self-start flex flex-col gap-5 text-xs text-left">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Invoice Control Card</h3>
                <p className="text-[10px] text-gray-400 font-semibold">Lifecycle and action dispatcher</p>
              </div>
              <button 
                onClick={() => setSelectedInvoiceId(null)}
                className="p-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#0048ff] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : invoiceDetail?.data ? (
              <div className="space-y-5">
                {/* Meta details */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Invoice Number</span>
                    <span className="font-mono font-bold text-gray-900">{invoiceDetail.data.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Customer</span>
                    <span className="font-bold text-gray-900">{invoiceDetail.data.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Total Amount</span>
                    <span className="font-bold text-gray-900">{formatCurrency(invoiceDetail.data.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Balance Due</span>
                    <span className="font-bold text-orange-600">{formatCurrency(invoiceDetail.data.balanceDue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Due Date</span>
                    <span className="font-semibold text-gray-900">{formatDate(invoiceDetail.data.dueDate)}</span>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Line Items</span>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden bg-white">
                    {invoiceDetail.data.lineItems?.map((item: any) => (
                      <div key={item.id} className="p-3 flex justify-between items-center hover:bg-neutral-50/40">
                        <div>
                          <p className="font-bold text-gray-800 text-[11px]">{item.description}</p>
                          <span className="text-[9px] text-gray-400">{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                        </div>
                        <span className="font-bold text-gray-900">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Flow Panel */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Invoice Lifecycle Controls</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => issueMutation.mutate(invoiceDetail.data.id)}
                      disabled={invoiceDetail.data.status !== 'DRAFT'}
                      className="px-4 py-2 bg-blue-50 border border-blue-100 text-blue-600 font-bold rounded-lg text-center cursor-pointer hover:bg-blue-100/50 disabled:opacity-40 transition-colors"
                    >
                      Issue Invoice
                    </button>
                    <button
                      onClick={() => cancelMutation.mutate(invoiceDetail.data.id)}
                      disabled={invoiceDetail.data.status === 'PAID' || invoiceDetail.data.status === 'CANCELLED'}
                      className="px-4 py-2 bg-amber-50 border border-amber-100 text-amber-600 font-bold rounded-lg text-center cursor-pointer hover:bg-amber-100/50 disabled:opacity-40 transition-colors"
                    >
                      Cancel Invoice
                    </button>
                  </div>
                </div>

                {/* Delete option */}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this invoice record? This is irreversible.')) {
                      deleteMutation.mutate(invoiceDetail.data.id);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border border-red-100 text-red-500 font-bold rounded-lg text-center cursor-pointer hover:bg-red-50/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Permanent Record
                </button>
              </div>
            ) : (
              <div className="py-6 text-center text-gray-400">Failed to load invoice card.</div>
            )}
          </div>
        )}
      </div>

      {/* Invoice Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-100 shadow-xl space-y-4 text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-sm text-gray-900">Create Corporate Invoice</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="INV-1001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Corp"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Billing Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="50000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                  />
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
                  disabled={createInvoiceMutation.isPending}
                  className="px-4 py-2 bg-[#0048ff] hover:bg-[#003be0] text-white font-bold rounded-lg cursor-pointer disabled:opacity-40"
                >
                  {createInvoiceMutation.isPending ? 'Saving...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
