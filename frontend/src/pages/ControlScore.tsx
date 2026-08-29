import React, { useState, useEffect } from 'react';
import { PageContainer, SectionCard, LoadingSkeleton } from '../components/dashboard/ShellComponents';
import { getControlScore } from '../api/controlScore.api';
import { 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  Sliders,
  Play
} from 'lucide-react';

interface ScoreComponent {
  score: number;
  reason: string;
}

interface ScoreData {
  totalScore: number;
  grade: string;
  reconciliation: ScoreComponent;
  dataQuality: ScoreComponent;
  exceptionHealth: ScoreComponent;
  cashVisibility: ScoreComponent;
  approvalHealth: ScoreComponent;
  whatImproved: string[];
  needsAttention: string[];
  recommendedActions: string[];
}

export default function ControlScore() {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getControlScore();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load control score:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch control score.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-6 text-left">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#0B1726]">Control Score</h2>
            <p className="text-xs text-[#667085] font-semibold">Calculating internal finance health metrics...</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <LoadingSkeleton className="h-64 rounded-2xl lg:col-span-1" />
            <LoadingSkeleton className="h-64 rounded-2xl lg:col-span-2" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl text-left space-y-4 max-w-lg mx-auto mt-10">
          <div className="flex items-center gap-2 text-[#C94C4C] font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Connection Error</span>
          </div>
          <p className="text-xs font-semibold text-red-700">{error || 'Unable to compute Control Score indicators.'}</p>
          <button 
            onClick={fetchScore}
            className="bg-[#C94C4C] text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            Retry Calculation
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      
      {/* 1. Header Banner */}
      <div className="space-y-1 text-left mb-6">
        <h2 className="text-xl font-bold tracking-tight text-[#0B1726]">Control Score</h2>
        <p className="text-xs text-[#667085] font-semibold">Unique product metric analyzing total ledger accuracy, reconciliation health, and API integrations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* LEFT COLUMN: OVERALL VISUAL SCORE */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 shadow-2xs text-center space-y-5">
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Internal Finance Control Score</span>
            
            {/* Visual Ring/Value */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  stroke="#F2F4F7"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  stroke="#2F6F73"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={402}
                  strokeDashoffset={402 - (402 * data.totalScore) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-[#0B1726]">{data.totalScore}</span>
                <span className="text-[10px] text-[#667085] font-bold">/ 100</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                data.totalScore >= 90
                  ? 'bg-green-50 border-green-200 text-[#198754]'
                  : 'bg-amber-50 border-amber-200 text-[#C58B24]'
              }`}>
                {data.grade}
              </span>
              <p className="text-[10px] text-gray-400 font-semibold pt-1 max-w-[200px] mx-auto leading-relaxed">Your ledger accuracy is within standard compliance levels. Review outstanding recommended actions below.</p>
            </div>

            {/* Score History Ready Tag */}
            <div className="border-t border-[#F2F4F7] pt-4 flex items-center justify-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>Score history logging active</span>
            </div>
          </div>

          {/* Action Checklist */}
          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs space-y-4">
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Recommended Actions</span>
            
            <div className="space-y-3 font-semibold text-xs text-[#0B1726]">
              {data.recommendedActions.map((action, idx) => (
                <div key={idx} className="flex gap-2.5 items-start p-2 rounded-xl hover:bg-[#F6F8FA] transition-colors">
                  <div className="w-4.5 h-4.5 rounded-full bg-[#2F6F73]/10 border border-[#2F6F73]/20 flex items-center justify-center text-[#2F6F73] text-[9px] font-extrabold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="leading-snug font-semibold text-gray-600">{action}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SCORE BREAKDOWN & DETAIL LOGS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Breakdown progress bars */}
          <SectionCard title="Score Breakdown">
            <p className="text-[10px] text-gray-400 font-semibold mb-5 leading-normal">
              Weights are distributed dynamically to reflect overall compliance risk: Reconciliation (30%), Data Quality (20%), Exceptions (20%), Cash Visibility (15%), Approvals (15%).
            </p>

            <div className="space-y-4">
              
              {/* Reconciliation Health */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline text-xs font-bold">
                  <span className="text-[#0B1726]">Reconciliation Health <span className="text-gray-400 font-medium">(30% Weight)</span></span>
                  <span className="text-[#2F6F73] font-black">{data.reconciliation.score} / 100</span>
                </div>
                <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2F6F73] h-full rounded-full transition-all duration-500" style={{ width: `${data.reconciliation.score}%` }} />
                </div>
                <p className="text-[9px] text-[#667085] font-semibold">{data.reconciliation.reason}</p>
              </div>

              {/* Exception Health */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-baseline text-xs font-bold">
                  <span className="text-[#0B1726]">Exception Health <span className="text-gray-400 font-medium">(20% Weight)</span></span>
                  <span className="text-[#2F6F73] font-black">{data.exceptionHealth.score} / 100</span>
                </div>
                <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2F6F73] h-full rounded-full transition-all duration-500" style={{ width: `${data.exceptionHealth.score}%` }} />
                </div>
                <p className="text-[9px] text-[#667085] font-semibold">{data.exceptionHealth.reason}</p>
              </div>

              {/* Data Quality */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-baseline text-xs font-bold">
                  <span className="text-[#0B1726]">Data Quality <span className="text-gray-400 font-medium">(20% Weight)</span></span>
                  <span className="text-[#2F6F73] font-black">{data.dataQuality.score} / 100</span>
                </div>
                <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2F6F73] h-full rounded-full transition-all duration-500" style={{ width: `${data.dataQuality.score}%` }} />
                </div>
                <p className="text-[9px] text-[#667085] font-semibold">{data.dataQuality.reason}</p>
              </div>

              {/* Cash Visibility */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-baseline text-xs font-bold">
                  <span className="text-[#0B1726]">Cash Visibility <span className="text-gray-400 font-medium">(15% Weight)</span></span>
                  <span className="text-[#2F6F73] font-black">{data.cashVisibility.score} / 100</span>
                </div>
                <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2F6F73] h-full rounded-full transition-all duration-500" style={{ width: `${data.cashVisibility.score}%` }} />
                </div>
                <p className="text-[9px] text-[#667085] font-semibold">{data.cashVisibility.reason}</p>
              </div>

              {/* Approval Health */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-baseline text-xs font-bold">
                  <span className="text-[#0B1726]">Approval Health <span className="text-gray-400 font-medium">(15% Weight)</span></span>
                  <span className="text-[#2F6F73] font-black">{data.approvalHealth.score} / 100</span>
                </div>
                <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2F6F73] h-full rounded-full transition-all duration-500" style={{ width: `${data.approvalHealth.score}%` }} />
                </div>
                <p className="text-[9px] text-[#667085] font-semibold">{data.approvalHealth.reason}</p>
              </div>

            </div>
          </SectionCard>

          {/* Improved vs Attention Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* What improved */}
            <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs space-y-4">
              <span className="text-[10px] font-bold text-[#198754] uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#198754]" />
                <span>What Improved</span>
              </span>
              <ul className="space-y-2.5">
                {data.whatImproved.map((item, idx) => (
                  <li key={idx} className="text-[11px] font-semibold text-gray-500 leading-normal pl-4 relative">
                    <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-[#198754] rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Needs attention */}
            <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs space-y-4">
              <span className="text-[10px] font-bold text-[#C58B24] uppercase tracking-wider block flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#C58B24]" />
                <span>Needs Attention</span>
              </span>
              <ul className="space-y-2.5">
                {data.needsAttention.map((item, idx) => (
                  <li key={idx} className="text-[11px] font-semibold text-gray-500 leading-normal pl-4 relative">
                    <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-[#C58B24] rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>

      </div>

    </PageContainer>
  );
}
