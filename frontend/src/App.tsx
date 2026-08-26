import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PageHeader } from './components/ui/PageHeader';

// Import Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Reconciliation } from './pages/Reconciliation';
import { ReconciliationRuns } from './pages/ReconciliationRuns';
import { ReconciliationDetail } from './pages/ReconciliationDetail';
import ExceptionsPage from './pages/ExceptionsPage';
import { Agent } from './pages/Agent';
import { ApiTest } from './pages/ApiTest';

// PrivateRoute Guard
function PrivateRoute() {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

// PublicOnlyRoute Guard (for login, register, landing etc.)
function PublicOnlyRoute() {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

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
        {/* Public Landing Page */}
        <Route path="/" element={<Landing />} />

        {/* Guest Only Routes */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/api-test" element={<ApiTest />} />
            <Route path="/transactions" element={<PlaceholderPage title="Transactions" />} />
            <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
            <Route path="/payments" element={<PlaceholderPage title="Payments" />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/reconciliation/runs" element={<ReconciliationRuns />} />
            <Route path="/reconciliation/:id" element={<ReconciliationDetail />} />
            <Route path="/reconciliation/runs/:id" element={<PlaceholderPage title="Run Detail" />} />
            <Route path="/exceptions" element={<ExceptionsPage />} />
            <Route path="/agent" element={<Agent />} />
            <Route path="/audit-logs" element={<PlaceholderPage title="Audit Logs" />} />
          </Route>
        </Route>

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
