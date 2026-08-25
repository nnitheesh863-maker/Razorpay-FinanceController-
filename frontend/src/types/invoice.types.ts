export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED' | 'VOID';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  discount: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  referenceNumber: string | null;
  customerName: string;
  customerId: string | null;
  issueDate: string;
  dueDate: string;
  currency: string;
  
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  
  createdAt: string;
  updatedAt: string;
  
  lineItems?: InvoiceLineItem[];
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceListResponse {
  data: Invoice[];
  pagination: Pagination;
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalInvoiced: number;
  paid: number;
  pending: number;
  overdue: number;
  statusBreakdown: Record<string, number>;
}
