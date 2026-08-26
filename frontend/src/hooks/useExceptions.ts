// src/hooks/useExceptions.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getExceptions,
  assignException,
  updateExceptionStatus,
  resolveException,
  reopenException,
  addExceptionNote,
  getExceptionSummary,
  getExceptionAnalytics,
} from '../api/exceptions.api';
import type { Exception, ExceptionFilters, ExceptionSummary, ExceptionAnalytics, ExceptionStatus, ExceptionSeverity, ExceptionType } from '../types/exception.types';

/**
 * Hook for fetching and managing exceptions.
 * Handles list fetching, details, pagination, sorting, filtering, and mutations.
 */
export function useExceptions(initialFilters: Partial<ExceptionFilters> = {}) {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ExceptionFilters>({
    page: 1,
    limit: 20,
    ...initialFilters,
  } as ExceptionFilters);

  // List fetch
  const {
    data: exceptions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Exception[], Error>(['exceptions', filters], () => getExceptions(filters), {
    keepPreviousData: true,
  });

  // Summary fetch (for KPI cards)
  const { data: summary } = useQuery<ExceptionSummary>(['exceptionSummary'], getExceptionSummary);

  // Analytics fetch (optional)
  const { data: analytics } = useQuery<ExceptionAnalytics>(['exceptionAnalytics'], getExceptionAnalytics);

  // Mutations
  const assignMutation = useMutation(
    ({ id, assigneeId }: { id: string; assigneeId: string }) => assignException(id, assigneeId),
    {
      onSuccess: () => queryClient.invalidateQueries(['exceptions']),
    }
  );
  const statusMutation = useMutation(
    ({ id, status }: { id: string; status: string }) => updateExceptionStatus(id, status),
    {
      onSuccess: () => queryClient.invalidateQueries(['exceptions']),
    }
  );
  const resolveMutation = useMutation(resolveException, {
    onSuccess: () => queryClient.invalidateQueries(['exceptions']),
  });
  const reopenMutation = useMutation(reopenException, {
    onSuccess: () => queryClient.invalidateQueries(['exceptions']),
  });
  const noteMutation = useMutation(
    ({ id, note }: { id: string; note: any }) => addExceptionNote(id, note),
    {
      onSuccess: () => queryClient.invalidateQueries(['exceptions']),
    }
  );

  // Pagination helpers
  const setPage = (page: number) => setFilters((prev) => ({ ...prev, page }));
  const setLimit = (limit: number) => setFilters((prev) => ({ ...prev, limit }));

  // Filter setters (simple example)
  const setSearch = (search: string) => setFilters((prev) => ({ ...prev, search, page: 1 }));
  const setStatus = (status: string[]) => setFilters((prev) => ({ ...prev, status: status as ExceptionStatus[], page: 1 }));
  const setSeverity = (severity: string[]) => setFilters((prev) => ({ ...prev, severity: severity as ExceptionSeverity[], page: 1 }));
  const setType = (type: string[]) => setFilters((prev) => ({ ...prev, type: type as ExceptionType[], page: 1 }));
  const setDateRange = (from?: string, to?: string) =>
    setFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to, page: 1 }));
  const setAssignedTo = (assignedTo: string[]) => setFilters((prev) => ({ ...prev, assignedTo, page: 1 }));

  return {
    // Data
    exceptions,
    summary,
    analytics,
    // State
    filters,
    isLoading,
    isError,
    error,
    // Mutations
    assign: assignMutation.mutateAsync,
    changeStatus: statusMutation.mutateAsync,
    resolve: resolveMutation.mutateAsync,
    reopen: reopenMutation.mutateAsync,
    addNote: noteMutation.mutateAsync,
    // Pagination & filters setters
    setPage,
    setLimit,
    setSearch,
    setStatus,
    setSeverity,
    setType,
    setDateRange,
    setAssignedTo,
    refetch,
  } as const;
}
