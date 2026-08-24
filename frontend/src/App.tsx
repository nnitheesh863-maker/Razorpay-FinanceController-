import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PageHeader } from './components/ui/PageHeader';
import { Button } from './components/ui/Button';
import { KpiCard } from './components/ui/KpiCard';
import { StatusBadge } from './components/ui/StatusBadge';
import { Card, CardContent } from './components/ui/Card';
import { FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

function DashboardPlaceholder() {
  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        description="Overview of financial operations and reconciliation status."
        actions={
          <Button variant="primary">Run Reconciliation</Button>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard 
          title="Total Records" 
          value="1,240" 
          description="Processed in latest run" 
          icon={FileText} 
        />
        <KpiCard 
          title="Matched" 
          value="982" 
          description="79% Match rate" 
          icon={CheckCircle2} 
          trend={{ value: 2.4, label: 'vs last run', isPositive: true }}
        />
        <KpiCard 
          title="Review Required" 
          value="142" 
          description="Pending human review" 
          icon={AlertTriangle} 
        />
        <KpiCard 
          title="Open Exceptions" 
          value="116" 
          description="Unmatched records" 
          icon={XCircle} 
          trend={{ value: 5.1, label: 'vs last run', isPositive: false }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 h-64 flex items-center justify-center text-text-muted bg-bg-base/30 rounded-lg">
            Reconciliation Chart Placeholder
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 h-64 flex flex-col gap-4">
            <h3 className="font-medium text-text-main">Recent Statuses</h3>
            <div className="space-y-2 flex flex-col items-start">
              <StatusBadge status="MATCHED" />
              <StatusBadge status="REVIEW_REQUIRED" />
              <StatusBadge status="UNMATCHED" />
              <StatusBadge status="IN_REVIEW" />
              <StatusBadge status="DUPLICATE" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { ApiTest } from './pages/ApiTest';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} description={`${title} will be implemented in a future phase.`} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPlaceholder />} />
          <Route path="/api-test" element={<ApiTest />} />
          <Route path="/transactions" element={<PlaceholderPage title="Transactions" />} />
          <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
          <Route path="/payments" element={<PlaceholderPage title="Payments" />} />
          <Route path="/reconciliation" element={<PlaceholderPage title="Reconciliation" />} />
          <Route path="/exceptions" element={<PlaceholderPage title="Exceptions" />} />
          <Route path="/agent" element={<PlaceholderPage title="Finance Agent" />} />
          <Route path="/audit-logs" element={<PlaceholderPage title="Audit Logs" />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
