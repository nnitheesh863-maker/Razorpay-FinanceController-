import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getInvoiceById, issueInvoice, cancelInvoice } from '../api/invoices.api';
import { createPayment, refundPayment } from '../api/payments.api';
import type { Invoice } from '../types/invoice.types';
import type { Payment } from '../types/payment.types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { FinanceStatus } from '../components/ui/StatusBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { formatCurrency } from '../utils/formatters';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle,
  X,
  Send,
  PlusCircle,
  Undo2
} from 'lucide-react';
import { format } from 'date-fns';

const paymentFormSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  currency: z.string().min(3).max(3).default('INR'),
  paymentMethod: z.enum(['CARD', 'UPI', 'NETBANKING', 'WALLET', 'BANK_TRANSFER']),
  paymentGateway: z.string().default('RAZORPAY'),
  gatewayPaymentId: z.string().min(1, 'Gateway ID is required'),
  notes: z.string().optional()
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<(Invoice & { payments?: Payment[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal triggers
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // RBAC checks
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const isViewer = user ? user.role === 'VIEWER' : true;
  const canModify = !isViewer;
  const canCancel = user ? (user.role === 'ADMIN' || user.role === 'FINANCE_MANAGER') : false;

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema) as any,
    defaultValues: {
      amount: 0,
      currency: 'INR',
      paymentMethod: 'UPI',
      paymentGateway: 'RAZORPAY',
      gatewayPaymentId: '',
      notes: ''
    }
  });

  const fetchInvoice = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getInvoiceById(id);
      setInvoice(res.data);
      paymentForm.setValue('amount', res.data.balanceDue);
      paymentForm.setValue('gatewayPaymentId', `pay_rec_${Date.now().toString().substring(6)}`);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleIssue = async () => {
    if (!invoice) return;
    setError(null);
    try {
      const res = await issueInvoice(invoice.id);
      if (res.success) {
        setSuccess('Invoice issued successfully.');
        fetchInvoice();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to issue invoice.');
    }
  };

  const handleCancelConfirm = async () => {
    if (!invoice) return;
    setError(null);
    try {
      const res = await cancelInvoice(invoice.id);
      if (res.success) {
        setSuccess('Invoice cancelled successfully.');
        setIsCancelOpen(false);
        fetchInvoice();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel invoice.');
    }
  };

  const handleRecordPayment = async (values: PaymentFormValues) => {
    if (!invoice) return;
    setError(null);
    
    // Check client-side limit first as convenience helper
    if (values.amount > invoice.balanceDue) {
      setError(`Payment amount cannot exceed outstanding balance of ${formatCurrency(invoice.balanceDue)}`);
      return;
    }

    try {
      const res = await createPayment({
        invoiceId: invoice.id,
        amount: values.amount,
        currency: values.currency,
        paymentMethod: values.paymentMethod,
        paymentGateway: values.paymentGateway,
        gatewayPaymentId: values.gatewayPaymentId,
        notes: values.notes
      });

      if (res.success) {
        setSuccess('Payment collected and recorded.');
        setIsPaymentOpen(false);
        paymentForm.reset();
        fetchInvoice();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record payment.');
    }
  };

  const handleRefund = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to refund this payment?')) return;
    setError(null);
    try {
      const res = await refundPayment(paymentId, 'Customer request refund');
      if (res.success) {
        setSuccess('Payment refunded successfully.');
        fetchInvoice();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process refund.');
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

  if (error || !invoice) {
    return (
      <div className="p-6 text-center text-danger-600 max-w-lg mx-auto py-12">
        <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-text-main">Invoice Error</h2>
        <p className="text-text-muted mt-2 mb-6">{error || 'Invoice not found.'}</p>
        <Button onClick={() => navigate('/invoices')}>Back to Invoices</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back link */}
      <button 
        onClick={() => navigate('/invoices')} 
        className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-main transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Invoices</span>
      </button>

      {/* Notifications */}
      {success && (
        <div className="p-3.5 bg-success-50 border border-success-100 text-success-800 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success-600" />
            <span className="font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-success-600 hover:text-success-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title={`Invoice: ${invoice.invoiceNumber}`}
        description={`Manage billing details and payments for customer ${invoice.customerName}`}
        actions={
          <div className="flex items-center gap-2">
            {canModify && invoice.status === 'DRAFT' && (
              <Button size="sm" className="flex items-center gap-1.5" onClick={handleIssue}>
                <Send className="w-4 h-4" />
                <span>Issue Invoice</span>
              </Button>
            )}
            
            {canModify && (invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID') && (
              <Button size="sm" className="flex items-center gap-1.5" onClick={() => setIsPaymentOpen(true)}>
                <PlusCircle className="w-4 h-4" />
                <span>Record Payment</span>
              </Button>
            )}

            {canCancel && invoice.status !== 'CANCELLED' && (
              <Button variant="outline" size="sm" className="text-danger-600 hover:bg-danger-50/50 border-danger-200" onClick={() => setIsCancelOpen(true)}>
                <X className="w-4 h-4" />
                <span>Cancel Invoice</span>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main invoice sheet */}
        <Card className="lg:col-span-2 shadow-sm border border-border-subtle rounded-2xl p-6 bg-white space-y-6">
          {/* Visual Header */}
          <div className="flex justify-between items-start border-b border-border-subtle pb-6">
            <div>
              <span className="text-xs uppercase text-text-muted font-bold tracking-wider">Customer Info</span>
              <h2 className="text-lg font-bold text-text-main mt-0.5">{invoice.customerName}</h2>
              {invoice.customerId && (
                <span className="text-xs text-text-muted mt-1 block">ID: {invoice.customerId}</span>
              )}
            </div>
            
            <div className="text-right">
              <span className="text-xs uppercase text-text-muted font-bold tracking-wider">Statuses</span>
              <div className="flex items-center gap-2 mt-1.5 justify-end">
                <StatusBadge status={invoice.status as FinanceStatus} />
                <StatusBadge status={invoice.paymentStatus as FinanceStatus} />
              </div>
            </div>
          </div>

          {/* Date range grid */}
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-text-muted pb-4 border-b border-border-subtle">
            <div>
              <span>Issue Date:</span>
              <span className="block font-bold text-text-main mt-0.5">{format(new Date(invoice.issueDate), 'dd MMM yyyy')}</span>
            </div>
            <div>
              <span>Due Date:</span>
              <span className="block font-bold text-text-main mt-0.5">{format(new Date(invoice.dueDate), 'dd MMM yyyy')}</span>
            </div>
          </div>

          {/* Line items list */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase text-text-muted font-bold tracking-wider">Line Items</h3>
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lineItems?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-text-main font-semibold">{item.description}</TableCell>
                    <TableCell className="text-center text-xs text-text-muted">{item.quantity}</TableCell>
                    <TableCell className="text-right text-xs text-text-muted">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right text-xs text-danger-600">+{formatCurrency(item.tax)}</TableCell>
                    <TableCell className="text-right text-xs text-success-600">-{formatCurrency(item.discount)}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-text-main">{formatCurrency(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Financial calculations and payment history sidebar */}
        <div className="space-y-6">
          {/* Summary totals */}
          <Card className="shadow-sm border border-border-subtle rounded-2xl p-6 bg-white space-y-4">
            <h3 className="text-sm font-bold text-text-main border-b border-border-subtle pb-2">Financial Summary</h3>
            
            <div className="space-y-2 text-xs font-medium text-text-muted">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-danger-600">
                <span>Taxes:</span>
                <span>+{formatCurrency(invoice.tax)}</span>
              </div>
              <div className="flex justify-between text-success-600 border-b border-border-subtle pb-2">
                <span>Discounts:</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-text-main pt-1">
                <span>Grand Total:</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-success-700 font-bold">
                <span>Collected Paid:</span>
                <span>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              
              <div className="flex flex-col items-center justify-center bg-danger-50/30 border border-dashed border-danger-200 rounded-xl py-4 mt-4">
                <span className="text-lg font-extrabold text-danger-800">
                  {formatCurrency(invoice.balanceDue)}
                </span>
                <span className="text-[10px] text-danger-600 font-bold uppercase tracking-wider mt-0.5">Balance Outstanding</span>
              </div>
            </div>
          </Card>

          {/* Payment History */}
          <Card className="shadow-sm border border-border-subtle rounded-2xl overflow-hidden bg-white">
            <CardHeader className="py-4 px-6 border-b border-border-subtle">
              <CardTitle>Collection History</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {invoice.payments && invoice.payments.length > 0 ? (
                <div className="space-y-4">
                  {invoice.payments.map((pmt) => (
                    <div key={pmt.id} className="border border-border-subtle rounded-xl p-3 bg-neutral-50/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link to={`/payments/${pmt.id}`} className="font-mono text-xs font-bold text-primary-600 hover:underline">
                            {pmt.id.substring(0, 15)}...
                          </Link>
                          <span className="text-[10px] text-text-muted block mt-0.5">
                            {format(new Date(pmt.paymentDate), 'dd MMM yyyy HH:mm')}
                          </span>
                        </div>
                        <span className="font-extrabold text-text-main text-sm">{formatCurrency(pmt.amount)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border-subtle/50">
                        <span className="text-[10px] text-text-muted font-bold uppercase">{pmt.paymentMethod}</span>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={pmt.status as FinanceStatus} />
                          {canCancel && pmt.status === 'CAPTURED' && (
                            <button 
                              onClick={() => handleRefund(pmt.id)}
                              className="text-danger-500 hover:text-danger-700 font-bold text-[10px] flex items-center gap-0.5 border border-danger-100 hover:bg-danger-50/50 px-1.5 py-0.5 rounded"
                            >
                              <Undo2 className="w-3 h-3" />
                              <span>Refund</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted text-center italic py-4">No payments recorded for this invoice.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RECORD PAYMENT DIALOG MODAL */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-border-subtle rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center bg-neutral-50 px-6 py-4 border-b border-border-subtle">
              <h2 className="text-base font-bold text-text-main">Record Customer Payment</h2>
              <button onClick={() => setIsPaymentOpen(false)} className="text-text-muted hover:text-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={paymentForm.handleSubmit(handleRecordPayment)} className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-lg text-xs">
                Recording this payment will automatically deduct the balance and create a corresponding system transaction log.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Payment Amount"
                  type="number"
                  step="0.01"
                  required
                  error={paymentForm.formState.errors.amount?.message}
                  {...paymentForm.register('amount')}
                />
                
                <Input
                  label="Currency"
                  required
                  error={paymentForm.formState.errors.currency?.message}
                  {...paymentForm.register('currency')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main">Payment Method</label>
                  <select
                    className="bg-white border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    {...paymentForm.register('paymentMethod')}
                  >
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="NETBANKING">NetBanking</option>
                    <option value="WALLET">Wallet</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>

                <Input
                  label="Payment Gateway"
                  required
                  error={paymentForm.formState.errors.paymentGateway?.message}
                  {...paymentForm.register('paymentGateway')}
                />
              </div>

              <Input
                label="Gateway Payment ID"
                required
                placeholder="pay_..."
                error={paymentForm.formState.errors.gatewayPaymentId?.message}
                {...paymentForm.register('gatewayPaymentId')}
              />

              <Input
                label="Notes"
                placeholder="Optional notes or gateway metadata..."
                error={paymentForm.formState.errors.notes?.message}
                {...paymentForm.register('notes')}
              />

              <div className="flex justify-end gap-2 border-t border-border-subtle pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Record Payout
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL INVOICE DIALOG */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-border-subtle rounded-2xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center gap-3 text-danger-600 mb-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h2 className="text-base font-bold text-text-main">Cancel Invoice</h2>
            </div>
            
            <p className="text-sm text-text-muted leading-relaxed">
              Are you sure you want to cancel this invoice? This will prevent any further payments from being logged against it.
            </p>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCancelOpen(false)}>
                Keep Invoice
              </Button>
              <Button variant="danger" onClick={handleCancelConfirm}>
                Yes, Cancel Invoice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
