import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { getDashboardOverview } from '../api/dashboard.api';
import { formatCurrency, formatCurrencyCompact, formatDate } from '../utils/formatters';
import { PageContainer, SectionCard } from '../components/dashboard/ShellComponents';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Play,
  RefreshCw,
  GitCompare,
  Database,
  TrendingUp,
  CircleDot,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// ─── Animated counter hook ─────────────────────────────────────────────────
function useCountUp(target: number, duration = 600, enabled = true) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || target === 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, enabled]);

  return value;
}

// ─── Summary Card ─────────────────────────────────────────────────────────
interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  accent?: 'green' | 'red' | 'amber' | 'blue' | 'gray';
  icon: React.ComponentType<{ className?: string }>;
  tooltip?: string;
  isLoading?: boolean;
  onClick?: () => void;
}

const ACCENT_MAP = {
  green: { icon: 'text-emerald-600', value: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  red:   { icon: 'text-red-500',     value: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-100' },
  amber: { icon: 'text-amber-500',   value: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
  blue:  { icon: 'text-blue-500',    value: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
  gray:  { icon: 'text-gray-400',    value: 'text-gray-900',    bg: 'bg-gray-50',    border: 'border-gray-100' },
};

const SummaryCard: React.FC<SummaryCardProps> = ({
  label, value, sub, subColor, accent = 'gray', icon: Icon, tooltip, isLoading, onClick
}) => {
  const [showTip, setShowTip] = useState(false);
  const colors = ACCENT_MAP[accent];

  return (
    <div
      className={`relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 text-left flex flex-col justify-between min-h-[120px] group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      onMouseEnter={() => tooltip && setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">
          {label}
        </span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.bg} ${colors.border} border`}>
          <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
        </div>
      </div>

      {/* Value */}
      {isLoading ? (
        <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
      ) : (
        <span className={`text-[26px] font-black leading-none tracking-tight ${colors.value}`}>
          {value}
        </span>
      )}

      {/* Sub-label */}
      {sub && !isLoading && (
        <span className={`mt-2 text-[10px] font-semibold block ${subColor || 'text-gray-400'}`}>
          {sub}
        </span>
      )}

      {/* Tooltip */}
      {showTip && tooltip && (
        <div className="absolute bottom-full left-0 mb-2 z-20 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-semibold rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
};

// ─── Severity pill ─────────────────────────────────────────────────────────
const SeverityPill: React.FC<{ severity: string }> = ({ severity }) => {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-50 text-red-700 border border-red-100',
    HIGH:     'bg-red-50 text-red-600 border border-red-100',
    MEDIUM:   'bg-amber-50 text-amber-700 border border-amber-100',
    LOW:      'bg-gray-50 text-gray-500 border border-gray-100',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${map[severity] || map.LOW}`}>
      {severity}
    </span>
  );
};

// ─── Status pill ───────────────────────────────────────────────────────────
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    RUNNING:   'bg-blue-50 text-blue-600 border border-blue-100 animate-pulse',
    FAILED:    'bg-red-50 text-red-600 border border-red-100',
    PARTIAL:   'bg-amber-50 text-amber-700 border border-amber-100',
    CANCELLED: 'bg-gray-50 text-gray-500 border border-gray-100',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${map[status] || map.CANCELLED}`}>
      {status}
    </span>
  );
};

// ─── Exception issue formatter ─────────────────────────────────────────────
function formatExceptionIssue(type: string, amount: number): string {
  const abs = Math.abs(amount);
  switch (type) {
    case 'AMOUNT_MISMATCH':   return `Amount differs by ₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'DATE_MISMATCH':     return 'Date differs from expected';
    case 'REFERENCE_MISMATCH': return 'Reference does not match';
    case 'DUPLICATE':         return 'Duplicate entry detected';
    case 'CURRENCY_MISMATCH': return 'Currency mismatch found';
    case 'MISSING_RECORD':    return amount > 0 ? 'Invoice missing in bank statement' : 'Bank transaction missing in invoices';
    default:                  return type.replace(/_/g, ' ').toLowerCase();
  }
}

// ─── Donut center label (recharts custom) ─────────────────────────────────
const DonutCenter: React.FC<{ matchRateText: string }> = ({ matchRateText }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
    <span className="text-[18px] font-black text-gray-900 leading-none">{matchRateText}</span>
    <span className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Match Rate</span>
  </div>
);

// ─── Main Dashboard Component ──────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Live Socket.IO reconciliation progress
  const [activeProgress, setActiveProgress] = useState<{
    percent: number;
    statusText: string;
    processed: number;
    total: number;
    completed?: boolean;
  } | null>(null);

  // Fetch dashboard data, refetch every 10s
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => getDashboardOverview(),
    refetchInterval: 10_000,
  });

  // Socket.IO: live reconciliation progress
  useEffect(() => {
    if (!socket) return;
    const handleProgress = (data: any) => {
      setActiveProgress(data);
      if (data.completed) {
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
        setTimeout(() => setActiveProgress(null), 3000);
      }
    };
    socket.on('reconciliation.progress', handleProgress);
    return () => { socket.off('reconciliation.progress', handleProgress); };
  }, [socket, queryClient]);

  // ─── Derived metrics ─────────────────────────────────────────────────────
  const metrics = overview?.metrics ?? {
    recordsProcessed: 0,
    matchedRecords: 0,
    partiallyMatched: 0,
    unmatched: 0,
    matchRate: 0,
    openExceptions: 0,
    totalTransactionVolume: 0,
    totalInvoiced: 0,
    paymentVolume: 0,
  };

  const recentRuns     = overview?.recentRuns ?? [];
  const exceptionsList = overview?.exceptionsAttention ?? [];

  // Numeric values for animated counters
  const totalRec     = metrics.recordsProcessed;
  const matchedRec   = metrics.matchedRecords;
  const partialRec   = metrics.partiallyMatched ?? 0;
  const unmatchedRec = metrics.unmatched ?? 0;
  const openExc      = metrics.openExceptions;
  const txnVolume    = metrics.totalTransactionVolume;

  // No data gate removed — always show dashboard.
  // When no reconciliation run exists, cards show — but financial totals still show.
  const hasNoRuns = !isLoading && totalRec === 0;

  // Match rate — show "—" when no comparable records exist
  const matchRateText =
    totalRec > 0
      ? `${((matchedRec / totalRec) * 100).toFixed(1)}%`
      : '—';

  const issuesPct =
    totalRec > 0
      ? `${((openExc / totalRec) * 100).toFixed(1)}% of analyzed records`
      : '';

  // Animated counters (count up when data loads)
  const animatedTotal    = useCountUp(totalRec,   700, !isLoading);
  const animatedMatched  = useCountUp(matchedRec, 700, !isLoading);
  const animatedExc      = useCountUp(openExc,    700, !isLoading);

  // Donut chart data — only meaningful when records exist
  const matchedPct  = totalRec > 0 ? Number(((matchedRec / totalRec) * 100).toFixed(1)) : 0;
  const partialPct  = totalRec > 0 ? Number(((partialRec / totalRec) * 100).toFixed(1)) : 0;
  const unmatchPct  = totalRec > 0 ? Number((((unmatchedRec) / totalRec) * 100).toFixed(1)) : 0;

  const chartData = [
    { name: 'Matched',            value: matchedRec,   color: '#10B981', pct: matchedPct  },
    { name: 'Partially Matched',  value: partialRec,   color: '#F59E0B', pct: partialPct  },
    { name: 'Unmatched',          value: unmatchedRec, color: '#EF4444', pct: unmatchPct  },
  ].filter(d => d.value > 0);

  // If no data but we want to show a placeholder ring
  const emptyChart = chartData.length === 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageContainer>

      {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-5 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-black tracking-tight text-gray-900">Finance Overview</h2>
          <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
            Know what matched. Know what changed. Know what needs attention.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Connected
        </span>
      </div>

      {/* ── REAL-TIME PROGRESS BANNER ──────────────────────────────────── */}
      {activeProgress && !activeProgress.completed && (
        <div className="p-4 bg-gray-900 text-white rounded-2xl mb-6 space-y-3 shadow-lg" style={{ animation: 'fadeSlideIn 0.2s ease' }}>
          <div className="flex justify-between items-center text-xs font-extrabold uppercase">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              Processing Reconciliation...
            </span>
            <span className="text-emerald-400">{activeProgress.percent}%</span>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${activeProgress.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
              <span>{activeProgress.statusText}</span>
              <span>{activeProgress.processed.toLocaleString('en-IN')} / {activeProgress.total.toLocaleString('en-IN')} records</span>
            </div>
          </div>
        </div>
      )}

      {/* ── NO RUNS YET — subtle inline banner (not a blocking empty state) ── */}
      {hasNoRuns && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl mb-6 text-xs text-amber-800">
          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="font-semibold">
            No reconciliation run yet. Upload files and run reconciliation to see match rates and exception data.
          </span>
          <button
            onClick={() => navigate('/reconciliation')}
            className="ml-auto text-[10px] font-black text-amber-700 hover:underline whitespace-nowrap cursor-pointer"
          >
            Start now →
          </button>
        </div>
      )}
          {/* ── PRIMARY ACTIONS ─────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 mb-6">
            <button
              id="btn-compare-files"
              onClick={() => navigate('/reconciliation')}
              className="border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Compare Two Files
            </button>
            <button
              id="btn-start-reconciliation"
              onClick={() => navigate('/reconciliation')}
              className="bg-[#2F6F73] hover:bg-[#204c4f] text-white px-5 py-2.5 rounded-xl text-xs font-black transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 fill-white" />
              Start New Reconciliation
            </button>
          </div>

          {/* ── 4 SUMMARY CARDS ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            {/* Card 1: Records Analyzed */}
            <SummaryCard
              label="Records Analyzed"
              value={isLoading ? '—' : animatedTotal.toLocaleString('en-IN')}
              sub={totalRec > 0 ? 'From latest reconciliation run' : undefined}
              accent="gray"
              icon={Database}
              isLoading={isLoading}
            />

            {/* Card 2: Match Rate */}
            <SummaryCard
              label="Match Rate"
              value={isLoading ? '—' : matchRateText}
              sub={
                totalRec > 0
                  ? `${animatedMatched.toLocaleString('en-IN')} of ${totalRec.toLocaleString('en-IN')} records matched`
                  : undefined
              }
              subColor={
                totalRec === 0 ? 'text-gray-400'
                  : Number(matchRateText) >= 90 ? 'text-emerald-600'
                  : Number(matchRateText) >= 70 ? 'text-amber-600'
                  : 'text-red-500'
              }
              accent={
                totalRec === 0 ? 'gray'
                  : parseFloat(matchRateText) >= 90 ? 'green'
                  : parseFloat(matchRateText) >= 70 ? 'amber'
                  : 'red'
              }
              icon={TrendingUp}
              isLoading={isLoading}
            />

            {/* Card 3: Issues Found */}
            <SummaryCard
              label="Issues Found"
              value={isLoading ? '—' : animatedExc.toLocaleString('en-IN')}
              sub={totalRec > 0 && openExc > 0 ? issuesPct : openExc === 0 ? 'No issues — all clear ✓' : undefined}
              subColor={openExc > 0 ? 'text-red-500' : 'text-emerald-600'}
              accent={openExc > 0 ? 'red' : 'green'}
              icon={AlertTriangle}
              isLoading={isLoading}
            />

            {/* Card 4: Transaction Value */}
            <SummaryCard
              label="Transaction Value"
              value={isLoading ? '—' : formatCurrencyCompact(txnVolume)}
              sub={txnVolume > 0 ? 'Hover to see full amount' : undefined}
              subColor="text-gray-400"
              accent="blue"
              icon={CircleDot}
              tooltip={txnVolume > 0 ? `Full amount: ${formatCurrency(txnVolume)}` : undefined}
              isLoading={isLoading}
            />

          </div>

          {/* ── LOWER SECTION: Health + Recent Activity ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Reconciliation Health Donut */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-left flex flex-col lg:col-span-1">
              <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wider block mb-4">
                Reconciliation Health
              </span>

              <div className="relative h-44 flex items-center justify-center">
                {emptyChart ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-32 h-32 rounded-full border-[10px] border-gray-100 flex items-center justify-center">
                      <span className="text-xs text-gray-300 font-bold text-center leading-tight px-2">No data yet</span>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={76}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                        animationBegin={0}
                        animationDuration={600}
                      >
                        {chartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [`${Number(value).toLocaleString('en-IN')} records`, '']}
                        contentStyle={{
                          fontSize: '11px',
                          fontWeight: 700,
                          border: '1px solid #f0f0f0',
                          borderRadius: '10px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}

                {totalRec > 0 && <DonutCenter matchRateText={matchRateText} />}
              </div>

              {/* Legend */}
              <div className="border-t border-gray-50 pt-3 mt-3 space-y-2">
                {[
                  { label: 'Matched',           color: '#10B981', pct: matchedPct,  count: matchedRec  },
                  { label: 'Partially Matched', color: '#F59E0B', pct: partialPct,  count: partialRec  },
                  { label: 'Unmatched',         color: '#EF4444', pct: unmatchPct,  count: unmatchedRec },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center text-xs font-semibold text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="text-gray-900 font-bold tabular-nums">
                      {totalRec > 0 ? `${item.pct}%` : '—'}
                      {totalRec > 0 && item.count > 0 && (
                        <span className="text-gray-400 font-medium ml-1">({item.count.toLocaleString('en-IN')})</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reconciliation Runs */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-left flex flex-col lg:col-span-2">
              <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wider block mb-4">
                Recent Activity
              </span>

              <div className="overflow-x-auto -mx-5 flex-1">
                <table className="min-w-full divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                  <thead>
                    <tr className="bg-gray-50/60 text-[9px] text-gray-400 font-bold uppercase">
                      <th className="py-2.5 px-5 text-left">Batch</th>
                      <th className="text-left">Files</th>
                      <th className="text-left">Records</th>
                      <th className="text-left">Match Rate</th>
                      <th className="text-left">Issues</th>
                      <th className="text-left">Status</th>
                      <th className="text-right py-2.5 px-5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentRuns.slice(0, 5).map((run: any) => (
                      <tr
                        key={run.id}
                        id={`batch-row-${run.id}`}
                        onClick={() => navigate('/reconciliation')}
                        className="hover:bg-gray-50/60 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-5 font-mono text-[10px] font-bold text-gray-900 max-w-[100px]">
                          <span className="truncate block" title={run.id}>
                            {run.id.slice(0, 8).toUpperCase()}…
                          </span>
                        </td>
                        <td className="text-gray-500 font-medium whitespace-nowrap">
                          {run.source
                            ? run.source.replace(/-Source$/i, '').replace(/_/g, ' ')
                            : 'Upload'}
                        </td>
                        <td className="text-gray-900 tabular-nums">
                          {(run.recordsProcessed ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className={`font-black tabular-nums ${
                            run.matchRate >= 90 ? 'text-emerald-600'
                              : run.matchRate >= 70 ? 'text-amber-600'
                              : 'text-red-500'
                          }`}>
                            {run.recordsProcessed > 0
                              ? `${Number(run.matchRate).toFixed(1)}%`
                              : '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`font-black tabular-nums ${run.exceptionsFound > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {(run.exceptionsFound ?? 0).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td><StatusPill status={run.status} /></td>
                        <td className="text-right py-3.5 px-5 text-gray-400 tabular-nums whitespace-nowrap">
                          {formatDate(run.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {recentRuns.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-gray-300 text-xs font-semibold italic">
                          No reconciliation runs yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-50 pt-3 mt-3 text-right">
                <button
                  id="btn-view-all-runs"
                  onClick={() => navigate('/reconciliation')}
                  className="text-[10px] font-black text-[#2F6F73] hover:underline cursor-pointer inline-flex items-center gap-0.5"
                >
                  View All Runs
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

          </div>

          {/* ── NEEDS YOUR ATTENTION ──────────────────────────────────────── */}
          <SectionCard
            title="Needs Your Attention"
            actionText={exceptionsList.length > 0 ? 'View All Exceptions' : undefined}
            onAction={() => navigate('/exceptions')}
          >
            <div className="overflow-x-auto -mx-5 -mb-4">
              <table className="min-w-full divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                <thead>
                  <tr className="bg-gray-50/60 text-[9px] text-gray-400 font-bold uppercase">
                    <th className="py-2.5 px-5 text-left">Transaction</th>
                    <th className="text-left">Issue</th>
                    <th className="text-left">Amount Affected</th>
                    <th className="text-left">Severity</th>
                    <th className="text-left">Status</th>
                    <th className="text-right py-2.5 px-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {exceptionsList.slice(0, 5).map((ex: any, idx: number) => (
                    <tr
                      key={ex.id}
                      id={`exception-row-${ex.id}`}
                      onClick={() => navigate('/exceptions')}
                      className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                      style={{ animation: `fadeSlideIn ${0.1 + idx * 0.05}s ease both` }}
                    >
                      <td className="py-3.5 px-5 font-mono text-[9px] font-black text-gray-800">
                        {ex.id.slice(0, 12).toUpperCase()}…
                      </td>
                      <td className="text-gray-800 font-semibold max-w-[200px]">
                        {formatExceptionIssue(ex.type, ex.amount)}
                      </td>
                      <td className="font-black text-red-500 tabular-nums">
                        {Math.abs(ex.amount) > 0 ? formatCurrency(Math.abs(ex.amount)) : '—'}
                      </td>
                      <td><SeverityPill severity={ex.severity} /></td>
                      <td>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-50 text-red-600 border border-red-100">
                          {ex.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/exceptions'); }}
                          className="text-[10px] font-black text-[#2F6F73] hover:underline cursor-pointer inline-flex items-center gap-0.5"
                        >
                          Investigate
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {exceptionsList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-300 text-xs font-semibold italic">
                        <span className="flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-6 h-6 text-emerald-200" />
                          No open exceptions — everything looks reconciled!
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

      {/* ── Global animation keyframes ──────────────────────────────── */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

    </PageContainer>
  );
}
