import { useState, useEffect, useCallback } from 'react';
import { getReconciliationRecords, getReconciliationSummary } from '../api/reconciliation.api';
import type { ReconciliationRecord, ReconciliationSummary, ReconciliationFilters } from '../types/reconciliation.types';

export const useReconciliation = (initialFilters: ReconciliationFilters = {}) => {
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReconciliationFilters>(initialFilters);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });

  const fetchSummary = async () => {
    try {
      const response = await getReconciliationSummary();
      setSummary(response.data);
    } catch (err) {
      console.error('Failed to fetch summary', err);
    }
  };

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getReconciliationRecords(filters);
      setRecords(response.data);
      setPagination(response.meta);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reconciliation records');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const updateFilters = (newFilters: Partial<ReconciliationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const changePage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return {
    records,
    summary,
    loading,
    error,
    filters,
    pagination,
    updateFilters,
    changePage,
    refetch: fetchRecords
  };
};
