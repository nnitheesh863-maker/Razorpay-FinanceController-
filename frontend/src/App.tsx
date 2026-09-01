import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

// Guest Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// Operational Finance Controller Pages
import Dashboard from './pages/Dashboard';
import DataCenterPage from './pages/DataCenter';
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
import CashIntelligencePage from './pages/CashIntelligence';
import ControlScorePage from './pages/ControlScore';
import AnalyticsPage from './pages/Analytics';
import DemoPage from './pages/Demo';
import { SocketProvider } from './context/SocketContext';

// Admin Pages
import AdminAuth from './pages/admin/AdminAuth';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPlaceholder from './pages/admin/AdminPlaceholder';

// PrivateRoute Guard (Check authentication token via AuthContext)
function PrivateRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800"></div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// PublicOnlyRoute Guard (for guest login/register screens)
function PublicOnlyRoute() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

// AdminOnlyRoute Guard (Ensures only ADMIN role can access)
function AdminOnlyRoute() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1726] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F6F73]"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Landing Page */}
              <Route path="/" element={<Landing />} />

              {/* Guest Only Routes */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/admin/login" element={<AdminAuth />} />
                <Route path="/admin/register" element={<AdminAuth />} />
              </Route>

              {/* Protected Finance Controller Dashboard Pages */}
              <Route element={<PrivateRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/data-center" element={<DataCenterPage />} />
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
                  <Route path="/cash-intelligence" element={<CashIntelligencePage />} />
                  <Route path="/control-score" element={<ControlScorePage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/demo" element={<DemoPage />} />
                </Route>

                {/* Admin Control Portal */}
                <Route element={<AdminOnlyRoute />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="users" element={<AdminPlaceholder />} />
                    <Route path="reconciliation-runs" element={<AdminPlaceholder />} />
                    <Route path="exceptions" element={<AdminPlaceholder />} />
                    <Route path="documents" element={<AdminPlaceholder />} />
                    <Route path="razorpay" element={<AdminPlaceholder />} />
                    <Route path="ai-activity" element={<AdminPlaceholder />} />
                    <Route path="voice-ai" element={<AdminPlaceholder />} />
                    <Route path="audit-logs" element={<AdminPlaceholder />} />
                    <Route path="system-health" element={<AdminPlaceholder />} />
                    <Route path="settings" element={<AdminPlaceholder />} />
                  </Route>
                </Route>
              </Route>

              {/* Redirect unknown routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
