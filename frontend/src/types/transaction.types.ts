export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type TransactionType = 'PAYMENT' | 'REFUND' | 'TRANSFER' | 'ADJUSTMENT' | 'FEE';

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: TransactionStatus | string;
  type: TransactionType | string;
  reference?: string | null;
  paymentMethod?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  paymentMethod?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionListResponse {
  data: Transaction[];
  pagination: Pagination;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalVolume: number;
  successfulCount: number;
  pendingCount: number;
  failedCount: number;
  statusBreakdown: Record<string, number>;
}
