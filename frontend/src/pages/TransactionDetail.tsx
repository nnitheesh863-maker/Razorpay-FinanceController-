import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getTransactionById, cancelTransaction } from '../api/transactions.api';
import type { Transaction } from '../types/transaction.types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { FinanceStatus } from '../components/ui/StatusBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { formatCurrency } from '../utils/formatters';
import { 
  ArrowLeft, 
  FileText, 
  CreditCard, 
  Trash2, 
  AlertCircle, 
  Clock, 
  User, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';

export function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // RBAC checks
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const canCancel = user ? (user.role === 'ADMIN' || user.role === 'FINANCE_MANAGER') : false;

  const fetchTransaction = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getTransactionById(id);
      setTransaction(res.data);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve transaction details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  const handleCancelConfirm = async () => {
    if (!transaction) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await cancelTransaction(transaction.id);
      if (res.success) {
        setTransaction(res.data);
        setIsCancelOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel transaction.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="p-6 text-center text-danger-600 max-w-lg mx-auto py-12">
        <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-text-main">Transaction Error</h2>
        <p className="text-text-muted mt-2 mb-6">{error || 'Transaction not found.'}</p>
        <Button onClick={() => navigate('/transactions')}>Back to Transactions</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/transactions')} 
        className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-main transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Transactions</span>
      </button>

      {/* Header */}
      <PageHeader
        title={`Transaction Details`}
        description={`Transaction record #${transaction.id}`}
        actions={
          canCancel && transaction.status !== 'CANCELLED' ? (
            <Button variant="danger" size="sm" className="flex items-center gap-1.5" onClick={() => setIsCancelOpen(true)}>
              <Trash2 className="w-4 h-4" />
              <span>Cancel Transaction</span>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Financial Block */}
        <Card className="lg:col-span-2 shadow-sm border border-border-subtle rounded-2xl overflow-hidden">
          <CardHeader className="bg-neutral-50/50 py-4 px-6 border-b border-border-subtle flex flex-row justify-between items-center">
            <CardTitle>Financial Information</CardTitle>
            <StatusBadge status={transaction.status as FinanceStatus} />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center justify-center py-6 border border-dashed border-border-subtle rounded-2xl bg-neutral-50/30">
              <span className="text-3xl font-extrabold tracking-tight text-text-main">
                {formatCurrency(transaction.amount)}
              </span>
              <span className="text-xs text-text-muted font-semibold mt-1">Transaction Amount ({transaction.currency})</span>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-xs text-text-muted font-medium">Type</span>
                <span className="font-semibold text-text-main mt-0.5 block">{transaction.type}</span>
              </div>
              <div>
                <span className="block text-xs text-text-muted font-medium">Reference ID</span>
                <span className="font-mono font-medium text-text-main mt-0.5 block">{transaction.reference || 'None'}</span>
              </div>
              <div>
                <span className="block text-xs text-text-muted font-medium">Payment Method</span>
                <span className="font-medium text-text-main mt-0.5 block">{transaction.paymentMethod || '-'}</span>
              </div>
              <div>
                <span className="block text-xs text-text-muted font-medium">Recorded At</span>
                <span className="font-medium text-text-main mt-0.5 block">
                  {format(new Date(transaction.createdAt), 'dd MMM yyyy HH:mm:ss')}
                </span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs text-text-muted font-medium">Description</span>
                <p className="font-medium text-text-main mt-1 bg-neutral-50 p-3 rounded-lg border border-border-subtle/50 text-xs">
                  {transaction.description || 'No description provided.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit & Relationships Block */}
        <div className="space-y-6">
          {/* Related Invoices / Payments */}
          <Card className="shadow-sm border border-border-subtle rounded-2xl">
            <CardHeader className="py-4 px-6 border-b border-border-subtle">
              <CardTitle>Related Records</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border border-border-subtle rounded-xl p-3 bg-neutral-50/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-500" />
                  <div>
                    <span className="block text-xs text-text-muted font-medium">Invoice Link</span>
                    <span className="font-semibold text-xs text-text-main">
                      {transaction.invoiceId ? transaction.invoiceId.substring(0, 15) : 'Unlinked'}
                    </span>
                  </div>
                </div>
                {transaction.invoiceId && (
                  <Link to={`/invoices/${transaction.invoiceId}`}>
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-750 font-semibold text-xs">
                      Open
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between border border-border-subtle rounded-xl p-3 bg-neutral-50/50">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-500" />
                  <div>
                    <span className="block text-xs text-text-muted font-medium">Payment Record</span>
                    <span className="font-semibold text-xs text-text-main">
                      {transaction.paymentId ? transaction.paymentId.substring(0, 15) : 'Unlinked'}
                    </span>
                  </div>
                </div>
                {transaction.paymentId && (
                  <Link to={`/payments/${transaction.paymentId}`}>
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-750 font-semibold text-xs">
                      Open
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Audit Info */}
          <Card className="shadow-sm border border-border-subtle rounded-2xl">
            <CardHeader className="py-4 px-6 border-b border-border-subtle">
              <CardTitle>Timeline & System Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {/* Event 1: Creation */}
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center ring-8 ring-white">
                            <Clock className="w-4 h-4 text-text-muted" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="text-xs font-semibold text-text-main">Transaction Created</p>
                          <div className="text-right text-[10px] whitespace-nowrap text-text-muted mt-0.5">
                            {format(new Date(transaction.createdAt), 'dd MMM yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>

                  {/* Event 2: Status check */}
                  <li>
                    <div className="relative pb-8">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                            transaction.status === 'SUCCESS' ? 'bg-success-50 text-success-600' :
                            transaction.status === 'CANCELLED' ? 'bg-danger-50 text-danger-600' : 'bg-warning-50 text-warning-600'
                          }`}>
                            {transaction.status === 'SUCCESS' ? <CheckCircle className="w-4 h-4" /> :
                             transaction.status === 'CANCELLED' ? <Trash2 className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="text-xs font-semibold text-text-main">
                            Status Set to {transaction.status}
                          </p>
                          <div className="text-right text-[10px] whitespace-nowrap text-text-muted mt-0.5">
                            {format(new Date(transaction.updatedAt), 'dd MMM yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              {transaction.createdBy && (
                <div className="border-t border-border-subtle pt-4 mt-6 flex items-center gap-2 text-xs text-text-muted">
                  <User className="w-4 h-4" />
                  <span>Recorded by system user {transaction.createdBy.substring(0, 8)}...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
              <Button variant="outline" onClick={() => setIsCancelOpen(false)} disabled={cancelling}>
                No, Keep It
              </Button>
              <Button variant="danger" onClick={handleCancelConfirm} isLoading={cancelling}>
                Yes, Cancel Transaction
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
