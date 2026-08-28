import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Guest Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// Operational Finance Controller Pages
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/Transactions';
import InvoicesPage from './pages/Invoices';
import PaymentsPage from './pages/Payments';
import SettlementsPage from './pages/Settlements';
import ReconciliationPage from './pages/Reconciliation';
import ExceptionsPage from './pages/Exceptions';
import AgentPage from './pages/Agent';
import ReportsPage from './pages/Reports';
import ImportsPage from './pages/Imports';
import AuditLogsPage from './pages/AuditLogs';
import SettingsPage from './pages/Settings';
import RecurringPage from './pages/Recurring';
import SubscriptionsPage from './pages/Subscriptions';
import BudgetsPage from './pages/Budgets';
import GoalsPage from './pages/Goals';
import DocumentsPage from './pages/Documents';
import RulesPage from './pages/Rules';

// PrivateRoute Guard (Check authentication token)
function PrivateRoute() {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

// PublicOnlyRoute Guard (for guest login/register screens)
function PublicOnlyRoute() {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<Landing />} />

          {/* Guest Only Routes */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Protected Finance Controller Dashboard Pages */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/settlements" element={<SettlementsPage />} />
              <Route path="/reconciliation" element={<ReconciliationPage />} />
              <Route path="/exceptions" element={<ExceptionsPage />} />
              <Route path="/agent" element={<AgentPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/imports" element={<ImportsPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/recurring" element={<RecurringPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/budgets" element={<BudgetsPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/rules" element={<RulesPage />} />
            </Route>
          </Route>

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
