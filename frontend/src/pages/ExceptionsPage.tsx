// src/pages/ExceptionsPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExceptions } from '../hooks/useExceptions';
import { PageHeader } from '../components/ui/PageHeader';
import { KpiCard } from '../components/ui/KpiCard';
import { Button } from '../components/ui/Button';
import { 
  RefreshCw, 
  Download, 
  Filter, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  UserRound, 
  MoreHorizontal 
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Tooltip } from '../components/ui/Tooltip';
import { Skeleton } from '../components/ui/Skeleton';
import { Pagination } from '../components/ui/Pagination';

export default function ExceptionsPage() {
  const navigate = useNavigate();
  const {
    exceptions,
    summary,
    isLoading,
    isError,
    setSearch,
    setStatus,
    setSeverity,
    setType,
    setDateRange,
    setAssignedTo,
    setPage,
    setLimit,
    filters,
    refetch,
  } = useExceptions();

  const [searchTerm, setSearchTerm] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setSearch(searchTerm), 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-40 w-full mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-danger-600">
        <p>Unable to load exceptions.</p>
        <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    // TODO: invoke export endpoint, currently placeholder
    console.log('Export triggered');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Exceptions"
        description="Investigate and resolve financial discrepancies."
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} aria-label="Refresh">
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
            </Button>
            {/* Export button - show only if backend supports; placeholder now */}
            <Button variant="outline" size="sm" onClick={handleExport} aria-label="Export">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Total Exceptions" value={summary?.total ?? '-'} icon={AlertTriangle} />
        <KpiCard title="Critical" value={summary?.critical ?? '-'} icon={AlertCircle} />
        <KpiCard title="Unresolved" value={summary?.unresolved ?? '-'} icon={AlertTriangle} />
        <KpiCard title="In Review" value={summary?.inReview ?? '-'} icon={Clock} />
        <KpiCard title="Resolved" value={summary?.resolved ?? '-'} icon={CheckCircle2} />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 w-full md:w-auto">
          <Input
            placeholder="Search exceptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          <Select
            onChange={(e) => setStatus(e.target.value ? [e.target.value] : [])}
            options={[{ label: 'Status (All)', value: '' }, { label: 'Open', value: 'OPEN' }, { label: 'In Review', value: 'IN_REVIEW' }, { label: 'Resolved', value: 'RESOLVED' }]}
          />
          {/* Severity filter */}
          <Select
            onChange={(e) => setSeverity(e.target.value ? [e.target.value] : [])}
            options={[{ label: 'Severity (All)', value: '' }, { label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }]}
          />
          {/* Type filter */}
          <Select
            onChange={(e) => setType(e.target.value ? [e.target.value] : [])}
            options={[{ label: 'Type (All)', value: '' }, { label: 'Amount Mismatch', value: 'AMOUNT_MISMATCH' }, { label: 'Missing Record', value: 'MISSING_RECORD' }, { label: 'Duplicate', value: 'DUPLICATE' }]}
          />
          {/* Date range – simple placeholder for now */}
          <Button variant="outline" size="sm" onClick={() => setDateRange(undefined, undefined)}>
            <Filter className="w-3 h-3 mr-1" /> Date
          </Button>
          {/* Assigned To filter – placeholder */}
          <Button variant="outline" size="sm" onClick={() => setAssignedTo([])}>
            <UserRound className="w-3 h-3 mr-1" /> Assignee
          </Button>
        </div>
      </div>

      {/* Exception Table */}
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Exception</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Related Record</TableHead>
            <TableHead>Difference</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exceptions && exceptions.length > 0 ? (
            exceptions.map((exc: any) => (
              <TableRow key={exc.id} className="hover:bg-bg-base/20 cursor-pointer" onClick={() => navigate(`/exceptions/${exc.id}`)}>
                <TableCell>
                  <div className="font-mono text-sm">{exc.id}</div>
                  <div className="text-xs text-text-muted">{exc.description}</div>
                </TableCell>
                <TableCell>{exc.type.replace('_', ' ')}</TableCell>
                <TableCell>{exc.relatedRecord?.type ?? '-'} {exc.relatedRecord?.id ?? ''}</TableCell>
                <TableCell>{exc.difference != null ? `$${exc.difference.toFixed(2)}` : '-'}</TableCell>
                <TableCell><SeverityBadge severity={exc.severity} /></TableCell>
                <TableCell><StatusBadge status={exc.status} /></TableCell>
                <TableCell>{exc.assignedTo?.name ?? 'Unassigned'}</TableCell>
                <TableCell>{new Date(exc.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  {/* Three‑dot menu – placeholder using Tooltip */}
                  <Tooltip content="More actions">
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} aria-label="More actions">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                <p className="text-text-muted">No exceptions found.</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <Pagination
        currentPage={filters.page ?? 1}
        totalPages={Math.ceil((summary?.total ?? 0) / (filters.limit ?? 20))}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
      />
    </div>
  );
}
