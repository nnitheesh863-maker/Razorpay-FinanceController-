import { useQuery } from '@tanstack/react-query';
import { getAdminDashboard } from '../../api/admin.api';
import { Loader2, Users, PlayCircle, Database, AlertCircle, Activity, Sparkles, CreditCard, TrendingUp, TrendingDown, ArrowRight, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['adminDashboardMetrics'],
    queryFn: getAdminDashboard,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-[#2F6F73]">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Dashboard...</span>
      </div>
    );
  }

  if (error || !response?.success) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Failed to load admin metrics. Check backend connection.
      </div>
    );
  }

  const { 
    metrics, 
    whoAnalyzedWhat, 
    reconciliationHealth, 
    aiPerformance, 
    razorpayStatus, 
    recentRuns,
    exceptionOverview
  } = response.data;

  // Custom SVG Sparkline for Match Rate Trend
  const Sparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length === 0) return null;
    const min = Math.min(...data) - 5;
    const max = Math.max(...data) + 5;
    const range = max - min;
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (((val - min) / range) * 100);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox="0 0 100 100" className="w-full h-24 overflow-visible preserve-3d" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="#2F6F73"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.map((val, i) => (
          <circle
            key={i}
            cx={(i / (data.length - 1)) * 100}
            cy={100 - (((val - min) / range) * 100)}
            r="4"
            fill="white"
            stroke="#2F6F73"
            strokeWidth="2"
          />
        ))}
      </svg>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. TOP METRICS ROW (5 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'TOTAL USERS', value: metrics.users, sub: '↑ 4 this month' },
          { label: 'RECONCILIATION RUNS', value: metrics.runs, sub: '↑ 18 this week' },
          { label: 'RECORDS ANALYZED', value: metrics.recordsAnalyzed.toLocaleString(), sub: 'Across all sources' },
          { label: 'MATCH RATE', value: metrics.matchRate, sub: 'Target: 95%' },
          { label: 'OPEN EXCEPTIONS', value: metrics.openExceptions, sub: `${metrics.exceptionsValue} affected` },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-[#E4E7EC] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</span>
            <div className="mt-3">
              <div className="text-2xl font-black text-[#0B1726] tracking-tight">{stat.value}</div>
              <div className="text-[10px] font-bold text-gray-400 mt-1">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. MIDDLE ROW: HEALTH & AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RECONCILIATION HEALTH TREND */}
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2F6F73]" />
              RECONCILIATION HEALTH
            </h3>
            <div className="text-right">
              <div className="text-xl font-black text-[#0B1726]">{reconciliationHealth.matchRate}</div>
              <div className="text-[10px] font-bold text-gray-400">Target: {reconciliationHealth.target}</div>
            </div>
          </div>
          
          <div className="mt-4 px-2">
            <Sparkline data={reconciliationHealth.trend || [80, 85, 90, 85, 94]} />
            <div className="flex justify-between mt-4 text-[9px] font-bold text-gray-400">
              <span>R1</span><span>R2</span><span>R3</span><span>R4</span><span>R5</span>
            </div>
          </div>
        </div>

        {/* AI PERFORMANCE */}
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-sm">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            AI PERFORMANCE
          </h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-600">AI Suggestions</span>
                <span className="font-black text-[#0B1726]">{aiPerformance.suggestions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-600">Human Confirmed</span>
                <span className="font-black text-emerald-600">{aiPerformance.humanConfirmed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-600">Human Rejected</span>
                <span className="font-black text-red-500">{aiPerformance.humanRejected.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="space-y-4 border-l border-gray-100 pl-6">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">AI Accuracy</div>
                <div className="text-xl font-black text-purple-700">{aiPerformance.accuracy}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Auto-resolution</div>
                <div className="text-sm font-black text-[#0B1726]">{aiPerformance.autoResolution}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Avg Confidence</div>
                <div className="text-sm font-black text-[#0B1726]">{aiPerformance.avgConfidence}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE ROW 2: WHO ANALYZED & RECENT RUNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WHO ANALYZED DATA */}
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-sm lg:col-span-1">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">WHO ANALYZED DATA?</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] text-gray-400 font-bold uppercase border-b border-gray-100">
                <tr>
                  <th className="pb-2">User</th>
                  <th className="pb-2 text-right">Runs</th>
                  <th className="pb-2 text-right">Records</th>
                  <th className="pb-2 text-right">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {whoAnalyzedWhat.slice(0, 4).map((u: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2 text-xs font-bold text-[#0B1726]">{u.userName}</td>
                    <td className="py-2 text-xs font-bold text-gray-600 text-right">{u.runs}</td>
                    <td className="py-2 text-xs font-bold text-gray-600 text-right">{u.records.toLocaleString()}</td>
                    <td className="py-2 text-xs font-black text-[#2F6F73] text-right">{u.matchRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECENT RECONCILIATION RUNS */}
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">RECENT RUNS</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[9px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="pb-2">Run</th>
                    <th className="pb-2">User</th>
                    <th className="pb-2 text-right">Records</th>
                    <th className="pb-2 text-right">Matched</th>
                    <th className="pb-2 text-right">Exceptions</th>
                    <th className="pb-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentRuns.map((run: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2.5 font-mono text-[10px] font-bold text-gray-500">{run.id}</td>
                      <td className="py-2.5 text-xs font-bold text-[#0B1726]">{run.userName}</td>
                      <td className="py-2.5 text-xs font-bold text-gray-600 text-right">{run.records}</td>
                      <td className="py-2.5 text-xs font-bold text-emerald-600 text-right">{run.matched}</td>
                      <td className="py-2.5 text-xs font-bold text-red-500 text-right">{run.exceptions}</td>
                      <td className="py-2.5 text-xs font-black text-[#2F6F73] text-right">{run.matchRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button className="mt-4 text-xs font-bold text-[#2F6F73] hover:text-[#1a3d3f] flex items-center gap-1">
            View All Runs <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>

      {/* 4. BOTTOM ROW: RAZORPAY & EXCEPTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RAZORPAY STATUS */}
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              RAZORPAY
            </h3>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[9px] font-black uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {razorpayStatus.status}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400">Last Sync</div>
                <div className="text-xs font-bold text-[#0B1726]">{razorpayStatus.lastSync}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400">Payments</div>
                <div className="text-lg font-black text-[#0B1726]">{razorpayStatus.payments.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400">Settlements</div>
                <div className="text-lg font-black text-[#0B1726]">{razorpayStatus.settlements.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="space-y-4 border-l border-gray-100 pl-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400">Matched</div>
                <div className="text-sm font-black text-emerald-600">{razorpayStatus.matched.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400">Exceptions</div>
                <div className="text-sm font-black text-red-500">{razorpayStatus.exceptions.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400">API Health</div>
                <div className="text-sm font-black text-blue-600">{razorpayStatus.apiHealth}</div>
              </div>
            </div>
          </div>
        </div>

        {/* EXCEPTION OVERVIEW */}
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-sm">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            EXCEPTIONS
          </h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Critical</span>
                <span className="font-black text-red-600">{exceptionOverview.critical}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> High</span>
                <span className="font-black text-orange-600">{exceptionOverview.high}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Medium</span>
                <span className="font-black text-yellow-600">{exceptionOverview.medium}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Low</span>
                <span className="font-black text-emerald-600">{exceptionOverview.low}</span>
              </div>
            </div>

            <div className="border-l border-gray-100 pl-6 flex flex-col justify-center">
              <div className="mb-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Total</div>
                <div className="text-2xl font-black text-[#0B1726]">{exceptionOverview.total}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Affected Value</div>
                <div className="text-lg font-black text-amber-600">{exceptionOverview.affectedValue}</div>
              </div>
              <button className="mt-4 text-xs font-bold text-[#2F6F73] hover:text-[#1a3d3f] flex items-center gap-1 w-full">
                Review Exceptions <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
