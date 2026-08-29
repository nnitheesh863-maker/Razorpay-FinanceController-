import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/dashboard/ShellComponents';
import { 
  Play, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  Sparkles, 
  Database,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';

interface DemoStep {
  label: string;
  description: string;
}

export default function DemoPage() {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [reconProgress, setReconProgress] = useState(0);

  const steps: DemoStep[] = [
    { label: 'Step 1: Data Sources Connected', description: 'Linked PostgreSQL ledger statements, bank transactions, and Razorpay API records.' },
    { label: 'Step 2: 100 Records Analyzed', description: 'Parsed and normalized raw CSV transaction logs into financial schema tables.' },
    { label: 'Step 3: Deterministic Reconciliation Running', description: 'Running matching rules across UTR codes, amounts, and dates.' },
    { label: 'Step 4: 91 Matched', description: 'Exact matches (75), reference matches (10), and settlement clearings (6) mapped.' },
    { label: 'Step 5: 4 Probable Matches Sent for AI Analysis', description: 'Dispatching partial payment discrepancies to Groq controller for verification.' },
    { label: 'Step 6: 5 Exceptions Detected', description: 'Amount mismatches and missing invoice records isolated in the exceptions inbox.' },
    { label: 'Step 7: Finance Control Score Calculated', description: 'Weighted health calculated: 92/100 (Excellent).' },
    { label: 'Step 8: Cash Position Updated', description: 'Projected 30-day inflows/outflows consolidated in Cash Intelligence ledger.' }
  ];

  // Animate the deterministic matching progress bar
  useEffect(() => {
    let interval: any;
    if (isRunning && currentStep === 2) {
      setReconProgress(0);
      interval = setInterval(() => {
        setReconProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            // Move to next step after completing progress bar
            setTimeout(() => {
              setCurrentStep(3);
            }, 500);
            return 100;
          }
          return prev + 10;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentStep]);

  // Handle stepping intervals
  useEffect(() => {
    let timer: any;
    if (isRunning) {
      if (currentStep === -1) {
        setCurrentStep(0);
      } else if (currentStep !== 2 && currentStep < steps.length - 1) {
        timer = setTimeout(() => {
          setCurrentStep(prev => prev + 1);
        }, 1500);
      }
    }
    return () => clearTimeout(timer);
  }, [isRunning, currentStep]);

  const handleStartDemo = () => {
    setIsRunning(true);
    setCurrentStep(-1);
    setReconProgress(0);
  };

  const handleResetDemo = () => {
    setIsRunning(false);
    setCurrentStep(-1);
    setReconProgress(0);
  };

  const isComplete = currentStep === steps.length - 1;

  return (
    <PageContainer>
      
      {/* Header Banner */}
      <div className="space-y-1 text-left mb-6">
        <h2 className="text-xl font-bold tracking-tight text-[#0B1726]">Audit Trail Simulator</h2>
        <p className="text-xs text-[#667085] font-semibold">Orchestrate the complete deterministic ledger matching and AI audit validation workflow.</p>
      </div>

      <div className="max-w-2xl mx-auto bg-white border border-[#E4E7EC] rounded-2xl p-6 shadow-2xs text-left space-y-6">
        
        {/* DEMO INTRO SCREEN */}
        {!isRunning && (
          <div className="text-center py-10 space-y-5">
            <div className="w-14 h-14 bg-[#2F6F73]/10 border border-[#2F6F73]/20 text-[#2F6F73] rounded-full flex items-center justify-center mx-auto">
              <Play className="w-6 h-6 ml-0.5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#0B1726] uppercase tracking-wider">Run Guided Audit Demonstration</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                Click the button below to simulate running the Finance Control engine over a test dataset of 100 transaction rows. Observe matching progress and audit statistics.
              </p>
            </div>
            <button
              onClick={handleStartDemo}
              className="bg-[#2F6F73] hover:bg-[#25575a] text-white text-xs font-bold px-6 py-3 rounded-xl cursor-pointer shadow-3xs transition-colors flex items-center gap-1.5 mx-auto"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Run Finance Control</span>
            </button>
          </div>
        )}

        {/* ORCHESTRATED STEP PROGRESSION */}
        {isRunning && !isComplete && (
          <div className="space-y-6">
            
            <div className="flex justify-between items-center border-b border-[#F2F4F7] pb-3">
              <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#2F6F73] animate-pulse" />
                <span>Auditing In Progress...</span>
              </span>
              <span className="text-[10px] text-gray-400 font-bold">Step {currentStep + 1} of {steps.length}</span>
            </div>

            <div className="space-y-4">
              {steps.map((step, idx) => {
                const isActive = idx === currentStep;
                const isPassed = idx < currentStep;
                
                return (
                  <div 
                    key={idx}
                    className={`flex gap-3.5 items-start p-3 rounded-xl border transition-colors ${
                      isActive 
                        ? 'bg-[#2F6F73]/5 border-[#2F6F73]/25 text-[#0B1726]' 
                        : isPassed
                          ? 'bg-neutral-50/50 border-neutral-100 opacity-60'
                          : 'border-transparent opacity-30'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isPassed ? (
                        <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                      ) : isActive && idx !== 2 ? (
                        <div className="w-4.5 h-4.5 border-2 border-[#2F6F73] border-t-transparent rounded-full animate-spin" />
                      ) : isActive && idx === 2 ? (
                        <Database className="w-4.5 h-4.5 text-[#2F6F73] animate-pulse" />
                      ) : (
                        <div className="w-4.5 h-4.5 border-2 border-gray-200 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 space-y-0.5">
                      <span className="text-xs font-bold block">{step.label}</span>
                      <p className="text-[10px] text-gray-500 font-semibold leading-normal">{step.description}</p>

                      {/* Matching Progress Bar */}
                      {isActive && idx === 2 && (
                        <div className="mt-2 space-y-1">
                          <div className="w-full bg-[#E4E7EC] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#2F6F73] h-full rounded-full transition-all duration-150" style={{ width: `${reconProgress}%` }} />
                          </div>
                          <span className="text-[9px] text-gray-400 font-bold block">{reconProgress}% Reconciled</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* FINAL SCREEN: FINANCE CONTROL COMPLETE */}
        {isComplete && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-[#F2F4F7] pb-3">
              <span className="text-[10px] font-bold text-[#198754] uppercase tracking-wider block flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-[#198754]" />
                <span>Finance Control Complete</span>
              </span>
              <span className="bg-emerald-50 border border-emerald-100 text-[#198754] text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Demo Mode</span>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              
              <div className="bg-[#F6F8FA] border border-[#E4E7EC] p-3.5 rounded-xl text-center">
                <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Analyzed</span>
                <span className="text-lg font-extrabold text-[#0B1726] mt-0.5 block">100</span>
              </div>

              <div className="bg-[#F6F8FA] border border-[#E4E7EC] p-3.5 rounded-xl text-center">
                <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Matched (91%)</span>
                <span className="text-lg font-extrabold text-[#198754] mt-0.5 block">91</span>
              </div>

              <div className="bg-[#F6F8FA] border border-[#E4E7EC] p-3.5 rounded-xl text-center">
                <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Exceptions</span>
                <span className="text-lg font-extrabold text-[#C94C4C] mt-0.5 block">5</span>
              </div>

              <div className="bg-[#F6F8FA] border border-[#E4E7EC] p-3.5 rounded-xl text-center">
                <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Probable</span>
                <span className="text-lg font-extrabold text-[#C58B24] mt-0.5 block">4</span>
              </div>

            </div>

            {/* Extra Accuracy Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 border-t border-b border-[#F2F4F7] py-4 font-bold text-xs text-gray-500">
              
              <div className="flex justify-between md:flex-col md:items-start md:gap-1">
                <span className="text-[9px] text-[#667085] uppercase tracking-wider">Average Confidence</span>
                <span className="text-[#0B1726] text-sm font-extrabold">94.2%</span>
              </div>

              <div className="flex justify-between md:flex-col md:items-start md:gap-1">
                <span className="text-[9px] text-[#667085] uppercase tracking-wider">Control Score</span>
                <span className="text-[#2F6F73] text-sm font-black">92 / 100</span>
              </div>

              <div className="flex justify-between md:flex-col md:items-start md:gap-1">
                <span className="text-[9px] text-[#667085] uppercase tracking-wider">Auditability Log</span>
                <span className="text-[#198754] text-xs font-black uppercase">Verified State</span>
              </div>

            </div>

            {/* High Discrepancy Highlight */}
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-[#C94C4C] flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] text-red-800 font-extrabold uppercase tracking-wider block">Top Unresolved Exception</span>
                <span className="text-[#C94C4C] text-sm font-black block mt-0.5">₹2,10,000 (₹2.10L)</span>
                <p className="text-[10px] text-gray-500 font-semibold leading-normal">Status: Missing invoice reference key UTR matching bank statement captures.</p>
              </div>
            </div>

            {/* Redirect Dashboard Navigation Links */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Investigate Completed Metrics</span>
              
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
                <button
                  onClick={() => navigate('/reconciliation')}
                  className="bg-[#F6F8FA] hover:bg-[#F2F4F7] border border-[#E4E7EC] text-[#0B1726] p-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Explore Matches</span>
                </button>

                <button
                  onClick={() => navigate('/exceptions')}
                  className="bg-[#F6F8FA] hover:bg-[#F2F4F7] border border-[#E4E7EC] text-[#0B1726] p-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Review Exceptions</span>
                </button>

                <button
                  onClick={() => navigate('/agent')}
                  className="bg-[#F6F8FA] hover:bg-[#F2F4F7] border border-[#E4E7EC] text-[#0B1726] p-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#2F6F73]" />
                  <span>Ask AI</span>
                </button>

                <button
                  onClick={() => navigate('/cash-intelligence')}
                  className="bg-[#F6F8FA] hover:bg-[#F2F4F7] border border-[#E4E7EC] text-[#0B1726] p-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                  <span>View Cash Position</span>
                </button>
              </div>
            </div>

            {/* Reset Walkthrough */}
            <div className="border-t border-[#F2F4F7] pt-4 flex justify-between items-center">
              <span className="text-[10px] text-gray-400 font-semibold">Ready to test again? Reset demo to replay.</span>
              <button
                onClick={handleResetDemo}
                className="bg-white border border-[#E4E7EC] hover:bg-[#F2F4F7] text-[#0B1726] text-[10px] font-bold px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Demo</span>
              </button>
            </div>

          </div>
        )}

      </div>

    </PageContainer>
  );
}
