import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useReconciliationRuns } from '../hooks/useReconciliationRuns';
import { ChevronRight, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';

export const ReconciliationRuns = () => {
  const { runs, loading, error, changePage, pagination, startReconciliation, isRunning } = useReconciliationRuns();
  const navigate = useNavigate();
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runConfig, setRunConfig] = useState({ source: 'Payments', target: 'Settlements' });

  const handleRun = async () => {
    setIsRunModalOpen(false);
    await startReconciliation(runConfig);
  };

  if (error) {
    return <ErrorState title="Unable to load runs" description={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reconciliation Runs" 
        description="View past reconciliation executions and their results."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/reconciliation')}>
              Back to Overview
            </Button>
            <Button variant="primary" onClick={() => setIsRunModalOpen(true)} disabled={isRunning}>
              {isRunning ? 'Running...' : 'Run Reconciliation'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading && runs.length === 0 ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : runs.length === 0 ? (
            <EmptyState 
              icon={FileText}
              title="No runs found" 
              description="Start a new reconciliation run to see the history here."
              actionLabel="Start Run"
              onAction={() => setIsRunModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Source / Target</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                    <TableHead className="text-right">Match Rate</TableHead>
                    <TableHead className="text-right">Exceptions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id} className="cursor-pointer hover:bg-bg-base" onClick={() => navigate(`/reconciliation/runs/${run.id}`)}>
                      <TableCell className="font-medium">{run.id}</TableCell>
                      <TableCell>{format(new Date(run.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{run.source}</span>
                          <span className="text-text-muted text-xs">vs {run.target}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{run.recordsProcessed}</TableCell>
                      <TableCell className="text-right">{run.matchRate}%</TableCell>
                      <TableCell className="text-right">
                        <span className={run.unresolvedExceptions > 0 ? "text-error-main" : ""}>
                          {run.unresolvedExceptions} / {run.exceptionsFound}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={run.status} />
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
          
          {!loading && runs.length > 0 && pagination.totalPages > 1 && (
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
        title="Start Reconciliation Run"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Source Data</label>
            <select 
              className="w-full p-2 border border-border-light rounded-md bg-bg-surface text-text-main"
              value={runConfig.source}
              onChange={e => setRunConfig({...runConfig, source: e.target.value})}
            >
              <option>Payments</option>
              <option>Invoices</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Data</label>
            <select 
              className="w-full p-2 border border-border-light rounded-md bg-bg-surface text-text-main"
              value={runConfig.target}
              onChange={e => setRunConfig({...runConfig, target: e.target.value})}
            >
              <option>Settlements</option>
              <option>Bank Statement</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRunModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleRun}>Run Engine</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
