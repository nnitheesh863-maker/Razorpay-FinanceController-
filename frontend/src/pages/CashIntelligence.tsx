import React, { useState, useEffect } from 'react';
import { PageContainer, MetricCard, SectionCard, LoadingSkeleton } from '../components/dashboard/ShellComponents';
import { getCashSummary, getCashForecast } from '../api/cash.api';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  Layers,
  HelpCircle,
  ShieldCheck,
  Percent
} from 'lucide-react';

interface SummaryData {
  currentCash: number;
  expectedInflow: number;
  expectedOutflow: number;
  projectedCash: number;
  overdueInflow: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface ForecastPoint {
  date: string;
  amount: number;
  type: 'ACTUAL' | 'PROJECTED';
}

export default function CashIntelligence() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCashData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [sumRes, foreRes] = await Promise.all([
        getCashSummary(),
        getCashForecast()
      ]);

      if (sumRes.success) {
        setSummary(sumRes);
      }
      if (foreRes.success && Array.isArray(foreRes.forecast)) {
        setForecast(foreRes.forecast);
      }
    } catch (err: any) {
      console.error('Failed to load cash intelligence data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch cash data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashData();
  }, []);

  const formatLakhs = (val: number) => {
    // Converts e.g. 2450000 -> ₹24.5L
    const lakhs = val / 100000;
    return `₹${lakhs.toFixed(1)}L`;
  };

  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Process data for Recharts connecting actual and projected lines
  const getProcessedChartData = () => {
    return forecast.map((pt, idx) => {
      const isActual = pt.type === 'ACTUAL';
      const prevPt = idx > 0 ? forecast[idx - 1] : null;
      const nextPt = idx < forecast.length - 1 ? forecast[idx + 1] : null;

      return {
        date: pt.date,
        // Active on ACTUAL nodes, plus the very first PROJECTED node so the line connects
        actual: isActual ? pt.amount : (prevPt && prevPt.type === 'ACTUAL' ? pt.amount : null),
        // Active on PROJECTED nodes, plus the very last ACTUAL node so the line connects
        projected: !isActual ? pt.amount : (nextPt && nextPt.type === 'PROJECTED' ? pt.amount : null)
      };
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-6 text-left">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#0B1726]">Cash Intelligence</h2>
            <p className="text-xs text-[#667085] font-semibold">Loading cash projections...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <LoadingSkeleton className="h-24 rounded-2xl" />
            <LoadingSkeleton className="h-24 rounded-2xl" />
            <LoadingSkeleton className="h-24 rounded-2xl" />
            <LoadingSkeleton className="h-24 rounded-2xl" />
          </div>
          <LoadingSkeleton className="h-80 rounded-2xl w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !summary) {
    return (
      <PageContainer>
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl text-left space-y-4 max-w-lg mx-auto mt-10">
          <div className="flex items-center gap-2 text-[#C94C4C] font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Connection Error</span>
          </div>
          <p className="text-xs font-semibold text-red-700">{error || 'Unable to compute cash flow overview summary.'}</p>
          <button 
            onClick={fetchCashData}
            className="bg-[#C94C4C] text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            Retry Fetch
          </button>
        </div>
      </PageContainer>
    );
  }

  const chartData = getProcessedChartData();

  return (
    <PageContainer>
      
      {/* 1. Header Banner */}
      <div className="space-y-1 text-left mb-6">
        <h2 className="text-xl font-bold tracking-tight text-[#0B1726]">Cash Intelligence</h2>
        <p className="text-xs text-[#667085] font-semibold">Real-time balances and deterministic 30-day cash flow projections.</p>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6 text-left">
        
        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Current Cash</span>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-black text-[#0B1726]">{formatLakhs(summary.currentCash)}</span>
            <span className="text-[10px] text-[#198754] font-extrabold px-1.5 py-0.5 rounded-full bg-green-50 uppercase border border-green-100">Actual</span>
          </div>
          <span className="text-[9px] text-[#667085] font-bold block mt-1">Verified bank & settlement accounts</span>
        </div>

        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Expected Inflow</span>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-black text-[#0B1726]">{formatLakhs(summary.expectedInflow)}</span>
            <span className="text-[10px] text-[#2F6F73] font-extrabold px-1.5 py-0.5 rounded-full bg-[#2F6F73]/10 uppercase border border-[#2F6F73]/20">Projected</span>
          </div>
          <span className="text-[9px] text-[#667085] font-bold block mt-1">Confirmed payments & pending invoices</span>
        </div>

        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Expected Outflow</span>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-black text-[#0B1726]">{formatLakhs(summary.expectedOutflow)}</span>
            <span className="text-[10px] text-[#2F6F73] font-extrabold px-1.5 py-0.5 rounded-full bg-[#2F6F73]/10 uppercase border border-[#2F6F73]/20">Projected</span>
          </div>
          <span className="text-[9px] text-[#667085] font-bold block mt-1">Scheduled expenses & payouts</span>
        </div>

        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Projected 30-Day Cash</span>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-black text-[#2F6F73]">{formatLakhs(summary.projectedCash)}</span>
            <span className="text-[10px] text-[#2F6F73] font-extrabold px-1.5 py-0.5 rounded-full bg-[#2F6F73]/10 uppercase border border-[#2F6F73]/20">Forecast</span>
          </div>
          <span className="text-[9px] text-[#667085] font-bold block mt-1">Formula: Current + Inflow - Outflow</span>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visual Projection Chart */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Cash Flow Timeline">
            <p className="text-[10px] text-gray-400 font-semibold mb-4 text-left">
              Historical ledger balances compared with 15-day forward deterministic projections.
            </p>

            <div className="h-72 w-full pr-4 text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E7EC" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#667085', fontSize: 9, fontWeight: 700 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                    tick={{ fill: '#667085', fontSize: 9, fontWeight: 700 }}
                    domain={['dataMin - 100000', 'dataMax + 100000']}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', borderColor: '#E4E7EC', fontFamily: 'sans-serif' }}
                    labelStyle={{ fontWeight: 'extrabold', color: '#0B1726', fontSize: '10px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value: any, name: any) => [
                      formatRupees(Number(value)), 
                      name === 'actual' ? 'Actual Cash (Ledger)' : 'Projected Cash (Forecast)'
                    ]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider">
                        {value === 'actual' ? 'Actual History (Solid)' : 'Projected reserves (Dashed)'}
                      </span>
                    )}
                  />
                  {/* Historical Solid Line */}
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    name="actual"
                    stroke="#2F6F73" 
                    strokeWidth={2.5} 
                    dot={false}
                    activeDot={{ r: 5, fill: '#2F6F73' }}
                  />
                  {/* Future Forecast Dashed Line */}
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    name="projected"
                    stroke="#2F6F73" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 5, fill: '#2F6F73', strokeWidth: 1 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Right Column: Risk Indicators, Assumptions & Transparency */}
        <div className="lg:col-span-1 space-y-6 text-left">
          
          {/* Risk Card */}
          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#F2F4F7] pb-3">
              <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Risk Assessment</span>
              <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                summary.riskLevel === 'HIGH'
                  ? 'bg-red-50 border-red-200 text-[#C94C4C]'
                  : summary.riskLevel === 'MEDIUM'
                    ? 'bg-amber-50 border-amber-200 text-[#C58B24]'
                    : 'bg-green-50 border-green-200 text-[#198754]'
              }`}>
                {summary.riskLevel} Risk
              </span>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-100 text-[#C58B24] rounded-xl text-xs font-bold flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 font-semibold">
                <span className="text-[11px] font-bold block text-amber-800">{formatLakhs(summary.overdueInflow)} of expected inflows are overdue.</span>
                <p className="text-[9px] text-amber-700 leading-normal font-medium">Overdue invoices delay cash conversion cycles and present collection risks. We recommend auditing reconciliation targets.</p>
              </div>
            </div>

            <div className="text-[10px] text-gray-500 font-semibold space-y-1 pt-1 leading-relaxed">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#198754]" />
                <span>No liquidity shortfalls detected for the next 30 days.</span>
              </div>
            </div>
          </div>

          {/* Transparent Calculation Block */}
          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs space-y-4">
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Calculation Transparency</span>
            
            <div className="space-y-3 font-semibold text-xs text-[#667085]">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <span>Current Ledger Cash</span>
                  <Info className="w-3 h-3 text-gray-400" title="Starting balance base" />
                </span>
                <span className="text-[#0B1726] font-bold">{formatRupees(summary.currentCash)}</span>
              </div>

              <div className="flex justify-between items-center text-green-600">
                <span>+ Expected Inflows</span>
                <span className="font-bold">+{formatRupees(summary.expectedInflow)}</span>
              </div>

              <div className="flex justify-between items-center text-red-500 border-b border-[#F2F4F7] pb-3">
                <span>- Expected Outflows</span>
                <span className="font-bold">-{formatRupees(summary.expectedOutflow)}</span>
              </div>

              <div className="flex justify-between items-center text-[#2F6F73] text-sm font-extrabold pt-1">
                <span>Projected Reserves</span>
                <span>{formatRupees(summary.projectedCash)}</span>
              </div>
            </div>
          </div>

          {/* Forecast Disclaimers */}
          <div className="bg-[#F6F8FA] border border-[#E4E7EC] rounded-2xl p-5 text-[10px] font-semibold text-gray-400 space-y-3 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-[#667085] uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-gray-400" />
              <span>Forecast Disclosures & Assumptions</span>
            </div>
            <p>
              Projections are computed using a deterministic model evaluating pending invoices, expected settlement batches, and historical transaction patterns. 
            </p>
            <p className="text-[#667085] font-bold">
              ⚠️ Expected values are estimates and should not be treated as financial guarantees. Liquidity reserves fluctuate based on customer payment timelines and bank clearing delays.
            </p>
          </div>

        </div>

      </div>

    </PageContainer>
  );
}
