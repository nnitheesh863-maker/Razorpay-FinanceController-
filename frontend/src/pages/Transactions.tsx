import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  getTransactions, 
  getTransactionSummary, 
  createTransaction, 
  updateTransaction, 
  cancelTransaction 
} from '../api/transactions.api';
import type { Transaction, TransactionFilters, TransactionSummary } from '../types/transaction.types';
import { PageHeader } from '../components/ui/PageHeader';
import { KpiCard } from '../components/ui/KpiCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { FinanceStatus } from '../components/ui/StatusBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { Pagination } from '../components/ui/Pagination';
import { 
  formatCurrency, 
  formatCompactCurrency, 
  formatNumber 
} from '../utils/formatters';
import { 
  RefreshCw, 
  Plus, 
  Search, 
  X, 
  AlertCircle, 
  CheckCircle,
  Eye, 
  Edit2, 
  Trash2, 
  ArrowLeftRight 
} from 'lucide-react';
import { format } from 'date-fns';

const transactionSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  currency: z.string().min(3).max(3).default('INR'),
  type: z.enum(['PAYMENT', 'REFUND', 'TRANSFER', 'ADJUSTMENT', 'FEE']),
  reference: z.string().min(1, 'Reference ID is required'),
  paymentMethod: z.enum(['CARD', 'UPI', 'NETBANKING', 'WALLET', 'BANK_TRANSFER']),
  description: z.string().optional()
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & State
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 25,
    status: '',
    type: '',
    paymentMethod: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // RBAC checks
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const isViewer = user ? user.role === 'VIEWER' : true;
  const canModify = !isViewer;
  const canCancel = user ? (user.role === 'ADMIN' || user.role === 'FINANCE_MANAGER') : false;

  // React Hook Forms
  const createForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      amount: 0,
      currency: 'INR',
      type: 'PAYMENT',
      reference: '',
      paymentMethod: 'UPI',
      description: ''
    }
  });

  const editForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any
  });

  const fetchSummary = async () => {
    try {
      const { startDate, endDate } = filters;
      const res = await getTransactionSummary({ startDate, endDate });
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load transaction summary:', err);
    }
  };

  const fetchTransactions = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await getTransactions(filters);
      setTransactions(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Unable to load transactions data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Trigger search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
    }, 450);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchTransactions();
    fetchSummary();
  }, [
    filters.page, 
    filters.limit, 
    filters.status, 
    filters.type, 
    filters.paymentMethod, 
    filters.search, 
    filters.sortBy, 
    filters.sortOrder,
    filters.startDate,
    filters.endDate
  ]);

  const handleRefresh = () => {
    fetchTransactions(true);
    fetchSummary();
  };

  // Actions
  const handleCreateSubmit = async (values: TransactionFormValues) => {
    setError(null);
    try {
      const res = await createTransaction(values);
      if (res.success) {
        setSuccessMessage('Transaction created successfully.');
        setIsCreateOpen(false);
        createForm.reset();
        handleRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create transaction.');
    }
  };

  const handleEditOpen = (txn: Transaction) => {
    setEditingTransaction(txn);
    editForm.reset({
      amount: txn.amount,
      currency: txn.currency,
      type: txn.type as any,
      reference: txn.reference || '',
      paymentMethod: (txn.paymentMethod || 'UPI') as any,
      description: txn.description || ''
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (values: TransactionFormValues) => {
    if (!editingTransaction) return;
    setError(null);
    try {
      const res = await updateTransaction(editingTransaction.id, values);
      if (res.success) {
        setSuccessMessage('Transaction updated successfully.');
        setIsEditOpen(false);
        setEditingTransaction(null);
        handleRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction.');
    }
  };

  const handleCancelOpen = (id: string) => {
    setCancellingId(id);
    setIsCancelOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingId) return;
    setError(null);
    try {
      const res = await cancelTransaction(cancellingId);
      if (res.success) {
        setSuccessMessage('Transaction cancelled successfully.');
        setIsCancelOpen(false);
        setCancellingId(null);
        handleRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel transaction.');
    }
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 25,
      status: '',
      type: '',
      paymentMethod: '',
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setSearchTerm('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Notifications Banners */}
      {successMessage && (
        <div className="p-3.5 bg-success-50 border border-success-100 text-success-800 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success-600" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-success-600 hover:text-success-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-danger-50 border border-danger-100 text-danger-800 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-danger-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-danger-600 hover:text-danger-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Transactions"
        description="Monitor and manage financial movements across bank statements and payout gateways."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} isLoading={refreshing} aria-label="Refresh list">
              {!refreshing && <RefreshCw className="w-4 h-4" />}
              <span>Refresh</span>
            </Button>
            {canModify && (
              <Button size="sm" className="flex items-center gap-1.5" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4" />
                <span>Create Transaction</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Aggregated KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard 
          title="Total Volume" 
          value={summary ? formatCompactCurrency(summary.totalVolume) : '₹0.00'} 
          description="Total settled currency volume" 
          icon={ArrowLeftRight} 
        />
        <KpiCard 
          title="Total Count" 
          value={summary ? formatNumber(summary.totalTransactions) : '0'} 
          description="All logged events" 
          icon={ArrowLeftRight} 
        />
        <KpiCard 
          title="Successful" 
          value={summary ? formatNumber(summary.successfulCount) : '0'} 
          description="Processed transactions" 
          icon={CheckCircle} 
        />
        <KpiCard 
          title="Pending" 
          value={summary ? formatNumber(summary.pendingCount) : '0'} 
          description="Awaiting settlement" 
          icon={RefreshCw} 
        />
        <KpiCard 
          title="Failed" 
          value={summary ? formatNumber(summary.failedCount) : '0'} 
          description="Failed or cancelled" 
          icon={AlertCircle} 
        />
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-white border border-border-subtle rounded-xl p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-text-muted">
              <Search className="w-4 h-4" />
            </span>
            <input
              placeholder="Search by Transaction ID, Reference, Description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-border-subtle rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-medium"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'Success', value: 'SUCCESS' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Failed', value: 'FAILED' },
                { label: 'Cancelled', value: 'CANCELLED' }
              ]}
            />

            <Select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
              options={[
                { label: 'All Types', value: '' },
                { label: 'Payment', value: 'PAYMENT' },
                { label: 'Refund', value: 'REFUND' },
                { label: 'Transfer', value: 'TRANSFER' },
                { label: 'Adjustment', value: 'ADJUSTMENT' },
                { label: 'Fee', value: 'FEE' }
              ]}
            />

            <Select
              value={filters.paymentMethod}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value, page: 1 }))}
              options={[
                { label: 'All Methods', value: '' },
                { label: 'Card', value: 'CARD' },
                { label: 'UPI', value: 'UPI' },
                { label: 'NetBanking', value: 'NETBANKING' },
                { label: 'Wallet', value: 'WALLET' },
                { label: 'Bank Transfer', value: 'BANK_TRANSFER' }
              ]}
            />

            {(filters.status || filters.type || filters.paymentMethod || filters.search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-text-muted hover:text-text-main flex items-center gap-1">
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Transaction ID</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Reference</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Method</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id} className="hover:bg-neutral-50/50 transition-colors">
                    <TableCell className="font-semibold font-mono text-xs">{txn.id}</TableCell>
                    <TableCell className="text-text-muted text-xs">
                      {format(new Date(txn.createdAt), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-xs text-text-main font-medium">{txn.reference || '-'}</TableCell>
                    <TableCell className="text-xs text-text-muted font-semibold">{txn.type}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-text-main">{formatCurrency(txn.amount)}</TableCell>
                    <TableCell className="text-xs text-text-muted font-medium">{txn.paymentMethod || '-'}</TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={txn.status as FinanceStatus} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/transactions/${txn.id}`)} aria-label="View Details">
                          <Eye className="w-3.5 h-3.5 text-text-muted" />
                        </Button>
                        {canModify && txn.status !== 'CANCELLED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleEditOpen(txn)} aria-label="Edit Details">
                            <Edit2 className="w-3.5 h-3.5 text-text-muted" />
                          </Button>
                        )}
                        {canCancel && txn.status !== 'CANCELLED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancelOpen(txn.id)} aria-label="Cancel Transaction">
                            <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-text-muted italic">
            No transactions found matching the selected filter criteria.
            {(filters.status || filters.type || filters.paymentMethod || filters.search) && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Pagination Ribbon */}
        <div className="border-t border-border-subtle p-4">
          <Pagination
            currentPage={filters.page ?? 1}
            totalPages={totalPages}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            onPageSizeChange={(limit) => setFilters(prev => ({ ...prev, limit, page: 1 }))}
          />
        </div>
      </div>

      {/* CREATE TRANSACTION MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-border-subtle rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center bg-neutral-50 px-6 py-4 border-b border-border-subtle">
              <h2 className="text-base font-bold text-text-main">Create Transaction</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-text-muted hover:text-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  required
                  error={createForm.formState.errors.amount?.message}
                  {...createForm.register('amount')}
                />
                
                <Input
                  label="Currency"
                  required
                  error={createForm.formState.errors.currency?.message}
                  {...createForm.register('currency')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main">Transaction Type</label>
                  <select
                    className="bg-white border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    {...createForm.register('type')}
                  >
                    <option value="PAYMENT">Payment</option>
                    <option value="REFUND">Refund</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                    <option value="FEE">Fee</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main">Payment Method</label>
                  <select
                    className="bg-white border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    {...createForm.register('paymentMethod')}
                  >
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="NETBANKING">NetBanking</option>
                    <option value="WALLET">Wallet</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <Input
                label="Reference ID"
                required
                placeholder="ref_100..."
                error={createForm.formState.errors.reference?.message}
                {...createForm.register('reference')}
              />

              <Input
                label="Description"
                placeholder="Brief transactional comments..."
                error={createForm.formState.errors.description?.message}
                {...createForm.register('description')}
              />

              <div className="flex justify-end gap-2 border-t border-border-subtle pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Record Transaction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRANSACTION MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-border-subtle rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center bg-neutral-50 px-6 py-4 border-b border-border-subtle">
              <h2 className="text-base font-bold text-text-main">Edit Transaction</h2>
              <button onClick={() => { setIsEditOpen(false); setEditingTransaction(null); }} className="text-text-muted hover:text-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="p-6 space-y-4">
              {editingTransaction?.status === 'SUCCESS' && (
                <div className="p-3 bg-warning-50 border border-warning-100 text-warning-800 rounded-lg text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-600 flex-shrink-0" />
                  <span>Amount and Currency are locked because this transaction is successfully processed.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  disabled={editingTransaction?.status === 'SUCCESS'}
                  required
                  error={editForm.formState.errors.amount?.message}
                  {...editForm.register('amount')}
                />
                
                <Input
                  label="Currency"
                  required
                  disabled={editingTransaction?.status === 'SUCCESS'}
                  error={editForm.formState.errors.currency?.message}
                  {...editForm.register('currency')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main">Transaction Type</label>
                  <select
                    className="bg-white border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    {...editForm.register('type')}
                  >
                    <option value="PAYMENT">Payment</option>
                    <option value="REFUND">Refund</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                    <option value="FEE">Fee</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main">Payment Method</label>
                  <select
                    className="bg-white border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    {...editForm.register('paymentMethod')}
                  >
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="NETBANKING">NetBanking</option>
                    <option value="WALLET">Wallet</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <Input
                label="Reference ID"
                required
                error={editForm.formState.errors.reference?.message}
                {...editForm.register('reference')}
              />

              <Input
                label="Description"
                error={editForm.formState.errors.description?.message}
                {...editForm.register('description')}
              />

              <div className="flex justify-end gap-2 border-t border-border-subtle pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); setEditingTransaction(null); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL VERIFICATION DIALOG */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-border-subtle rounded-2xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center gap-3 text-danger-600 mb-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h2 className="text-base font-bold text-text-main">Cancel Transaction</h2>
            </div>
            
            <p className="text-sm text-text-muted leading-relaxed">
              Are you sure you want to cancel this transaction? This action will void the record and cannot be undone.
            </p>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => { setIsCancelOpen(false); setCancellingId(null); }}>
                No, Keep It
              </Button>
              <Button variant="danger" onClick={handleCancelConfirm}>
                Yes, Cancel Transaction
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
