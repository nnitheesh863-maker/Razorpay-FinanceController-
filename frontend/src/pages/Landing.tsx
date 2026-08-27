import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Sparkles, 
  GitCompare, 
  CheckCircle,
  FileText,
  Coins,
  MessageSquare,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

// High-fidelity Razorpay SVG Logo path
const RazorpayLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 500 500" className={`${className} fill-current`} xmlns="http://www.w3.org/2000/svg">
    <path d="M430.2 263.6L239.5 48h-89.8l147.2 215.6H178.6L102 384h117.8l63.2 88h89.8L296 263.6h134.2z" />
  </svg>
);

// Synthetic cash forecast chart data
const forecastData = [
  { day: 'M', val: 40000 },
  { day: 'T', val: 55000 },
  { day: 'W', val: 48000 },
  { day: 'T', val: 75000 },
  { day: 'F', val: 92000 },
  { day: 'S', val: 68000 },
  { day: 'S', val: 82000 }
];

export function Landing() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  // Interactive Agent Q&A demo state
  const [demoQuestion, setDemoQuestion] = useState('How much money is currently unmatched?');
  const [demoAnswer, setDemoAnswer] = useState('There are currently 13 unmatched transactions with a total value of ₹1,42,500. Five appear to be partial payments, while three are potential gateway fee deductions.');

  const handleAskDemo = (q: string) => {
    setDemoQuestion(q);
    if (q.includes('unmatched')) {
      setDemoAnswer('There are currently 13 unmatched transactions with a total value of ₹1,42,500. Five appear to be partial payments, while three are potential gateway fee deductions.');
    } else if (q.includes('discrepancy')) {
      setDemoAnswer('Invoice #INV-1020 has a ₹5,000 difference (Expected: ₹75,000, Received: ₹70,000). The AI suspects a partial customer payment. Human approval is pending.');
    } else {
      setDemoAnswer('Reconciliation run run_1042 processed 100 records in 1.8 seconds with a match rate of 87% and an accuracy of 94.2%.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-gray-800 font-sans selection:bg-[#6254ff]/20 overflow-x-hidden relative">
      
      {/* Background glowing shapes */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-[#6254ff]/10 to-[#8b7eff]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-15%] w-[45%] h-[45%] bg-gradient-to-br from-[#00d0ff]/5 to-[#6254ff]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header matching mockup structure */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-gray-100/60 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          
          {/* Logo with Razorpay icon */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-gradient-to-br from-[#002fcf] to-[#00d0ff] rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/10">
              <RazorpayLogo className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-[#12131a] text-base tracking-tight leading-none">AI Finance Controller</span>
              <span className="text-[9px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">Powered by Razorpay API</span>
            </div>
          </div>

          {/* Navigation Links in Center */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-gray-500">
            <Link to={token ? "/dashboard" : "/login"} className="hover:text-[#6254ff] transition-colors">Overview</Link>
            <Link to={token ? "/invoices" : "/login"} className="hover:text-[#6254ff] transition-colors">Invoices</Link>
            <Link to={token ? "/reconciliation" : "/login"} className="hover:text-[#6254ff] transition-colors">Reconciliation</Link>
            <Link to={token ? "/agent" : "/login"} className="hover:text-[#6254ff] transition-colors">AI Q&A Agent</Link>
            <Link to={token ? "/api-test" : "/login"} className="hover:text-[#6254ff] transition-colors">Developer Docs</Link>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {token ? (
              <Link 
                to="/dashboard"
                className="bg-[#12131a] hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link 
                  to="/login"
                  className="text-xs font-bold text-gray-600 hover:text-[#6254ff] px-4 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/register"
                  className="bg-[#6254ff] hover:bg-[#4d3ecc] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-primary-500/10 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20 space-y-24">
        
        {/* HERO SECTION - Split layout */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 bg-[#6254ff]/10 text-[#6254ff] px-4 py-1.5 rounded-full text-xs font-bold border border-[#6254ff]/10">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Closed Finance-Ops Reconciliation Loop</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-black text-gray-900 tracking-tight leading-[1.05]">
              Grow your business with <span className="text-[#6254ff]">smart digital</span> solutions
            </h1>
            
            <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-lg">
              Automated multi-source ledger reconciliation between bank payouts, payment gateway invoices, and ledger receipts. Surface exceptions instantly.
            </p>

            {/* CTA Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {token ? (
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-[#6254ff] hover:bg-[#4d3ecc] text-white px-7 py-3.5 rounded-2xl text-xs font-bold shadow-lg shadow-primary-500/10 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/register')}
                    className="bg-[#6254ff] hover:bg-[#4d3ecc] text-white px-7 py-3.5 rounded-2xl text-xs font-bold shadow-lg shadow-primary-500/10 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => navigate('/login')}
                    className="bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 px-6 py-3.5 rounded-2xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Watch Demo
                  </button>
                </>
              )}
            </div>

            {/* Interactive Dark Glass card floating below hero text */}
            <div className="bg-[#1c1d26] border border-neutral-800 rounded-3xl p-5 text-white max-w-md shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6254ff] to-[#00d0ff] flex items-center justify-center">
                  <GitCompare className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Reconciliation Health</span>
                  <span className="text-base font-extrabold tracking-tight mt-0.5">$3,853.48 reconciled</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded-full">
                  87% Match
                </span>
                <span className="text-[9px] text-gray-500 mt-1 font-semibold">1.8s runtime</span>
              </div>
            </div>
          </div>

          {/* Hero Right Visuals: Glassmorphic 3D elements matching mockup */}
          <div className="lg:col-span-6 flex justify-center relative min-h-[400px]">
            {/* Background blur behind glass elements */}
            <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-indigo-500/30 rounded-full blur-[70px] pointer-events-none" />

            {/* Floating Glassmorphic visual container */}
            <div className="relative w-full max-w-lg bg-white/20 border border-white/40 rounded-[40px] p-6 shadow-2xl backdrop-blur-md overflow-hidden min-h-[400px] flex flex-col justify-center items-center">
              
              {/* Graphic cylindrical glass chart tubes representing datasets */}
              <div className="flex items-end justify-center gap-6 h-60 w-full relative z-10">
                {/* Tube 1: Invoices */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-44 bg-gradient-to-t from-blue-500/30 to-blue-500/10 border-x border-t border-white/30 rounded-t-full relative shadow-inner">
                    <div className="absolute bottom-4 left-2 right-2 h-20 bg-blue-500/50 rounded-xl" />
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">Invoices</span>
                </div>

                {/* Tube 2: Payments */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-52 bg-gradient-to-t from-[#6254ff]/30 to-[#6254ff]/10 border-x border-t border-white/30 rounded-t-full relative shadow-inner">
                    <div className="absolute bottom-4 left-2.5 right-2.5 h-36 bg-[#6254ff]/60 rounded-xl shadow-lg shadow-primary-500/20" />
                  </div>
                  <span className="text-[9px] font-bold text-gray-700 tracking-wider uppercase">Payments</span>
                </div>

                {/* Tube 3: Bank Data */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-36 bg-gradient-to-t from-teal-500/30 to-teal-500/10 border-x border-t border-white/30 rounded-t-full relative shadow-inner">
                    <div className="absolute bottom-4 left-2 right-2 h-14 bg-teal-500/40 rounded-xl" />
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">Bank</span>
                </div>
              </div>

              {/* Floating 3D icon cards */}
              <div className="absolute top-8 left-8 bg-white/70 border border-white/60 p-3 rounded-2xl shadow-xl flex items-center gap-2.5 backdrop-blur-sm animate-bounce duration-[4000ms]">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div className="flex flex-col text-left">
                  <span className="text-[8px] font-extrabold text-gray-400 uppercase">INV-1003</span>
                  <span className="text-xs font-bold">$47,980.00</span>
                </div>
              </div>

              <div className="absolute bottom-16 right-8 bg-white/70 border border-white/60 p-3 rounded-2xl shadow-xl flex items-center gap-2.5 backdrop-blur-sm animate-pulse">
                <Coins className="w-5 h-5 text-green-500" />
                <div className="flex flex-col text-left">
                  <span className="text-[8px] font-extrabold text-gray-400 uppercase">Settled</span>
                  <span className="text-xs font-bold text-green-600">UPI Capture</span>
                </div>
              </div>

              {/* Glass circular tray */}
              <div className="absolute bottom-6 w-[80%] h-12 bg-white/10 border border-white/20 rounded-full skew-x-12 rotate-3 shadow-lg pointer-events-none" />
            </div>
          </div>

        </section>

        {/* STATS STRIP SECTION - Replicates statistics bars */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
            <h4 className="text-3xl font-extrabold text-gray-900 tracking-tight">98.6%</h4>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">Auto Match Rate</span>
          </div>
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
            <h4 className="text-3xl font-extrabold text-gray-900 tracking-tight">1.8s</h4>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">Avg Match Speed</span>
          </div>
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
            <h4 className="text-3xl font-extrabold text-gray-900 tracking-tight">120+</h4>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">Records Reconciled</span>
          </div>
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
            <h4 className="text-3xl font-extrabold text-gray-900 tracking-tight">0</h4>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">Unresolved Exceptions</span>
          </div>
        </section>

        {/* TRIPLE CARD HIGHLIGHT SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Slate-Dark Unresolved logs chatbot simulated */}
          <div className="bg-[#1c1d26] border border-neutral-800 rounded-[32px] p-6 text-white shadow-lg text-left flex flex-col justify-between min-h-[300px]">
            <div>
              <span className="text-[9px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Discrepancy</span>
              <h3 className="text-lg font-extrabold mt-3 tracking-tight">Fuzzy Match Resolution</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mt-2.5 font-medium">
                Our AI agent processes mismatched invoice customer tags (e.g. "TATA TECH" vs "Tata Technologies Pvt Ltd") and reasons discrepancies dynamically.
              </p>
            </div>
            
            <div className="space-y-2 mt-4 bg-neutral-900/50 p-3 rounded-2xl border border-neutral-800">
              <span className="text-[9px] font-bold text-gray-400 uppercase block">Simulated Response</span>
              <p className="text-[10px] italic text-[#8b7eff] leading-relaxed">
                "The customer names strongly suggest ownership, but the bank transaction is ₹500 lower than invoice. Classification: Needs Review (Possible Gateway Fee)."
              </p>
            </div>
          </div>

          {/* Card 2: Nitheesh Finance Manager Avatar Panel */}
          <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm text-left flex flex-col justify-between min-h-[300px] relative overflow-hidden">
            <div>
              <span className="text-[9px] bg-[#6254ff]/15 text-[#6254ff] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Operations</span>
              <h3 className="text-lg font-extrabold mt-3 tracking-tight">Automate Finance Ops</h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-2 font-medium">
                Bridge the gap between transaction collection and ledger verification with custom human approval gates.
              </p>
            </div>

            {/* Profile snippet card */}
            <div className="flex items-center gap-3.5 bg-gray-50 p-3 rounded-2xl border border-gray-100 mt-4">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces" 
                alt="Avatar" 
                className="w-10 h-10 rounded-full object-cover border border-gray-100"
              />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-gray-700 leading-none">Nitheesh</span>
                <span className="text-[9px] font-semibold text-gray-400 mt-1 uppercase leading-none">Finance Manager</span>
              </div>
            </div>
          </div>

          {/* Card 3: Interactive Invoice Mock Component */}
          <div className="bg-gradient-to-br from-[#6254ff] to-[#4d3ecc] text-white rounded-[32px] p-6 shadow-lg text-left flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase text-white/70"># INV-1003</span>
                <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-bold">Unpaid</span>
              </div>
              <h3 className="text-base font-extrabold mt-3 tracking-tight">BrightWave Design Settlement</h3>
            </div>

            {/* Line items list representation */}
            <div className="space-y-2 mt-3 flex-1 flex flex-col justify-center">
              <div className="bg-white/10 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold">UI/UX Design services</span>
                <span className="text-xs font-extrabold">$15,990.00</span>
              </div>
              <div className="bg-white/10 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold">Development & QA</span>
                <span className="text-xs font-extrabold">$31,990.00</span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/15">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/50 uppercase leading-none">Total Balance</span>
                <span className="text-sm font-extrabold mt-0.5">$47,980.00</span>
              </div>
              
              <button 
                onClick={() => navigate('/invoices')}
                className="bg-white text-[#6254ff] hover:bg-white/95 text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Payout now
              </button>
            </div>
          </div>

        </section>

        {/* DYNAMIC Q&A ENGINE & CASH FORECAST CHART SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Interactive Q&A Engine (55% width) */}
          <div className="lg:col-span-7 bg-white border border-gray-100 rounded-[32px] p-6.5 shadow-sm text-left space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#6254ff]/10 text-[#6254ff] px-3.5 py-1 rounded-full text-xs font-bold border border-[#6254ff]/10">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>AI Finance Assistant</span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-3">Close the loop with natural queries</h2>
              <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1">
                Ask the Groq-powered AI agent detailed questions about your reconciliation runs, outstanding collections, and exceptions.
              </p>
            </div>

            {/* Quick Demo Ask Questions Selector */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleAskDemo('How much money is currently unmatched?')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                  demoQuestion.includes('unmatched') 
                    ? 'bg-[#6254ff] text-white border-[#6254ff]' 
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Show Unmatched
              </button>
              <button 
                onClick={() => handleAskDemo('Explain the latest invoice discrepancy.')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                  demoQuestion.includes('discrepancy') 
                    ? 'bg-[#6254ff] text-white border-[#6254ff]' 
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Latest Discrepancy
              </button>
              <button 
                onClick={() => handleAskDemo('Tell me about the last reconciliation run.')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                  demoQuestion.includes('run') 
                    ? 'bg-[#6254ff] text-white border-[#6254ff]' 
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Reconciliation Stats
              </button>
            </div>

            {/* Live simulated Q&A Chat window */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4.5 space-y-4">
              <div className="flex items-start gap-2.5 text-left">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                  U
                </div>
                <div className="bg-white border border-gray-100 rounded-r-2xl rounded-bl-2xl p-3 text-xs text-gray-700 font-semibold shadow-xs">
                  {demoQuestion}
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-left">
                <div className="w-7 h-7 rounded-full bg-[#6254ff] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  AI
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-r-2xl rounded-bl-2xl p-3 text-xs text-indigo-950 font-medium leading-relaxed shadow-xs">
                  {demoAnswer}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Cash Forecasting Chart & metric (45% width) */}
          <div className="lg:col-span-5 bg-[#12131a] border border-neutral-850 rounded-[32px] p-6 text-white text-left min-h-[360px] flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cash position projection</span>
                <span className="text-[9px] bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-2.5 h-2.5" />
                  <span>Expects positive</span>
                </span>
              </div>
              
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold tracking-tight">$922,901.00</h3>
                <span className="text-[9px] font-semibold text-gray-500 mt-1 block">Expected cash position (Next 30 days)</span>
              </div>
            </div>

            {/* Recharts Bar Chart in slate-dark */}
            <div className="w-full h-32 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                  <Bar dataKey="val">
                    {forecastData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 4 ? '#6254ff' : '#2d2f3d'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold mt-4 pt-3 border-t border-neutral-800">
              <span>Weekly trend overview</span>
              <Link to="/dashboard" className="text-[#8b7eff] hover:underline flex items-center gap-0.5">
                <span>View Full Projection</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </section>

        {/* PRICING PLANS SECTION */}
        <section className="bg-white border border-gray-100 rounded-[40px] p-8 lg:p-12 shadow-sm text-center space-y-12">
          <div>
            <span className="text-[10px] bg-[#6254ff]/10 text-[#6254ff] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">Pricing Plans</span>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-3">Scale your automated finance operations</h2>
            <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1.5 max-w-md mx-auto">
              Choose the perfect plan to run your reconciliation batches, manage exception logs, and query billing statements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            
            {/* Plan 1 */}
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 text-left flex flex-col justify-between min-h-[300px]">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">Starter</span>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-2">$13<span className="text-xs font-bold text-gray-400">/mo</span></h3>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">Perfect for micro-businesses looking to automate bank matching.</p>
              </div>
              <ul className="space-y-2 text-[10px] font-bold text-gray-600 mt-6">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#6254ff]" />
                  <span>50 reconciliation records/mo</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#6254ff]" />
                  <span>Basic amount/date rule matching</span>
                </li>
              </ul>
              <button 
                onClick={() => navigate('/register')}
                className="w-full mt-6 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
              >
                Choose Plan
              </button>
            </div>

            {/* Plan 2: Pro (Active highlight) */}
            <div className="bg-[#6254ff] text-white border border-[#6254ff] rounded-3xl p-6 text-left flex flex-col justify-between min-h-[300px] shadow-lg shadow-primary-500/10 relative overflow-hidden transform md:-translate-y-2">
              <div className="absolute top-2 right-2 bg-white/20 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase">Popular</div>
              <div>
                <span className="text-xs font-bold text-white/70 uppercase">Standard Pro</span>
                <h3 className="text-3xl font-extrabold text-white mt-2">$23<span className="text-xs font-bold text-white/70">/mo</span></h3>
                <p className="text-[11px] text-white/80 mt-2 leading-relaxed">Full fuzzy matching operations and exceptions reporting logs.</p>
              </div>
              <ul className="space-y-2 text-[10px] font-bold text-white/90 mt-6">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                  <span>500 reconciliation records/mo</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                  <span>AI Semantic matching & classification</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                  <span>Interactive exceptions dashboard</span>
                </li>
              </ul>
              <button 
                onClick={() => navigate('/register')}
                className="w-full mt-6 bg-white text-[#6254ff] hover:bg-white/95 text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-md"
              >
                Choose Plan
              </button>
            </div>

            {/* Plan 3 */}
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 text-left flex flex-col justify-between min-h-[300px]">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">Enterprise</span>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-2">$195<span className="text-xs font-bold text-gray-400">/mo</span></h3>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">Unlimited processing and direct webhook integrations for gateways.</p>
              </div>
              <ul className="space-y-2 text-[10px] font-bold text-gray-600 mt-6">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#6254ff]" />
                  <span>Unlimited records matching</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#6254ff]" />
                  <span>Custom LLM fine-tuning & RAG</span>
                </li>
              </ul>
              <button 
                onClick={() => navigate('/register')}
                className="w-full mt-6 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
              >
                Choose Plan
              </button>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 bg-white py-10 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-400 font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center">
              <RazorpayLogo className="w-3.5 h-3.5" />
            </div>
            <span>© 2026 AI Finance Controller. Powered by Razorpay Finance API & Groq Engine.</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="#" className="hover:text-gray-600">Privacy Policy</Link>
            <Link to="#" className="hover:text-gray-600">Terms of Service</Link>
            <Link to="/api-test" className="hover:text-gray-600 text-[#6254ff]">Sandbox API Docs</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
