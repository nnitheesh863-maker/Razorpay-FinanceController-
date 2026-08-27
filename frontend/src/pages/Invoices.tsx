import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices, getInvoiceSummary, deleteInvoice } from '../api/invoices.api';
import type { Invoice, InvoiceFilters, InvoiceSummary } from '../types/invoice.types';
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
  Plus, 
  Search, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  Trash2, 
  FileText 
} from 'lucide-react';
import { format } from 'date-fns';

export function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & State
  const [filters, setFilters] = useState<InvoiceFilters>({
    page: 1,
    limit: 25,
    status: '',
    paymentStatus: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [totalPages, setTotalPages] = useState(1);

  // RBAC checks
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const isViewer = user ? user.role === 'VIEWER' : true;
  const canModify = !isViewer;
  const canDelete = user ? (user.role === 'ADMIN' || user.role === 'FINANCE_MANAGER') : false;

  const fetchSummary = async () => {
    try {
      const res = await getInvoiceSummary();
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load invoice summary:', err);
    }
  };

  const fetchInvoices = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await getInvoices(filters);
      setInvoices(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Unable to load invoices data.');
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
    fetchInvoices();
    fetchSummary();
  }, [
    filters.page, 
    filters.limit, 
    filters.status, 
    filters.paymentStatus, 
    filters.search, 
    filters.sortBy, 
    filters.sortOrder
  ]);

  const handleRefresh = () => {
    fetchInvoices(true);
    fetchSummary();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this draft invoice?')) return;
    setError(null);
    try {
      const res = await deleteInvoice(id);
      if (res.success) {
        setSuccessMessage('Draft invoice deleted successfully.');
        handleRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete draft invoice.');
    }
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 25,
      status: '',
      paymentStatus: '',
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
        title="Invoices"
        description="Create and track customer billing documentation, outstanding balances, and status codes."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} isLoading={refreshing}>
              {!refreshing && <RefreshCw className="w-4 h-4" />}
              <span>Refresh</span>
            </Button>
            {canModify && (
              <Button size="sm" className="flex items-center gap-1.5" onClick={() => navigate('/invoices/create')}>
                <Plus className="w-4 h-4" />
                <span>Create Invoice</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Aggregated KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total Invoiced" 
          value={summary ? formatCurrency(summary.totalInvoiced) : '₹0.00'} 
          description="Total value of bills created" 
          icon={FileText} 
        />
        <KpiCard 
          title="Collected Amount" 
          value={summary ? formatCurrency(summary.paid) : '₹0.00'} 
          description="Total payments recorded" 
          icon={CheckCircle} 
        />
        <KpiCard 
          title="Outstanding Balance" 
          value={summary ? formatCurrency(summary.outstanding) : '₹0.00'} 
          description="Pending customer payout collections" 
          icon={AlertCircle} 
        />
        <KpiCard 
          title="Invoice Count" 
          value={summary ? formatNumber(summary.totalInvoices) : '0'} 
          description="Total generated billing records" 
          icon={FileText} 
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
              placeholder="Search by Invoice Number, Customer..."
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
                { label: 'Draft', value: 'DRAFT' },
                { label: 'Issued', value: 'ISSUED' },
                { label: 'Paid', value: 'PAID' },
                { label: 'Cancelled', value: 'CANCELLED' }
              ]}
            />

            <Select
              value={filters.paymentStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value, page: 1 }))}
              options={[
                { label: 'All Payment States', value: '' },
                { label: 'Unpaid', value: 'UNPAID' },
                { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
                { label: 'Fully Paid', value: 'PAID' }
              ]}
            />

            {(filters.status || filters.paymentStatus || filters.search) && (
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
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Invoice Number</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Issue Date</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="font-semibold text-right">Total Amount</TableHead>
                  <TableHead className="font-semibold text-right">Paid Amount</TableHead>
                  <TableHead className="font-semibold text-right">Outstanding</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-neutral-50/50 transition-colors">
                    <TableCell className="font-semibold font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-xs text-text-main font-semibold">{invoice.customerName}</TableCell>
                    <TableCell className="text-text-muted text-xs">
                      {format(new Date(invoice.issueDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-text-muted text-xs">
                      {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-text-main">{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold text-success-700">{formatCurrency(invoice.paidAmount)}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-danger-700">{formatCurrency(invoice.balanceDue)}</TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={invoice.status as FinanceStatus} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                          <Eye className="w-3.5 h-3.5 text-text-muted" />
                        </Button>
                        {canDelete && invoice.status === 'DRAFT' && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(invoice.id)} aria-label="Delete Invoice">
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
            No invoices found matching the selected filter criteria.
            {(filters.status || filters.paymentStatus || filters.search) && (
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
