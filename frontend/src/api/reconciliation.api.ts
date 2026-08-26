
import type { ReconciliationRun, ReconciliationRecord, ReconciliationSummary, ReconciliationFilters, PaginatedResponse } from '../types/reconciliation.types';

// Mock data generator for synthetic 50+ records
const generateMockRecords = (): ReconciliationRecord[] => {
  const records: ReconciliationRecord[] = [];
  for (let i = 1; i <= 100; i++) {
    const isMatched = i <= 82;
    const isException = !isMatched && i > 95;
    
    records.push({
      id: `REC-REC-10${i}`,
      runId: 'REC-2026-001',
      sourceRecord: {
        id: `PAY-100${i}`,
        type: 'Payment',
        reference: `REF-100${i}`,
        date: '2026-08-25T10:00:00Z',
        amount: 10000,
        status: 'COMPLETED'
      },
      targetRecord: isMatched || isException ? {
        id: `SET-500${i}`,
        type: 'Settlement',
        reference: `REF-100${i}`,
        date: '2026-08-25T10:05:00Z',
        amount: isException ? 9850 : 10000,
        status: 'COMPLETED'
      } : undefined,
      sourceAmount: 10000,
      targetAmount: isException ? 9850 : (isMatched ? 10000 : 0),
      difference: isException ? 150 : (isMatched ? 0 : 10000),
      matchStatus: isException ? 'EXCEPTION' : (isMatched ? 'MATCHED' : 'UNMATCHED'),
      matchType: isMatched ? 'EXACT' : 'NONE',
      confidence: isMatched ? 100 : (isException ? 80 : 0),
      reviewed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return records;
};

const mockRecords = generateMockRecords();

export const getReconciliationSummary = async (): Promise<{ data: ReconciliationSummary }> => {
  // In a real app this would be: return (await axiosInstance.get('/reconciliation/summary')).data;
  return new Promise(resolve => setTimeout(() => resolve({
    data: {
      totalRecordsProcessed: 100,
      totalMatched: 82,
      totalUnmatched: 18,
      matchRate: 82.0,
      totalExceptions: 12,
      unresolvedExceptions: 5
    }
  }), 500));
};

export const getReconciliationRuns = async (_filters: any = {}): Promise<PaginatedResponse<ReconciliationRun>> => {
  // return (await axiosInstance.get('/reconciliation/runs', { params: filters })).data;
  return new Promise(resolve => setTimeout(() => resolve({
    data: [
      {
        id: 'REC-2026-001',
        source: 'Payments',
        target: 'Settlements',
        dateRange: { start: '2026-08-01', end: '2026-08-25' },
        recordsProcessed: 100,
        matchedRecords: 82,
        exceptionsFound: 12,
        unresolvedExceptions: 5,
        matchRate: 82,
        durationMs: 4500,
        status: 'COMPLETED',
        reconciledAmount: 820000,
        unmatchedAmount: 180000,
        pendingAmount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
  }), 500));
};

export const getReconciliationRunById = async (id: string): Promise<{ data: ReconciliationRun }> => {
  return new Promise(resolve => setTimeout(() => resolve({
    data: {
      id: id,
      source: 'Payments',
      target: 'Settlements',
      recordsProcessed: 100,
      matchedRecords: 82,
      exceptionsFound: 12,
      unresolvedExceptions: 5,
      matchRate: 82,
      durationMs: 4500,
      status: 'COMPLETED',
      reconciledAmount: 820000,
      unmatchedAmount: 180000,
      pendingAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }), 500));
};

export const getReconciliationRecords = async (filters: ReconciliationFilters = {}): Promise<PaginatedResponse<ReconciliationRecord>> => {
  return new Promise(resolve => setTimeout(() => {
    let filtered = [...mockRecords];
    if (filters.status) {
      filtered = filtered.filter(r => r.matchStatus === filters.status);
    }
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const paginated = filtered.slice((page - 1) * limit, page * limit);
    
    resolve({
      data: paginated,
      meta: {
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit)
      }
    });
  }, 500));
};

export const getReconciliationRecordById = async (id: string): Promise<{ data: ReconciliationRecord }> => {
  return new Promise(resolve => setTimeout(() => {
    const record = mockRecords.find(r => r.id === id) || mockRecords[0];
    resolve({ data: record });
  }, 500));
};

export const runReconciliation = async (config: any): Promise<{ data: ReconciliationRun }> => {
  return new Promise(resolve => setTimeout(() => resolve({
    data: {
      id: 'REC-2026-002',
      source: config.source || 'Payments',
      target: config.target || 'Settlements',
      recordsProcessed: 0,
      matchedRecords: 0,
      exceptionsFound: 0,
      unresolvedExceptions: 0,
      matchRate: 0,
      durationMs: 0,
      status: 'RUNNING',
      reconciledAmount: 0,
      unmatchedAmount: 0,
      pendingAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }), 1000));
};
