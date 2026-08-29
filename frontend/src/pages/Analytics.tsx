import React, { useState, useEffect } from 'react';
import { PageContainer, SectionCard, LoadingSkeleton } from '../components/dashboard/ShellComponents';
import { getAccuracyReport } from '../api/reports.api';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  ShieldCheck,
  Download,
  Database,
  Grid,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

interface DatasetRecord {
  id: string;
  type: string;
  amount: number;
  expected: string;
  actual: string;
  confidence: number;
}

interface AccuracyData {
  runId: string;
  totalRecords: number;
  matchedRecords: number;
  exceptions: number;
  probable: number;
  matchRate: number;
  precision: number;
  recall: number;
  averageConfidence: number;
  exceptionRate: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  topExceptionCauses: Array<{
    cause: string;
    count: number;
    percentage: number;
  }>;
  datasetSample: DatasetRecord[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAccuracyReport();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load accuracy analytics:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch accuracy analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Export CSV Report Utility
  const handleExportCSV = () => {
    if (!data) return;

    const headers = ['Record ID', 'Match Type', 'Amount (INR)', 'Expected Outcome', 'Actual Outcome', 'Confidence'];
    const rows = data.datasetSample.map(item => [
      item.id,
      item.type,
      item.amount,
      item.expected,
      item.actual,
      item.confidence
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reconciliation_Accuracy_Report_${data.runId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-6 text-left">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#0B1726]">Reconciliation Performance</h2>
            <p className="text-xs text-[#667085] font-semibold">Running batch testing accuracy reports...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <LoadingSkeleton className="h-24 rounded-2xl" />
            <LoadingSkeleton className="h-24 rounded-2xl" />
            <LoadingSkeleton className="h-24 rounded-2xl" />
            <LoadingSkeleton className="h-24 rounded-2xl" />
          </div>
          <LoadingSkeleton className="h-64 rounded-2xl" />
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
          <p className="text-xs font-semibold text-red-700">{error || 'Unable to load accuracy report parameters.'}</p>
          <button 
            onClick={fetchReport}
            className="bg-[#C94C4C] text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            Retry Validation
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      
      {/* 1. Header Banner */}
      <div className="flex justify-between items-end mb-6 text-left">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-[#0B1726]">Reconciliation Performance</h2>
          <p className="text-xs text-[#667085] font-semibold">Precision, recall, and accuracy analytics calculated over a known synthetic dataset of 100 transaction flows.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-[#2F6F73] hover:bg-[#25575a] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Report</span>
        </button>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 text-left">
        
        <div className="bg-white border border-[#E4E7EC] p-4 rounded-2xl shadow-3xs">
          <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Total Analyzed</span>
          <span className="text-xl font-extrabold text-[#0B1726] mt-1 block">{data.totalRecords}</span>
          <span className="text-[9px] font-bold text-gray-400 block mt-0.5">Synthetic records</span>
        </div>

        <div className="bg-white border border-[#E4E7EC] p-4 rounded-2xl shadow-3xs">
          <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Matched</span>
          <span className="text-xl font-extrabold text-[#198754] mt-1 block">{data.matchedRecords}</span>
          <span className="text-[9px] font-bold text-[#198754]/80 block mt-0.5">{data.matchRate}% Match Rate</span>
        </div>

        <div className="bg-white border border-[#E4E7EC] p-4 rounded-2xl shadow-3xs">
          <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Exceptions</span>
          <span className="text-xl font-extrabold text-[#C94C4C] mt-1 block">{data.exceptions}</span>
          <span className="text-[9px] font-bold text-[#C94C4C]/80 block mt-0.5">Unresolved ledger rows</span>
        </div>

        <div className="bg-white border border-[#E4E7EC] p-4 rounded-2xl shadow-3xs">
          <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Precision</span>
          <span className="text-xl font-extrabold text-[#2F6F73] mt-1 block">{data.precision}%</span>
          <span className="text-[9px] font-bold text-gray-400 block mt-0.5">True Match Ratio</span>
        </div>

        <div className="bg-white border border-[#E4E7EC] p-4 rounded-2xl shadow-3xs">
          <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Recall</span>
          <span className="text-xl font-extrabold text-[#2F6F73] mt-1 block">{data.recall}%</span>
          <span className="text-[9px] font-bold text-gray-400 block mt-0.5">Matching Sensitivity</span>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* CONFUSION MATRIX CARD */}
        <div className="lg:col-span-1 bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-1.5 border-b border-[#F2F4F7] pb-3">
            <Grid className="w-4 h-4 text-[#2F6F73]" />
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Confusion Matrix</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold text-[#0B1726] pt-2">
            
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 space-y-1">
              <span className="text-[9px] text-[#198754] uppercase tracking-wider block">True Positive (TP)</span>
              <span className="text-2xl font-black text-[#198754]">{data.confusionMatrix.tp}</span>
              <span className="text-[9px] text-gray-400 block font-medium">Expected Match, Matched</span>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 space-y-1">
              <span className="text-[9px] text-[#C94C4C] uppercase tracking-wider block">False Positive (FP)</span>
              <span className="text-2xl font-black text-[#C94C4C]">{data.confusionMatrix.fp}</span>
              <span className="text-[9px] text-gray-400 block font-medium">Expected Exception, Matched</span>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 space-y-1">
              <span className="text-[9px] text-[#C58B24] uppercase tracking-wider block">False Negative (FN)</span>
              <span className="text-2xl font-black text-[#C58B24]">{data.confusionMatrix.fn}</span>
              <span className="text-[9px] text-gray-400 block font-medium">Expected Match, Exception</span>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 space-y-1">
              <span className="text-[9px] text-blue-700 uppercase tracking-wider block">True Negative (TN)</span>
              <span className="text-2xl font-black text-blue-700">{data.confusionMatrix.tn}</span>
              <span className="text-[9px] text-gray-400 block font-medium">Expected Exception, Exception</span>
            </div>

          </div>

          <div className="pt-2 border-t border-[#F2F4F7] text-[10px] font-semibold text-gray-400 leading-relaxed">
            💡 **High Precision** ensures manual auditor verification load is minimal. **High Recall** guarantees that no matching transaction slips into unpaid status.
          </div>
        </div>

        {/* TOP EXCEPTION CAUSES */}
        <div className="lg:col-span-2 bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-1.5 border-b border-[#F2F4F7] pb-3">
            <AlertTriangle className="w-4 h-4 text-[#C94C4C]" />
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Top Exception Causes</span>
          </div>

          <div className="space-y-4">
            {data.topExceptionCauses.map((cause, idx) => (
              <div key={idx} className="space-y-1.5 text-xs font-bold text-[#0B1726]">
                <div className="flex justify-between items-baseline">
                  <span>{cause.cause}</span>
                  <span className="text-gray-400 font-medium">{cause.count} occurrences ({cause.percentage}%)</span>
                </div>
                <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#C94C4C] h-full rounded-full transition-all" 
                    style={{ width: `${cause.percentage}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#F2F4F7] flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span>Average Match Confidence</span>
            <span className="text-[#2F6F73] font-black">{data.averageConfidence}%</span>
          </div>
        </div>

      </div>

      {/* BATCH RUN REPORT DETAILS TABLE */}
      <div className="mt-6">
        <SectionCard title={`Batch Run Report (${data.runId})`}>
          <p className="text-[10px] text-gray-400 font-semibold mb-4 leading-normal">
            This verification report summarizes a known dataset audit. Always showing exceptions to prevent cherry-picked metrics.
          </p>

          <div className="border border-[#E4E7EC] rounded-2xl overflow-hidden shadow-3xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E4E7EC] text-left text-xs font-medium">
                <thead className="bg-[#F6F8FA] text-[10px] text-[#667085] font-extrabold uppercase">
                  <tr>
                    <th className="py-3 px-4">Record ID</th>
                    <th>Match Type</th>
                    <th>Amount (INR)</th>
                    <th>Expected Outcome</th>
                    <th>Actual Outcome</th>
                    <th>Status</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F7] text-gray-600 font-semibold">
                  {data.datasetSample.map((record, idx) => {
                    const isSuccess = record.expected === record.actual;
                    return (
                      <tr key={idx} className="hover:bg-[#F6F8FA] transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[10px] font-bold text-[#0B1726]">{record.id}</td>
                        <td className="text-[10px] font-black text-gray-500">{record.type}</td>
                        <td className="text-[#0B1726] font-bold">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(record.amount)}
                        </td>
                        <td className="text-[10px] font-bold uppercase">{record.expected}</td>
                        <td className="text-[10px] font-bold uppercase">{record.actual}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isSuccess
                              ? 'bg-emerald-50 text-[#198754]'
                              : 'bg-amber-50 text-[#C58B24]'
                          }`}>
                            {isSuccess ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                        <td className="font-mono text-[10px] font-bold text-[#2F6F73]">
                          {(record.confidence * 100).toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      </div>

    </PageContainer>
  );
}
