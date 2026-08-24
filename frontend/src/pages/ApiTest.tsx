import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { checkBackendHealth } from '../api/health.api';

export function ApiTest() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [response, setResponse] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleTestHealth = async () => {
    setStatus('loading');
    setErrorMsg('');
    setResponse(null);
    try {
      const data = await checkBackendHealth();
      setResponse(data);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred');
    }
  };

  return (
    <div>
      <PageHeader 
        title="Backend API Test" 
        description="Verify frontend-to-backend communication architecture."
      />

      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-main">Backend:</span>
              <StatusBadge status={status === 'success' ? 'MATCHED' : (status === 'error' ? 'FAILED' : 'PENDING')} />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-main">Base URL:</span>
              <code className="text-sm bg-neutral-100 px-2 py-1 rounded text-neutral-700">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}
              </code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleTestHealth} isLoading={status === 'loading'}>
                [Health Check]
              </Button>
              <Button disabled variant="outline">
                [Get Transactions] (Not implemented)
              </Button>
              <Button disabled variant="outline">
                [Get Invoices] (Not implemented)
              </Button>
            </div>

            {status === 'success' && response && (
              <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-md">
                <p className="text-sm font-semibold text-success-800 mb-2">Response Summary:</p>
                <pre className="text-xs text-success-900 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}

            {status === 'error' && (
              <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-md">
                <p className="text-sm font-semibold text-danger-800 mb-2">Error Details:</p>
                <p className="text-sm text-danger-700">{errorMsg}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
