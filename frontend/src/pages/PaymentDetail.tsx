import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPaymentById, refundPayment } from '../api/payments.api';
import type { Payment } from '../types/payment.types';
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
  Undo2, 
  AlertCircle, 
  Clock, 
  User, 
  CheckCircle,
  Link2
} from 'lucide-react';
import { format } from 'date-fns';

export function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  // RBAC checks
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const isAdminOrManager = user ? (user.role === 'ADMIN' || user.role === 'FINANCE_MANAGER') : false;

  const fetchPayment = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPaymentById(id);
      setPayment(res.data);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve payment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
  }, [id]);

  const handleRefundClick = async () => {
    if (!payment) return;
    if (!window.confirm('Are you sure you want to refund this captured payment?')) return;
    setRefunding(true);
    setError(null);
    try {
      const res = await refundPayment(payment.id, 'Refund requested from details view');
      if (res.success) {
        setPayment(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process refund.');
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="p-6 text-center text-danger-600 max-w-lg mx-auto py-12">
        <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-text-main">Payment Error</h2>
        <p className="text-text-muted mt-2 mb-6">{error || 'Payment not found.'}</p>
        <Button onClick={() => navigate('/payments')}>Back to Payments</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <button 
        onClick={() => navigate('/payments')} 
        className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-main transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Payments</span>
      </button>

      {/* Header */}
      <PageHeader
        title="Payment Record"
        description={`Payment ID: ${payment.id}`}
        actions={
          isAdminOrManager && payment.status === 'CAPTURED' ? (
            <Button variant="danger" size="sm" className="flex items-center gap-1.5" onClick={handleRefundClick} isLoading={refunding}>
              <Undo2 className="w-4 h-4" />
              <span>Refund Payment</span>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core financial block */}
        <Card className="lg:col-span-2 shadow-sm border border-border-subtle rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-neutral-50/50 py-4 px-6 border-b border-border-subtle flex flex-row justify-between items-center">
            <CardTitle>Payout Metadata</CardTitle>
            <StatusBadge status={payment.status as FinanceStatus} />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center justify-center py-6 border border-dashed border-border-subtle rounded-2xl bg-neutral-50/30">
              <span className="text-3xl font-extrabold tracking-tight text-text-main">
                {formatCurrency(payment.amount)}
              </span>
              <span className="text-xs text-text-muted font-semibold mt-1">Transaction Value ({payment.currency})</span>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-xs text-text-muted font-medium">Customer Name</span>
                <span className="font-semibold text-text-main mt-0.5 block">{payment.customerName || '-'}</span>
              </div>
              <div>
                <span className="block text-xs text-text-muted font-medium">Customer Email</span>
                <span className="font-medium text-text-main mt-0.5 block">{payment.customerEmail || '-'}</span>
              </div>
              <div>
                <span className="block text-xs text-text-muted font-medium">Payment Method</span>
                <span className="font-bold text-text-main mt-0.5 block uppercase">{payment.paymentMethod}</span>
              </div>
              <div>
                <span className="block text-xs text-text-muted font-medium">Payment Gateway</span>
                <span className="font-semibold text-text-main mt-0.5 block">{payment.paymentGateway || 'RAZORPAY'}</span>
              </div>
              <div>
                <span className="block text-xs text-text-muted font-medium">Gateway Payment ID</span>
                <span className="font-mono text-xs text-text-main mt-0.5 block">{payment.gatewayPaymentId || '-'}</span>
              </div>
              <div>
                <span className="block text-xs text-text-muted font-medium">Settlement Date</span>
                <span className="font-medium text-text-main mt-0.5 block">
                  {format(new Date(payment.paymentDate), 'dd MMM yyyy HH:mm:ss')}
                </span>
              </div>
              <div className="col-span-2 border-t border-border-subtle pt-4">
                <span className="block text-xs text-text-muted font-medium">Internal Notes</span>
                <p className="font-medium text-text-main mt-1.5 bg-neutral-50 p-3 rounded-lg border border-border-subtle/50 text-xs">
                  {payment.notes || 'No notes appended to this record.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links sidebar */}
        <div className="space-y-6">
          {/* Related invoices and transaction logs */}
          <Card className="shadow-sm border border-border-subtle rounded-2xl bg-white">
            <CardHeader className="py-4 px-6 border-b border-border-subtle">
              <CardTitle>Connected Operations</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border border-border-subtle rounded-xl p-3 bg-neutral-50/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-500" />
                  <div>
                    <span className="block text-xs text-text-muted font-medium">Source Invoice</span>
                    <span className="font-mono font-semibold text-xs text-text-main">
                      {payment.invoiceId ? payment.invoiceId.substring(0, 15) : 'Unlinked'}
                    </span>
                  </div>
                </div>
                {payment.invoiceId && (
                  <Link to={`/invoices/${payment.invoiceId}`}>
                    <Button variant="ghost" size="sm" className="text-primary-600 font-semibold text-xs">
                      View
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between border border-border-subtle rounded-xl p-3 bg-neutral-50/50">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-500" />
                  <div>
                    <span className="block text-xs text-text-muted font-medium">Transaction Log</span>
                    <span className="font-mono font-semibold text-xs text-text-main">
                      {payment.transactionId ? payment.transactionId.substring(0, 15) : 'Unlinked'}
                    </span>
                  </div>
                </div>
                {payment.transactionId && (
                  <Link to={`/transactions/${payment.transactionId}`}>
                    <Button variant="ghost" size="sm" className="text-primary-600 font-semibold text-xs">
                      View
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Audit trail / chron status updates */}
          <Card className="shadow-sm border border-border-subtle rounded-2xl bg-white">
            <CardHeader className="py-4 px-6 border-b border-border-subtle">
              <CardTitle>System Log Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
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
                          <p className="text-xs font-semibold text-text-main">Collection Created</p>
                          <div className="text-right text-[10px] whitespace-nowrap text-text-muted mt-0.5">
                            {format(new Date(payment.createdAt), 'dd MMM yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>

                  <li>
                    <div className="relative pb-8">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                            payment.status === 'CAPTURED' ? 'bg-success-50 text-success-600' :
                            payment.status === 'REFUNDED' ? 'bg-danger-50 text-danger-600' : 'bg-warning-50 text-warning-600'
                          }`}>
                            {payment.status === 'CAPTURED' ? <CheckCircle className="w-4 h-4" /> :
                             payment.status === 'REFUNDED' ? <Undo2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="text-xs font-semibold text-text-main">
                            Status Set to {payment.status}
                          </p>
                          <div className="text-right text-[10px] whitespace-nowrap text-text-muted mt-0.5">
                            {format(new Date(payment.updatedAt), 'dd MMM yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              {payment.createdBy && (
                <div className="border-t border-border-subtle pt-4 mt-6 flex items-center gap-2 text-xs text-text-muted">
                  <User className="w-4 h-4" />
                  <span>Collected by user {payment.createdBy.substring(0, 8)}...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
