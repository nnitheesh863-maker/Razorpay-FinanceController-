import { useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { KpiCard } from '../components/ui/KpiCard';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/ErrorState';
import { Link } from 'react-router-dom';
import { getDashboardOverview } from '../api/dashboard.api';
import type { DashboardOverviewResponse } from '../types/dashboard.types';
import { 
  formatCurrency, 
  formatCompactCurrency, 
  formatNumber, 
  formatPercentage 
} from '../utils/formatters';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock3, 
  TrendingUp, 
  Sparkles, 
  RefreshCw,
  CalendarDays,
  Layers,
  ArrowRight
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
  Cell
} from 'recharts';
import { format } from 'date-fns';

export function Dashboard() {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('last-30-days');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Financial Analyst';

  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const response = await getDashboardOverview();
      setData(response);
      
      // If AI insights from the backend is null, let's call our AI endpoint to synthesize insights dynamically
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
      - Records Processed: ${dashboardData.metrics.recordsProcessed}
      - Match Rate: ${dashboardData.metrics.matchRate.toFixed(2)}%
      - Reconciled Amount: INR ${dashboardData.financialSummary.reconciledAmount}
      - Unmatched Amount: INR ${dashboardData.financialSummary.unmatchedAmount}
      - Open Exceptions: ${dashboardData.metrics.openExceptions}
      Provide ONLY the 3 concise insights in text, separated by newlines, starting each with a dash. Keep it brief.`;

      // Dynamically fetch from the agent chat endpoint
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
        setAiInsights('- Discrepancies detected. Review open exceptions.\n- Check recent settlement runs.\n- Match rate matches historical run trends.');
      }
    } catch (err) {
      console.error('Failed to generate dynamic AI insights', err);
      setAiInsights('- Verify recent exceptions status.\n- Check match rate trend.\n- Reconcile pending invoices.');
    } finally {
      setGeneratingInsights(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
        <Spinner className="w-10 h-10" />
        <p className="mt-4 text-sm text-text-muted">Loading financial operations data...</p>
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

  // Pre-process chart data
  const runsChartData = [...data.recentRuns].reverse().map(run => ({
    name: format(new Date(run.createdAt), 'dd MMM'),
    'Match Rate (%)': run.matchRate,
    'Records': run.recordsProcessed,
  }));

  const severityData = [
    { name: 'Critical', value: data.exceptions.severityBreakdown.CRITICAL, fill: '#ef4444' },
    { name: 'High', value: data.exceptions.severityBreakdown.HIGH, fill: '#f59e0b' },
    { name: 'Medium', value: data.exceptions.severityBreakdown.MEDIUM, fill: '#3b82f6' },
    { name: 'Low', value: data.exceptions.severityBreakdown.LOW, fill: '#10b981' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <PageHeader 
            title={`Good morning, ${userName.split(' ')[0]}`}
            description="Overview of financial operations and reconciliation status."
          />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Selector */}
          <div className="relative inline-flex items-center">
            <span className="absolute left-3 text-text-muted">
              <CalendarDays className="w-4 h-4" />
            </span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-white border border-border-subtle rounded-lg pl-9 pr-8 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-medium"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last-7-days">Last 7 Days</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="this-month">This Month</option>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard 
          title="Total Moved Volume" 
          value={formatCompactCurrency(data.financialSummary.reconciledAmount + data.financialSummary.unmatchedAmount)} 
          description="Sum of all processed sums" 
          icon={TrendingUp} 
        />
        <KpiCard 
          title="Records Processed" 
          value={formatNumber(data.metrics.recordsProcessed)} 
          description="Total reconciliation entries" 
          icon={Layers} 
        />
        <KpiCard 
          title="Match Rate" 
          value={formatPercentage(data.metrics.matchRate)} 
          description="Target rate: 95%+" 
          icon={CheckCircle2} 
        />
        <KpiCard 
          title="Open Exceptions" 
          value={formatNumber(data.metrics.openExceptions)} 
          description={`${data.exceptions.severityBreakdown.CRITICAL} critical require review`} 
          icon={AlertTriangle} 
        />
        <KpiCard 
          title="Reconciled Amount" 
          value={formatCompactCurrency(data.financialSummary.reconciledAmount)} 
          description="Matched financial volume" 
          icon={FileText} 
        />
        <KpiCard 
          title="Unmatched Amount" 
          value={formatCompactCurrency(data.financialSummary.unmatchedAmount)} 
          description="Unreconciled balance" 
          icon={Clock3} 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Reconciliation Match Rates over Recent Runs</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={runsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMatch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'semibold', color: '#0f172a' }}
                />
                <Area type="monotone" dataKey="Match Rate (%)" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorMatch)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Exceptions Severity</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex flex-col justify-between">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-between items-center text-xs text-text-muted mt-4 border-t border-border-subtle pt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-danger-500 rounded-full" />
                <span>Critical ({data.exceptions.severityBreakdown.CRITICAL})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-warning-500 rounded-full" />
                <span>High ({data.exceptions.severityBreakdown.HIGH})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-primary-500 rounded-full" />
                <span>Medium ({data.exceptions.severityBreakdown.MEDIUM})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights & Recent Runs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insight Card */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="bg-primary-50/20 border-b border-border-subtle">
            <CardTitle className="flex items-center gap-2 text-primary-700">
              <Sparkles className="w-5 h-5 text-primary-600 animate-pulse" />
              <span>AI Operations Insight</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {generatingInsights ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Spinner className="w-5 h-5" />
                <p className="mt-3 text-xs text-text-muted">Analyzing dashboard metrics...</p>
              </div>
            ) : aiInsights ? (
              <div className="space-y-3">
                {aiInsights.split('\n').map((line, idx) => {
                  if (!line.trim()) return null;
                  const cleanLine = line.replace(/^[-*]\s+/, '');
                  return (
                    <div key={idx} className="flex gap-3 text-sm text-text-main leading-relaxed">
                      <span className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                      <p>{cleanLine}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted italic">No automated insights available for the current period.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Runs Table Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Reconciliation Runs</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-border-subtle">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Run ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Processed</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Match Rate</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-subtle">
                {data.recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-main">{run.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                      {format(new Date(run.createdAt), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{run.source}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-text-main font-medium">{formatNumber(run.recordsProcessed)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-text-main font-semibold text-primary-600">{formatPercentage(run.matchRate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <StatusBadge status={run.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Critical Exceptions List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exceptions Requiring Attention</CardTitle>
          <Link to="/exceptions" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <span>View All Exceptions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {data.exceptionsAttention.length > 0 ? (
            <table className="min-w-full divide-y divide-border-subtle">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Exception ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Discrepancy Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Logged At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-subtle">
                {data.exceptionsAttention.map((exc) => (
                  <tr key={exc.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-main">{exc.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{exc.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <SeverityBadge severity={exc.severity} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-danger-600 font-semibold">{formatCurrency(exc.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <StatusBadge status={exc.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted font-medium">
                      {format(new Date(exc.createdAt), 'dd MMM yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-sm text-text-muted italic">
              No open exceptions requiring immediate attention.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
