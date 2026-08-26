import { useState, useEffect, useCallback } from 'react';
import { getReconciliationRuns, runReconciliation } from '../api/reconciliation.api';
import type { ReconciliationRun } from '../types/reconciliation.types';

export const useReconciliationRuns = (initialFilters: any = {}) => {
  const [runs, setRuns] = useState<ReconciliationRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isRunning, setIsRunning] = useState(false);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getReconciliationRuns(filters);
      setRuns(response.data);
      setPagination(response.meta);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reconciliation runs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const updateFilters = (newFilters: any) => {
    setFilters((prev: any) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const changePage = (page: number) => {
    setFilters((prev: any) => ({ ...prev, page }));
  };

  const startReconciliation = async (config: any) => {
    try {
      setIsRunning(true);
      await runReconciliation(config);
      await fetchRuns();
    } catch (err: any) {
      setError(err.message || 'Failed to start reconciliation');
    } finally {
      setIsRunning(false);
    }
  };

  return {
    runs,
    loading,
    error,
    filters,
    pagination,
    isRunning,
    updateFilters,
    changePage,
    refetch: fetchRuns,
    startReconciliation
  };
};
