export type ReconciliationStatus = 
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL'
  | 'CANCELLED';

export type MatchStatus = 
  | 'MATCHED'
  | 'UNMATCHED'
  | 'PARTIAL_MATCH'
  | 'REVIEW_REQUIRED'
  | 'EXCEPTION';

export type MatchType = 
  | 'EXACT'
  | 'REFERENCE'
  | 'AMOUNT'
  | 'DATE'
  | 'FUZZY'
  | 'MANUAL'
  | 'PARTIAL'
  | 'NONE';

export interface ExceptionSummary {
  id: string;
  type: string;
  amount: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
  description?: string;
}

export interface ReconciliationRun {
  id: string;
  source: string;
  target?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  recordsProcessed: number;
  matchedRecords: number;
  exceptionsFound: number;
  unresolvedExceptions: number;
  matchRate: number;
  durationMs: number;
  status: ReconciliationStatus;
  reconciledAmount: number;
  unmatchedAmount: number;
  pendingAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialRecord {
  id: string;
  type: string; // e.g., 'Payment', 'Settlement'
  reference: string;
  date: string;
  amount: number;
  status: string;
}

export interface ReconciliationRecord {
  id: string;
  runId: string;
  sourceRecord?: FinancialRecord;
  targetRecord?: FinancialRecord;
  sourceAmount: number;
  targetAmount: number;
  difference: number;
  matchStatus: MatchStatus;
  matchType?: MatchType;
  confidence?: number;
  exception?: ExceptionSummary;
  reviewed: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationSummary {
  totalRecordsProcessed: number;
  totalMatched: number;
  totalUnmatched: number;
  matchRate: number;
  totalExceptions: number;
  unresolvedExceptions: number;
}

export interface ReconciliationFilters {
  status?: MatchStatus;
  matchType?: MatchType;
  source?: string;
  target?: string;
  runId?: string;
  differenceExists?: boolean;
  reviewed?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
