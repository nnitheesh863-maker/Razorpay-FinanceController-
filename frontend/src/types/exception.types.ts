// src/types/exception.types.ts
/**
 * Types for the Exceptions Management module.
 * These should match the backend payloads exactly.
 */

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExceptionStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'RESOLVED'
  | 'REOPENED'
  | 'IGNORED'
  | 'CLOSED';
export type ExceptionType =
  | 'AMOUNT_MISMATCH'
  | 'MISSING_RECORD'
  | 'DUPLICATE'
  | 'REFERENCE_MISMATCH'
  | 'DATE_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'UNKNOWN';

export interface RelatedRecord {
  id: string;
  type: 'TRANSACTION' | 'INVOICE' | 'PAYMENT' | 'SETTLEMENT' | 'RECONCILIATION';
  amount?: number; // optional, present when applicable
  status?: string;
}

export interface Exception {
  id: string;
  description: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  createdAt: string; // ISO‑8601
  updatedAt: string;
  assignedTo?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  relatedRecord?: RelatedRecord;
  difference?: number; // monetary difference, can be negative
  rootCause?: string;
  notes?: ExceptionNote[];
}

export interface ExceptionNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ExceptionFilters {
  search?: string;
  status?: ExceptionStatus[];
  severity?: ExceptionSeverity[];
  type?: ExceptionType[];
  assignedTo?: string[]; // user IDs
  dateFrom?: string; // ISO‑8601
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof Exception;
  sortOrder?: 'asc' | 'desc';
}

export interface ExceptionSummary {
  total: number;
  critical: number;
  unresolved: number;
  inReview: number;
  resolved: number;
}

export interface ExceptionAnalytics {
  byType: Record<ExceptionType, number>;
  bySeverity: Record<ExceptionSeverity, number>;
  resolutionRate?: number; // e.g., 0.76 for 76%
  averageResolutionTimeHours?: number;
}
