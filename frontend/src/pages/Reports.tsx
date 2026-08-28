import { useQuery } from '@tanstack/react-query';
import { getReportMetrics, getReportCharts } from '../api/reports.api';
import { formatCurrency } from '../utils/formatters';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  FileText, 
  CheckCircle2 
} from 'lucide-react';

const COLORS = ['#0048ff', '#f59e0b', '#ef4444', '#10b981'];

export default function ReportsPage() {
  const { data: metricsResponse, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['report-metrics'],
    queryFn: getReportMetrics
  });

  const { data: chartsResponse, isLoading: isLoadingCharts } = useQuery({
    queryKey: ['report-charts'],
    queryFn: getReportCharts
  });

  if (isLoadingMetrics || isLoadingCharts) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#0048ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const metrics = metricsResponse?.data || {};
  const charts = chartsResponse?.data || {};

  return (
    <div className="space-y-6 text-left">
      {/* Overview Banner */}
      <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">Analytics & Reports</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Consolidated financial health and matching statistics</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#eff6ff] border border-blue-100 flex items-center justify-center text-[#0048ff]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Success Rate</span>
            <span className="text-sm font-extrabold text-gray-900 mt-0.5 block">
              {metrics.successRate?.toFixed(2) || '100.00'}%
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Invoice Collection</span>
            <span className="text-sm font-extrabold text-green-600 mt-0.5 block">
              {metrics.collectionRate?.toFixed(2) || '0.00'}%
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Outstanding Due</span>
            <span className="text-sm font-extrabold text-orange-600 mt-0.5 block">
              {formatCurrency(metrics.totalInvoiced - metrics.paidInvoiced || 0)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Open Exceptions</span>
            <span className="text-sm font-extrabold text-red-600 mt-0.5 block">
              {metrics.unresolvedExceptions || 0} issues
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Transaction Volume Monthly */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Monthly Transaction Volume</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Corporate billing and processing values over last 6 months</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.transactionVolumeChart}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0048ff" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0048ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={9} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip formatter={(value) => [`₹${value}`, 'Volume']} labelClassName="text-xs font-bold" />
                <Area type="monotone" dataKey="Volume" stroke="#0048ff" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Settlement Comparison */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Settlement Payout Audits</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Comparison of expected gateway settlements vs actual settled transfers</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.settlementComparisonChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={9} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip formatter={(value) => [`₹${value}`]} labelClassName="text-xs font-bold" />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Expected" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Settled" fill="#0048ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Match Rates over Runs */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Deterministic Matching Performance</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Match rate percentage metrics across consecutive reconciliation audit runs</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.reconciliationRateChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={9} domain={[70, 100]} tickFormatter={(val) => `${val}%`} />
                <Tooltip formatter={(value) => [`${value}%`, 'Match Rate']} labelClassName="text-xs font-bold" />
                <Line type="monotone" dataKey="Match Rate (%)" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Exceptions Pie */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Exceptions Discrepancy Share</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Discrepancy share ratios mapped by exception classification enums</p>
          </div>
          <div className="h-64 flex justify-center items-center">
            {charts.exceptionBreakdownChart?.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No exceptions logged in this period.</p>
            ) : (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.exceptionBreakdownChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {charts.exceptionBreakdownChart.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} exceptions`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2.5 text-[10px] font-bold text-gray-500">
                  {charts.exceptionBreakdownChart.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span>{entry.name}: {entry.value} items</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
