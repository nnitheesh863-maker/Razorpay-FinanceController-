export type PaymentStatus = 'CAPTURED' | 'PENDING' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CARD' | 'UPI' | 'NETBANKING' | 'WALLET' | 'BANK_TRANSFER';

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod | string;
  paymentGateway?: string | null;
  gatewayPaymentId?: string | null;
  status: PaymentStatus | string;
  customerName?: string | null;
  customerEmail?: string | null;
  paymentDate: string;
  invoiceId?: string | null;
  transactionId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface PaymentFilters {
  page?: number;
  limit?: number;
  status?: string;
  paymentMethod?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentListResponse {
  data: Payment[];
  pagination: Pagination;
}

export interface PaymentSummary {
  totalPayments: number;
  paymentVolume: number;
  capturedCount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
  statusBreakdown: Record<string, number>;
}
