export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'REVERSED';
export type TransactionType = 'DEBIT' | 'CREDIT' | 'REFUND' | 'REVERSAL';
export type ReconciliationStatus = 'MATCHED' | 'UNMATCHED' | 'PARTIAL_MATCH' | 'REVIEW_REQUIRED' | 'EXCEPTION' | 'NOT_RECONCILED';

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
  description: string | null;
  createdAt: string;
  updatedAt: string;
  // Based on current Prisma schema, these might not all exist yet, 
  // but we add them as optional for future expansion in phase 6:
  type?: TransactionType;
  reconciliationStatus?: ReconciliationStatus;
  customerName?: string;
  paymentMethod?: string;
  source?: string;
  fee?: number;
  tax?: number;
  netAmount?: number;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionListResponse {
  data: Transaction[];
  pagination: Pagination;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  statusBreakdown: Record<string, number>;
}
