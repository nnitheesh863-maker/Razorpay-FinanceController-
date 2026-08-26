import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { getReconciliationRecordById } from '../api/reconciliation.api';
import type { ReconciliationRecord } from '../types/reconciliation.types';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const ReconciliationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<ReconciliationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await getReconciliationRecordById(id);
        setRecord(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch record details');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (error) {
    return <ErrorState title="Unable to load detail" description={error} onRetry={() => navigate('/reconciliation')} />;
  }

  if (loading || !record) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Reconciliation Detail</h1>
          <p className="text-text-muted text-sm">{record.id}</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-bg-surface p-4 rounded-lg border border-border-light">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm text-text-muted block">Status</span>
            <StatusBadge status={record.matchStatus} />
          </div>
          <div className="border-l border-border-light pl-4">
            <span className="text-sm text-text-muted block">Run ID</span>
            <span className="font-medium">{record.runId}</span>
          </div>
          <div className="border-l border-border-light pl-4">
            <span className="text-sm text-text-muted block">Created</span>
            <span className="font-medium">{format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {record.matchStatus !== 'MATCHED' && (
            <Button variant="primary">Manual Match</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Record */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-lg">SOURCE</h3>
            <p className="text-sm text-text-muted">{record.sourceRecord?.type || 'Unknown'}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {record.sourceRecord ? (
              <>
                <div className="flex justify-between border-b border-border-light pb-2">
                  <span className="text-text-muted">ID</span>
                  <span className="font-medium">{record.sourceRecord.id}</span>
                </div>
                <div className="flex justify-between border-b border-border-light pb-2">
                  <span className="text-text-muted">Amount</span>
                  <span className="font-medium text-lg">{formatCurrency(record.sourceRecord.amount)}</span>
                </div>
                <div className="flex justify-between border-b border-border-light pb-2">
                  <span className="text-text-muted">Date</span>
                  <span className="font-medium">{format(new Date(record.sourceRecord.date), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between border-b border-border-light pb-2">
                  <span className="text-text-muted">Reference</span>
                  <span className="font-medium">{record.sourceRecord.reference}</span>
                </div>
                <div className="pt-2">
                  <Button variant="outline" className="w-full">View Source</Button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-text-muted">
                No source record found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target Record */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-lg">TARGET</h3>
            <p className="text-sm text-text-muted">{record.targetRecord?.type || 'Unknown'}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {record.targetRecord ? (
              <>
                <div className="flex justify-between border-b border-border-light pb-2">
                  <span className="text-text-muted">ID</span>
                  <span className="font-medium">{record.targetRecord.id}</span>
                </div>
                <div className="flex justify-between border-b border-border-light pb-2">
                  <span className="text-text-muted">Amount</span>
                  <span className="font-medium text-lg">{formatCurrency(record.targetRecord.amount)}</span>
                </div>
                <div className="flex justify-between border-b border-border-light pb-2">
                  <span className="text-text-muted">Date</span>
                  <span className="font-medium">{format(new Date(record.targetRecord.date), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between border-b border-border-light pb-2">
                  <span className="text-text-muted">Reference</span>
                  <span className="font-medium">{record.targetRecord.reference}</span>
                </div>
                <div className="pt-2">
                  <Button variant="outline" className="w-full">View Target</Button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-error-main" />
                <span className="text-text-muted">No matching record found.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={record.difference === 0 ? "border-success-main/50 bg-success-main/5" : "border-error-main/50 bg-error-main/5"}>
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold mb-1">Comparison Result</h3>
              <div className="flex items-center gap-2">
                {record.difference === 0 ? (
                  <Check className="w-5 h-5 text-success-main" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-error-main" />
                )}
                <span className="font-medium">
                  {record.difference === 0 ? 'Exact Match' : 'Difference Found'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-text-muted block">Difference</span>
              <span className={`text-2xl font-bold ${record.difference === 0 ? 'text-success-main' : 'text-error-main'}`}>
                {formatCurrency(record.difference)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
