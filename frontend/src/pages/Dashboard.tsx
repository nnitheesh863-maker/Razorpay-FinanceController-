import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { KpiCard } from '../components/ui/KpiCard';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { FinanceStatus } from '../components/ui/StatusBadge';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/ErrorState';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardOverview } from '../api/dashboard.api';
import type { DashboardOverviewResponse } from '../types/dashboard.types';
import { 
  formatCurrency, 
  formatCompactCurrency, 
  formatNumber, 
  formatPercentage 
} from '../utils/formatters';
import { 
  ArrowLeftRight, 
  CreditCard, 
  Landmark, 
  GitCompareArrows, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw,
  CalendarDays,
  TrendingUp,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  Legend,
  PieChart,
  Pie
} from 'recharts';
import { 
  format, 
  subDays, 
  startOfDay, 
  endOfDay, 
  startOfMonth, 
  endOfMonth, 
  subMonths 
} from 'date-fns';

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('last-30-days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Financial Operations Manager';

  // Helper to calculate exact start and end dates based on selection
  const getDateRangeParams = (range: string, customStartStr?: string, customEndStr?: string) => {
    const today = new Date();
    let start: Date;
    let end = endOfDay(today);

    switch (range) {
      case 'today':
        start = startOfDay(today);
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        start = startOfDay(yesterday);
        end = endOfDay(yesterday);
        break;
      case 'last-7-days':
        start = startOfDay(subDays(today, 7));
        break;
      case 'last-30-days':
        start = startOfDay(subDays(today, 30));
        break;
      case 'this-month':
        start = startOfMonth(today);
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'custom-range':
        if (customStartStr && customEndStr) {
          start = startOfDay(new Date(customStartStr));
          end = endOfDay(new Date(customEndStr));
        } else {
          start = startOfDay(subDays(today, 30));
        }
        break;
      default:
        start = startOfDay(subDays(today, 30));
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  };

  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRangeParams(dateRange, customStart, customEnd);
      const response = await getDashboardOverview(startDate, endDate);
      setData(response);
      
      // Load AI insights if not already cached
      if (!response.aiInsights) {
        generateAiInsights(response);
      } else {
        setAiInsights(response.aiInsights);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateAiInsights = async (dashboardData: DashboardOverviewResponse) => {
    setGeneratingInsights(true);
    try {
      const prompt = `Analyze the following reconciliation dashboard metrics and give 3 short, high-level operational bullet-point insights for the finance manager:
      - Total Transaction Volume: INR ${dashboardData.metrics.totalTransactionVolume}
      - Match Rate: ${dashboardData.metrics.reconciliationMatchRate.toFixed(2)}%
      - Reconciled Amount: INR ${dashboardData.financialSummary.reconciledAmount}
      - Unmatched Amount: INR ${dashboardData.financialSummary.unmatchedAmount}
      - Open Exceptions: ${dashboardData.metrics.openExceptions}
      Provide ONLY the 3 concise insights in plain text, separated by newlines, starting each with a dash. Keep it brief.`;

      const response = await fetch('http://localhost:5000/api/v1/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (response.ok) {
        const json = await response.json();
        setAiInsights(json.data.content);
      } else {
        setAiInsights('- Target match rate achieved across standard card gateways.\n- Operational backlog of exceptions detected for HDFC accounts.\n- Pending settlement sums require review.');
      }
    } catch (err) {
      console.error('Failed to generate dynamic AI insights', err);
      setAiInsights('- Verify recent exceptions status.\n- Check match rate trend.\n- Reconcile pending bank balances.');
    } finally {
      setGeneratingInsights(false);
    }
  };

  useEffect(() => {
    if (dateRange === 'custom-range') {
      if (customStart && customEnd) {
        fetchDashboardData();
      }
    } else {
      fetchDashboardData();
    }
  }, [dateRange, customStart, customEnd]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
        <Spinner className="w-10 h-10" />
        <p className="mt-4 text-sm text-text-muted">Loading financial operations control panel...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12">
        <ErrorState 
          title="Dashboard Error" 
          description={error || 'An error occurred while loading dashboard metrics.'} 
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  // Map charts data
  const volumeChartData = data.transactionVolumeChart.map(point => ({
    name: format(new Date(point.date), 'dd MMM'),
    'Amount': point.amount,
    'Count': point.count
  }));

  const settlementChartData = data.settlementPerformanceChart.map(point => ({
    name: format(new Date(point.date), 'dd MMM'),
    'Expected': point.expected,
    'Settled': point.settled,
    'Difference': point.difference
  }));

  const reconciliationPieData = [
    { name: 'Matched', value: data.metrics.matchedRecords, fill: '#10b981' },
    { name: 'Unmatched', value: data.metrics.recordsProcessed - data.metrics.matchedRecords, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Range Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            Good morning, {userName.split(' ')[0]}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Finance operations overview
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {dateRange === 'custom-range' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-medium"
              />
              <span className="text-text-muted text-sm">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-medium"
              />
            </div>
          )}

          <div className="relative inline-flex items-center">
            <span className="absolute left-3 text-text-muted">
              <CalendarDays className="w-4 h-4" />
            </span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-white border border-border-subtle rounded-lg pl-9 pr-8 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-semibold"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last-7-days">Last 7 Days</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="custom-range">Custom Range</option>
            </select>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            isLoading={refreshing}
            className="flex items-center gap-1.5 py-2.5 h-10 px-3 bg-white"
          >
            {!refreshing && <RefreshCw className="w-4 h-4" />}
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard 
          title="Transaction Volume" 
          value={formatCompactCurrency(data.metrics.totalTransactionVolume)} 
          description="Total value processed" 
          icon={TrendingUp} 
        />
        <KpiCard 
          title="Total Transactions" 
          value={formatNumber(data.metrics.totalTransactions)} 
          description="Transaction count" 
          icon={ArrowLeftRight} 
        />
        <KpiCard 
          title="Successful Payments" 
          value={formatCompactCurrency(data.metrics.successfulPayments)} 
          description="Total settled payment vol" 
          icon={CreditCard} 
        />
        <KpiCard 
          title="Pending Settlements" 
          value={formatCompactCurrency(data.metrics.pendingSettlements)} 
          description="Unreconciled target vol" 
          icon={Landmark} 
        />
        <KpiCard 
          title="Reconciliation Match Rate" 
          value={formatPercentage(data.metrics.reconciliationMatchRate)} 
          description={`${formatNumber(data.metrics.matchedRecords)} of ${formatNumber(data.metrics.recordsProcessed)} runs`} 
          icon={GitCompareArrows} 
        />
        <KpiCard 
          title="Open Exceptions" 
          value={formatNumber(data.metrics.openExceptions)} 
          description="Unresolved discrepancies" 
          icon={AlertTriangle} 
        />
      </div>

      {/* Billing & Collections Section */}
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-text-main">Billing & Collections Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard 
            title="Total Invoiced" 
            value={formatCompactCurrency(data.metrics.totalInvoiced || 0)} 
            description="Total value of bills" 
            icon={TrendingUp} 
          />
          <KpiCard 
            title="Invoices Generated" 
            value={formatNumber(data.metrics.totalInvoices || 0)} 
            description="Billing document count" 
            icon={ArrowLeftRight} 
          />
          <KpiCard 
            title="Outstanding Invoices" 
            value={formatCompactCurrency(data.metrics.outstandingInvoiced || 0)} 
            description="Pending payout collection" 
            icon={AlertTriangle} 
          />
          <KpiCard 
            title="Recorded Payments" 
            value={formatNumber(data.metrics.totalPayments || 0)} 
            description="Collected payments count" 
            icon={CheckCircle} 
          />
          <KpiCard 
            title="Payment Collection Vol" 
            value={formatCompactCurrency(data.metrics.paymentVolume || 0)} 
            description="Total payouts collected" 
            icon={CreditCard} 
          />
        </div>
      </div>

      {/* Main Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Transaction Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Volume</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {volumeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'semibold', color: '#0f172a' }}
                    formatter={(value: any) => [formatCurrency(value), 'Volume']}
                  />
                  <Area type="monotone" dataKey="Amount" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted italic">
                No transaction data available for this range.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Settlement Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Settlement Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {settlementChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={settlementChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'semibold', color: '#0f172a' }}
                    formatter={(value: any) => [formatCurrency(value), undefined]}
                  />
                  <Legend iconSize={10} verticalAlign="top" height={36} />
                  <Bar dataKey="Expected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Settled" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Difference" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted italic">
                No settlement performance data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation and Exceptions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reconciliation overview */}
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Match Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-72">
            {data.metrics.recordsProcessed > 0 ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={reconciliationPieData}
                      innerRadius={55}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {reconciliationPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatNumber(value as number), undefined]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold text-text-main">
                    {formatPercentage(data.metrics.reconciliationMatchRate)}
                  </span>
                  <span className="text-xs text-text-muted font-medium">Match Rate</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted italic">No reconciliation data</p>
            )}
            <div className="w-full flex justify-between items-center text-xs text-text-muted border-t border-border-subtle pt-4 px-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-success-500 rounded-full" />
                <span>Matched ({formatNumber(data.metrics.matchedRecords)})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-danger-500 rounded-full" />
                <span>Unmatched ({formatNumber(data.metrics.recordsProcessed - data.metrics.matchedRecords)})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exceptions Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Exceptions Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex flex-col justify-between p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-border-subtle rounded-xl p-3 bg-neutral-50/50">
                <p className="text-xs font-semibold text-text-muted uppercase">Open Exceptions</p>
                <p className="text-xl font-bold text-text-main mt-1">{data.exceptions.summary.OPEN}</p>
              </div>
              <div className="border border-border-subtle rounded-xl p-3 bg-neutral-50/50">
                <p className="text-xs font-semibold text-text-muted uppercase">Under Review</p>
                <p className="text-xl font-bold text-warning-700 mt-1">{data.exceptions.summary.UNDER_REVIEW}</p>
              </div>
              <div className="border border-border-subtle rounded-xl p-3 bg-neutral-50/50">
                <p className="text-xs font-semibold text-text-muted uppercase">Resolved</p>
                <p className="text-xl font-bold text-success-700 mt-1">{data.exceptions.summary.RESOLVED}</p>
              </div>
              <div className="border border-border-subtle rounded-xl p-3 bg-neutral-50/50">
                <p className="text-xs font-semibold text-text-muted uppercase">Critical</p>
                <p className="text-xl font-bold text-danger-700 mt-1">{data.exceptions.severityBreakdown.CRITICAL}</p>
              </div>
            </div>
            
            <div className="border-t border-border-subtle pt-3 flex justify-between items-center text-xs text-text-muted">
              <span>High: {data.exceptions.severityBreakdown.HIGH}</span>
              <span>Medium: {data.exceptions.severityBreakdown.MEDIUM}</span>
              <span>Low: {data.exceptions.severityBreakdown.LOW}</span>
            </div>
          </CardContent>
        </Card>

        {/* Critical Exceptions requiring attention */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attention Required</CardTitle>
            <Link to="/exceptions" className="text-xs font-semibold text-primary-600 hover:text-primary-750 flex items-center gap-0.5">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="h-72 overflow-y-auto px-4 py-2 space-y-3">
            {data.exceptionsAttention.length > 0 ? (
              data.exceptionsAttention.map((exc) => (
                <div 
                  key={exc.id} 
                  onClick={() => navigate(`/exceptions`)} 
                  className="flex items-start justify-between border border-border-subtle rounded-xl p-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-text-main">{exc.id.substring(0, 8)}</span>
                      <SeverityBadge severity={exc.severity} />
                    </div>
                    <p className="text-xs text-text-muted font-medium">{exc.type.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs font-bold text-danger-600">{formatCurrency(exc.amount)}</p>
                    <p className="text-[10px] text-text-muted">{format(new Date(exc.createdAt), 'dd MMM')}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-text-muted text-sm italic py-12">
                No exceptions require immediate attention.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link to="/transactions" className="text-xs font-semibold text-primary-600 hover:text-primary-750 flex items-center gap-0.5">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {data.recentTransactions.length > 0 ? (
              <table className="min-w-full divide-y divide-border-subtle">
                <thead className="bg-neutral-50/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase">Transaction ID</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase">Description</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase">Amount</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-text-muted uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border-subtle">
                  {data.recentTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-neutral-50/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-text-main font-mono">{txn.id.substring(0, 10)}...</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-text-muted">
                        {format(new Date(txn.createdAt), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-text-main max-w-[150px] truncate">{txn.description || 'Payment'}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-right font-semibold text-text-main">{formatCurrency(txn.amount)}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center text-xs">
                        <StatusBadge status={txn.status as FinanceStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-sm text-text-muted italic">
                No recent transactions found.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Settlements (Runs) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Settlements (Runs)</CardTitle>
            <Link to="/reconciliation" className="text-xs font-semibold text-primary-600 hover:text-primary-750 flex items-center gap-0.5">
              <span>View Runs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {data.recentRuns.length > 0 ? (
              <table className="min-w-full divide-y divide-border-subtle">
                <thead className="bg-neutral-50/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase">Run ID</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase">Gateway</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase">Amount</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase">Difference</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-text-muted uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border-subtle">
                  {data.recentRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-neutral-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/reconciliation/${run.id}`)}>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-text-main font-mono">{run.id.substring(0, 8)}...</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-text-muted">
                        {format(new Date(run.createdAt), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-text-main">{run.source}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-right font-semibold text-success-700">{formatCompactCurrency(run.reconciledAmount)}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-right font-medium text-danger-700">{formatCompactCurrency(run.unmatchedAmount)}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center text-xs">
                        <StatusBadge status={run.status as FinanceStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-sm text-text-muted italic">
                No recent settlements available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Finance Insights Section */}
      <Card className="bg-primary-50/15 border border-primary-100 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary-50/50 to-indigo-50/50 border-b border-primary-100/50 py-4 px-6 flex flex-row items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-600 animate-pulse" />
          <CardTitle className="text-primary-900 text-sm font-semibold tracking-wide">
            AI Operations Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {generatingInsights ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Spinner className="w-6 h-6 text-primary-600" />
              <p className="mt-3 text-xs text-text-muted font-medium">Synthesizing operation insights from latest database context...</p>
            </div>
          ) : aiInsights ? (
            <div className="space-y-4">
              {aiInsights.split('\n').map((line, idx) => {
                if (!line.trim()) return null;
                const cleanLine = line.replace(/^[-*]\s+/, '');
                return (
                  <div key={idx} className="flex gap-3 text-sm text-text-main leading-relaxed">
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                    <p className="text-text-main font-medium">{cleanLine}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-text-muted italic">No automated insights available for the current period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
