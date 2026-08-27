import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayments, getPaymentSummary, refundPayment } from '../api/payments.api';
import type { Payment, PaymentFilters, PaymentSummary } from '../types/payment.types';
import { PageHeader } from '../components/ui/PageHeader';
import { KpiCard } from '../components/ui/KpiCard';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { FinanceStatus } from '../components/ui/StatusBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { Pagination } from '../components/ui/Pagination';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { 
  RefreshCw, 
  Search, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  Undo2, 
  WalletCards 
} from 'lucide-react';
import { format } from 'date-fns';

export function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & State
  const [filters, setFilters] = useState<PaymentFilters>({
    page: 1,
    limit: 25,
    status: '',
    paymentMethod: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [totalPages, setTotalPages] = useState(1);

  // RBAC checks
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const isAdminOrManager = user ? (user.role === 'ADMIN' || user.role === 'FINANCE_MANAGER') : false;

  const fetchSummary = async () => {
    try {
      const res = await getPaymentSummary();
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load payment summary:', err);
    }
  };

  const fetchPayments = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await getPayments(filters);
      setPayments(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Unable to load payments data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
    }, 450);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchPayments();
    fetchSummary();
  }, [
    filters.page, 
    filters.limit, 
    filters.status, 
    filters.paymentMethod, 
    filters.search, 
    filters.sortBy, 
    filters.sortOrder
  ]);

  const handleRefresh = () => {
    fetchPayments(true);
    fetchSummary();
  };

  const handleRefundClick = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to refund this captured payment?')) return;
    setError(null);
    try {
      const res = await refundPayment(paymentId, 'Refund from listing page');
      if (res.success) {
        setSuccessMessage('Payment refunded successfully.');
        handleRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment refund.');
    }
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 25,
      status: '',
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
        title="Payments"
        description="Monitor customer payment gateway logs, capture actions, and process refund transactions."
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} isLoading={refreshing}>
            {!refreshing && <RefreshCw className="w-4 h-4" />}
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Aggregated KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard 
          title="Captured Volume" 
          value={summary ? formatCurrency(summary.paymentVolume) : '₹0.00'} 
          description="Successful payout currency volume" 
          icon={WalletCards} 
        />
        <KpiCard 
          title="Total Count" 
          value={summary ? formatNumber(summary.totalPayments) : '0'} 
          description="Total payments recorded" 
          icon={WalletCards} 
        />
        <KpiCard 
          title="Captured" 
          value={summary ? formatNumber(summary.capturedCount) : '0'} 
          description="Settled captured counts" 
          icon={CheckCircle} 
        />
        <KpiCard 
          title="Pending" 
          value={summary ? formatNumber(summary.pendingCount) : '0'} 
          description="Authorized or pending capture" 
          icon={RefreshCw} 
        />
        <KpiCard 
          title="Refunded" 
          value={summary ? formatNumber(summary.refundedCount) : '0'} 
          description="Successfully reversed payouts" 
          icon={Undo2} 
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
              placeholder="Search by Payment ID, Gateway ID, Customer..."
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
                { label: 'Captured', value: 'CAPTURED' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Failed', value: 'FAILED' },
                { label: 'Refunded', value: 'REFUNDED' }
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

            {(filters.status || filters.paymentMethod || filters.search) && (
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
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Payment ID</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Method</TableHead>
                  <TableHead className="font-semibold">Gateway</TableHead>
                  <TableHead className="font-semibold">Gateway Payment ID</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((pmt) => (
                  <TableRow key={pmt.id} className="hover:bg-neutral-50/50 transition-colors">
                    <TableCell className="font-semibold font-mono text-xs">{pmt.id}</TableCell>
                    <TableCell className="text-text-muted text-xs">
                      {format(new Date(pmt.paymentDate), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-xs text-text-main font-semibold">{pmt.customerName || '-'}</TableCell>
                    <TableCell className="text-xs text-text-muted font-bold uppercase">{pmt.paymentMethod}</TableCell>
                    <TableCell className="text-xs text-text-muted font-semibold">{pmt.paymentGateway || '-'}</TableCell>
                    <TableCell className="text-xs text-text-muted font-mono">{pmt.gatewayPaymentId || '-'}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-text-main">{formatCurrency(pmt.amount)}</TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={pmt.status as FinanceStatus} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/payments/${pmt.id}`)}>
                          <Eye className="w-3.5 h-3.5 text-text-muted" />
                        </Button>
                        {isAdminOrManager && pmt.status === 'CAPTURED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleRefundClick(pmt.id)} aria-label="Refund Payment">
                            <Undo2 className="w-3.5 h-3.5 text-danger-500" />
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
            No payments found matching the selected filter criteria.
            {(filters.status || filters.paymentMethod || filters.search) && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="border-t border-border-subtle p-4">
          <Pagination
            currentPage={filters.page ?? 1}
            totalPages={totalPages}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            onPageSizeChange={(limit) => setFilters(prev => ({ ...prev, limit, page: 1 }))}
          />
        </div>
      </div>
    </div>
  );
}
