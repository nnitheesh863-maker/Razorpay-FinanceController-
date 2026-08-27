import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import Guest Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// Import Ledgerly Pages
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/Transactions';
import RecurringPage from './pages/Recurring';
import SubscriptionsPage from './pages/Subscriptions';
import BudgetsPage from './pages/Budgets';
import GoalsPage from './pages/Goals';
import DocumentsPage from './pages/Documents';
import RulesPage from './pages/Rules';
import SettingsPage from './pages/Settings';

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

          {/* Protected Ledgerly Dashboard Pages */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/recurring" element={<RecurringPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/budgets" element={<BudgetsPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
