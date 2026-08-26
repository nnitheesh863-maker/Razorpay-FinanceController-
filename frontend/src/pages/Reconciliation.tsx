import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { KpiCard } from '../components/ui/KpiCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useReconciliation } from '../hooks/useReconciliation';
import { FileText, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';

export const Reconciliation = () => {
  const { records, summary, loading, error, changePage, pagination } = useReconciliation();
  const navigate = useNavigate();
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const handleRunReconciliation = () => {
    // Navigate to runs page where we can trigger it or handle modal logic here
    setIsRunModalOpen(true);
  };

  if (error) {
    return <ErrorState title="Unable to load reconciliation data" description={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reconciliation" 
        description="Compare financial records, identify matches and investigate unresolved differences."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/reconciliation/runs')}>
              View Runs
            </Button>
            <Button variant="primary" onClick={handleRunReconciliation}>
              Run Reconciliation
            </Button>
          </div>
        }
      />

      {loading && !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              title="Records Processed" 
              value={summary.totalRecordsProcessed.toString()} 
              icon={FileText} 
            />
            <KpiCard 
              title="Matched" 
              value={summary.totalMatched.toString()} 
              description={`${summary.matchRate}% Match rate`} 
              icon={CheckCircle2} 
            />
            <KpiCard 
              title="Unmatched" 
              value={summary.totalUnmatched.toString()} 
              icon={AlertTriangle} 
            />
            <KpiCard 
              title="Exceptions" 
              value={summary.totalExceptions.toString()} 
              description={`${summary.unresolvedExceptions} Unresolved`} 
              icon={XCircle} 
            />
          </div>
        )
      )}

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border-light flex justify-between items-center">
            <h3 className="font-medium text-text-main">Reconciliation Records</h3>
          </div>
          
          {loading && records.length === 0 ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : records.length === 0 ? (
            <EmptyState 
              icon={FileText}
              title="No reconciliation records found" 
              description="Run a reconciliation process to see records here."
              actionLabel="Run Reconciliation"
              onAction={handleRunReconciliation}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reconciliation ID</TableHead>
                    <TableHead>Source Record</TableHead>
                    <TableHead>Target Record</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className="cursor-pointer hover:bg-bg-base" onClick={() => navigate(`/reconciliation/${record.id}`)}>
                      <TableCell className="font-medium">{record.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{record.sourceRecord?.id || '-'}</span>
                          <span className="text-xs text-text-muted">{record.sourceRecord?.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{record.targetRecord?.id || 'No matching record'}</span>
                          <span className="text-xs text-text-muted">{record.targetRecord?.type || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(record.difference)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.matchStatus} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{record.matchType || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-5 h-5 text-text-muted" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {!loading && records.length > 0 && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-border-light flex justify-between items-center">
              <span className="text-sm text-text-muted">
                Showing page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={pagination.page === 1}
                  onClick={() => changePage(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => changePage(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal 
        isOpen={isRunModalOpen} 
        onClose={() => setIsRunModalOpen(false)}
        title="Run Reconciliation"
      >
        <div className="space-y-4">
          <p className="text-text-muted text-sm">
            Configure the matching engine for the new reconciliation run.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Source</label>
            <select className="w-full p-2 border border-border-light rounded-md bg-bg-surface text-text-main">
              <option>Payments</option>
              <option>Invoices</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target</label>
            <select className="w-full p-2 border border-border-light rounded-md bg-bg-surface text-text-main">
              <option>Settlements</option>
              <option>Bank Statement</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRunModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => {
              setIsRunModalOpen(false);
              navigate('/reconciliation/runs');
            }}>Run Engine</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
