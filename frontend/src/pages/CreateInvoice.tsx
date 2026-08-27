import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createInvoice } from '../api/invoices.api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Calculator 
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.coerce.number().nonnegative('Price must be non-negative'),
  tax: z.coerce.number().nonnegative('Tax must be non-negative').default(0),
  discount: z.coerce.number().nonnegative('Discount must be non-negative').default(0)
});

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().optional(),
  referenceNumber: z.string().optional().nullable(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerId: z.string().optional().nullable(),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.string().min(3).max(3).default('INR'),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required')
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export function CreateInvoice() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const defaultDueDate = thirtyDaysLater.toISOString().split('T')[0];

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: {
      invoiceNumber: '',
      referenceNumber: '',
      customerName: '',
      customerId: '',
      issueDate: today,
      dueDate: defaultDueDate,
      currency: 'INR',
      lineItems: [
        { description: '', quantity: 1, unitPrice: 0, tax: 0, discount: 0 }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems'
  });

  const watchedItems = watch('lineItems');

  // Client-side aggregate calculation for live visual preview
  const calculateLiveTotals = () => {
    let subtotal = 0;
    let tax = 0;
    let discount = 0;

    watchedItems.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const itemTax = Number(item.tax) || 0;
      const itemDiscount = Number(item.discount) || 0;

      subtotal += qty * price;
      tax += itemTax;
      discount += itemDiscount;
    });

    const total = subtotal + tax - discount;

    return {
      subtotal,
      tax,
      discount,
      total
    };
  };

  const totals = calculateLiveTotals();

  const onSubmit = async (values: InvoiceFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createInvoice(values as any);
      if (res.success) {
        setSuccess('Invoice created successfully.');
        setTimeout(() => {
          navigate(`/invoices/${res.data.id}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Back navigation */}
      <button 
        onClick={() => navigate('/invoices')} 
        className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-main transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Invoices</span>
      </button>

      {/* Header */}
      <PageHeader
        title="Create Invoice"
        description="Draft a customer billing request with associated items, quantities, and taxation."
      />

      {/* Notifications */}
      {success && (
        <div className="p-3.5 bg-success-50 border border-success-100 text-success-800 rounded-xl flex items-center gap-2 text-sm shadow-sm">
          <CheckCircle className="w-5 h-5 text-success-600" />
          <span className="font-medium">{success}</span>
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="shadow-sm border border-border-subtle rounded-2xl p-6 bg-white">
          <CardContent className="p-0 space-y-6">
            <h3 className="text-sm font-bold text-text-main border-b border-border-subtle pb-2">1. Invoice Metadata</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Customer Name"
                required
                placeholder="e.g. ABC Technologies"
                error={errors.customerName?.message}
                {...register('customerName')}
              />
              <Input
                label="Customer ID (optional)"
                placeholder="e.g. CUST-501"
                error={errors.customerId?.message}
                {...register('customerId')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Invoice Number (leave blank for automatic)"
                  placeholder="e.g. INV-2026-000001"
                  error={errors.invoiceNumber?.message}
                  {...register('invoiceNumber')}
                />
              </div>
              <Input
                label="Reference Number"
                placeholder="e.g. PO-83711"
                error={errors.referenceNumber?.message}
                {...register('referenceNumber')}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-main">Currency</label>
                <select
                  className="bg-white border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  {...register('currency')}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border-subtle pt-4">
              <Input
                label="Issue Date"
                type="date"
                required
                error={errors.issueDate?.message}
                {...register('issueDate')}
              />
              <Input
                label="Due Date"
                type="date"
                required
                error={errors.dueDate?.message}
                {...register('dueDate')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line items card */}
        <Card className="shadow-sm border border-border-subtle rounded-2xl p-6 bg-white">
          <CardContent className="p-0 space-y-4">
            <div className="flex justify-between items-center border-b border-border-subtle pb-2">
              <h3 className="text-sm font-bold text-text-main">2. Billing Line Items</h3>
              <Button type="button" variant="outline" size="sm" className="flex items-center gap-1" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, tax: 0, discount: 0 })}>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-end p-4 border border-border-subtle rounded-xl bg-neutral-50/20 relative">
                <div className="col-span-12 md:col-span-5">
                  <Input
                    label={`Item Description #${index + 1}`}
                    required
                    placeholder="e.g. Website Hosting Services"
                    error={errors.lineItems?.[index]?.description?.message}
                    {...register(`lineItems.${index}.description` as const)}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input
                    label="Qty"
                    type="number"
                    required
                    error={errors.lineItems?.[index]?.quantity?.message}
                    {...register(`lineItems.${index}.quantity` as const)}
                  />
                </div>
                <div className="col-span-8 md:col-span-2">
                  <Input
                    label="Unit Price"
                    type="number"
                    step="0.01"
                    required
                    error={errors.lineItems?.[index]?.unitPrice?.message}
                    {...register(`lineItems.${index}.unitPrice` as const)}
                  />
                </div>
                <div className="col-span-6 md:col-span-1">
                  <Input
                    label="Tax"
                    type="number"
                    step="0.01"
                    {...register(`lineItems.${index}.tax` as const)}
                  />
                </div>
                <div className="col-span-6 md:col-span-1">
                  <Input
                    label="Discount"
                    type="number"
                    step="0.01"
                    {...register(`lineItems.${index}.discount` as const)}
                  />
                </div>
                <div className="col-span-12 md:col-span-1 flex justify-end">
                  {fields.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => remove(index)}
                      className="text-danger-500 hover:text-danger-700 p-2 rounded-lg hover:bg-danger-50/50 transition-colors"
                      aria-label="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {errors.lineItems?.message && (
              <p className="text-xs text-danger-600 font-semibold">{errors.lineItems.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Live Calculation Details */}
        <Card className="shadow-sm border border-border-subtle rounded-2xl p-6 bg-white">
          <CardContent className="p-0 flex flex-col md:flex-row justify-between gap-6">
            <div className="flex items-start gap-2.5 text-text-muted max-w-sm">
              <Calculator className="w-5 h-5 text-text-muted mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed">
                Taxes and discounts are aggregated. Subtotals and grand totals calculated on this form serve as visual estimations. Authoritative totals will be securely recalculated by the server.
              </p>
            </div>
            
            <div className="w-full md:w-80 space-y-2.5 text-sm font-medium border-t border-border-subtle md:border-t-0 md:pt-0 pt-4">
              <div className="flex justify-between text-text-muted">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Taxes:</span>
                <span className="text-danger-600">+{formatCurrency(totals.tax)}</span>
              </div>
              <div className="flex justify-between text-text-muted border-b border-border-subtle pb-2.5">
                <span>Discounts:</span>
                <span className="text-success-600">-{formatCurrency(totals.discount)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-text-main pt-1">
                <span>Grand Total:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form controls */}
        <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/invoices')} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Save Draft Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}
