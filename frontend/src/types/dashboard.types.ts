export type ExceptionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ExceptionStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
export type RunStatus = 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PARTIAL' | 'CANCELLED';

export interface DashboardMetrics {
  recordsProcessed: number;
  matchedRecords: number;
  partiallyMatched?: number;
  unmatched?: number;
  matchRate: number;
  openExceptions: number;
  throughput: number;
  totalDurationMs: number;
  totalTransactionVolume: number;
  totalTransactions: number;
  successfulPayments: number;
  pendingSettlements: number;
  reconciliationMatchRate: number;
  totalInvoices?: number;
  totalInvoiced?: number;
  outstandingInvoiced?: number;
  totalPayments?: number;
  paymentVolume?: number;
}

export interface FinancialSummary {
  reconciledAmount: number;
  unmatchedAmount: number;
  pendingAmount: number;
}

export interface ExceptionSummary {
  summary: {
    OPEN: number;
    UNDER_REVIEW: number;
    RESOLVED: number;
  };
  severityBreakdown: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

export interface RecentRun {
  id: string;
  createdAt: string;
  source: string;
  recordsProcessed: number;
  matchedRecords: number;
  exceptionsFound: number;
  durationMs: number;
  status: RunStatus;
  matchRate: number;
  reconciledAmount: number;
  unmatchedAmount: number;
  pendingAmount: number;
}

export interface ExceptionAttention {
  id: string;
  type: string;
  amount: number;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  createdAt: string;
}

export interface RecentTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

export interface TransactionVolumePoint {
  date: string;
  amount: number;
  count: number;
}

export interface SettlementPerformancePoint {
  date: string;
  expected: number;
  settled: number;
  difference: number;
}

export interface DashboardOverviewResponse {
  metrics: DashboardMetrics;
  financialSummary: FinancialSummary;
  exceptions: ExceptionSummary;
  recentRuns: RecentRun[];
  exceptionsAttention: ExceptionAttention[];
  aiInsights: string | null;
  recentTransactions: RecentTransaction[];
  transactionVolumeChart: TransactionVolumePoint[];
  settlementPerformanceChart: SettlementPerformancePoint[];
}
