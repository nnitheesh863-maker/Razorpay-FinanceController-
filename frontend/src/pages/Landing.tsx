import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ChevronRight, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  HelpCircle,
  FileText,
  Database,
  Sliders,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

// High-fidelity Logo with intersecting curves representing cash flow and reconciliation
const Logo = () => (
  <div className="flex items-center gap-2.5 text-left">
    <div className="relative w-8 h-8 flex items-center justify-center">
      <svg className="w-full h-full text-[#2F6F73]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 50C20 33.4315 33.4315 20 50 20C66.5685 20 80 33.4315 80 50" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
        <path d="M80 50C80 66.5685 66.5685 80 50 80C33.4315 80 20 66.5685 20 50" stroke="#7FA7A3" strokeWidth="10" strokeLinecap="round" />
      </svg>
      <div className="absolute w-2 h-2 rounded-full bg-[#2F6F73] top-3.5 right-3.5" />
    </div>
    <div className="flex flex-col">
      <span className="font-extrabold text-[#0B1726] text-sm tracking-tight leading-none">AI Finance</span>
      <span className="text-[10px] font-semibold text-[#5F6B78] mt-0.5">Controller</span>
    </div>
  </div>
);

// Cash position forecast data
const cashForecastData = [
  { day: 'Aug 10', actual: 18.2, projected: 18.2 },
  { day: 'Aug 13', actual: 20.4, projected: 20.4 },
  { day: 'Aug 16', actual: 19.1, projected: 19.1 },
  { day: 'Aug 19', actual: 22.8, projected: 22.8 },
  { day: 'Aug 22', actual: 24.5, projected: 24.5 },
  { day: 'Aug 25', actual: null, projected: 25.1 },
  { day: 'Aug 28', actual: null, projected: 26.0 },
];

export function Landing() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [activeQuestion, setActiveQuestion] = useState('low-reconciliation');
  const [hoveredReconcileRow, setHoveredReconcileRow] = useState<number | null>(null);

  // Copilot simulated Q&A responses
  const qaResponses: Record<string, { query: string; answer: string; stats?: { val: string; label: string }[]; highlight?: string }> = {
    'low-reconciliation': {
      query: "Why is today's reconciliation rate low?",
      answer: "Reconciliation is currently at 91%. The remaining 9% consists of 5 exceptions: three are bank payouts with a ₹120 processing fee mismatch, and two are missing transaction records from Razorpay settlement route limits.",
      stats: [
        { val: "91%", label: "Match Rate" },
        { val: "5", label: "Exceptions" }
      ],
      highlight: "Expected action: Update fee rules to automate processing discrepancies."
    },
    'largest-exceptions': {
      query: "What are the largest unresolved exceptions?",
      answer: "There is one critical discrepancy of ₹2,10,000 for client invoice INV-2026-PERF-1061. A payment was received but could not be mapped to any invoice due to a missing bank transaction reference code.",
      stats: [
        { val: "₹2.10L", label: "Unresolved Value" },
        { val: "INV-1061", label: "Invoice ID" }
      ],
      highlight: "Recommendation: Manually map reference INV-1061 to UPI Payout ID pay_perf_100061."
    },
    'cash-expected': {
      query: "How much cash is expected in 30 days?",
      answer: "We project a cash position of ₹26.0L in 30 days, representing an inflow of ₹8.2L and expected outflows of ₹6.7L. Note that ₹3.1L of projected inflows depend on overdue invoices.",
      stats: [
        { val: "₹26.0L", label: "Projected Cash" },
        { val: "₹3.1L", label: "At Risk" }
      ],
      highlight: "Action item: Automate dunning alerts for Acme Corp & Delta LLC."
    },
    'txn-1023': {
      query: "Why wasn't TXN-1023 matched?",
      answer: "TXN-1023 (₹85,000) was flag-blocked because the customer name 'Tata Tech' did not match the invoice reference 'Tata Technologies Pvt Ltd' within the strict ruleset tolerance.",
      stats: [
        { val: "₹85k", label: "Amount Mismatch" },
        { val: "Fuzzy Name", label: "Failure Reason" }
      ],
      highlight: "AI Recommendation: Match score is 94.2%. Click 'Review' to authorize this match."
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-[#0B1726] selection:bg-[#2F6F73]/20 flex flex-col relative">
      
      {/* Subtle top banner */}
      <div className="bg-[#DDECEF] py-2 px-6 text-center text-[10px] md:text-xs font-bold text-[#2F6F73] tracking-wide flex items-center justify-center gap-1.5 border-b border-[#E5EAED] w-full">
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI recommends. Rules verify. Humans decide. Experience our evidence-first finance control.</span>
      </div>

      {/* Minimal Premium Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5EAED]/50 transition-all w-full">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo />
          
          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-[#5F6B78]">
            <a href="#problem" className="hover:text-[#2F6F73] transition-colors">Product</a>
            <a href="#core-loop" className="hover:text-[#2F6F73] transition-colors">How It Works</a>
            <a href="#reconciliation" className="hover:text-[#2F6F73] transition-colors">Reconciliation</a>
            <a href="#evidence-ai" className="hover:text-[#2F6F73] transition-colors">AI Engine</a>
            <a href="#cash-intelligence" className="hover:text-[#2F6F73] transition-colors">Cash Intelligence</a>
          </nav>

          <div className="flex items-center gap-3">
            {token ? (
              <Link 
                to="/dashboard"
                className="bg-[#0F2433] hover:bg-[#1f3b4f] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>Launch Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link 
                  to="/login"
                  className="text-xs font-bold text-[#5F6B78] hover:text-[#2F6F73] px-3 py-2 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register"
                  className="bg-[#2F6F73] hover:bg-[#25575a] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Launch Demo
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#F4F7F8]/60 to-white pt-16 pb-24 border-b border-[#E5EAED] text-left w-full">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Left Info */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 bg-[#DDECEF] text-[#2F6F73] px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-[#2F6F73]/10">
              <Sparkles className="w-3 h-3" />
              <span>Finance Control Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6.5xl font-serif font-normal text-[#0B1726] tracking-tight leading-[1.1] max-w-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              Turn financial chaos<br />into <span className="italic text-[#2F6F73]">controlled cash</span>.
            </h1>
            
            <p className="text-sm md:text-base text-[#5F6B78] font-medium leading-relaxed max-w-xl">
              <strong className="text-[#0B1726] font-semibold">AI Finance Controller</strong> — an evidence-first finance control layer that reconciles transactions, surfaces exceptions, explains decisions, and forecasts cash position.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-4">
              {token ? (
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-[#2F6F73] hover:bg-[#25575a] text-white px-7 py-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-[#2F6F73]/10"
                >
                  <span>Launch Demo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/register')}
                    className="bg-[#2F6F73] hover:bg-[#25575a] text-white px-7 py-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-[#2F6F73]/10"
                  >
                    <span>Launch Demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a 
                    href="#core-loop"
                    className="bg-white border border-[#E5EAED] hover:bg-neutral-50 text-[#5F6B78] px-6 py-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    See How It Works
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Hero Right visual */}
          <div className="lg:col-span-5 relative flex justify-center w-full">
            {/* Premium FinTech Visual composition */}
            <div className="relative w-full max-w-[420px] bg-gradient-to-tr from-[#F4F7F8] to-white border border-[#E5EAED] rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[380px] overflow-hidden">
              
              {/* Visual Connection Diagram representing reconciliation */}
              <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-center">
                
                {/* Floating badge 1 */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-[#E5EAED] p-3 rounded-xl shadow-xs flex items-center gap-2 max-w-[280px] self-start"
                >
                  <div className="w-6 h-6 rounded bg-[#DDECEF] flex items-center justify-center text-[#2F6F73]">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] font-bold text-[#5F6B78] uppercase leading-none">Expected Invoice</p>
                    <p className="text-xs font-bold text-[#0B1726] mt-0.5">₹2,40,000.00</p>
                  </div>
                </motion.div>

                {/* Matching dotted line connector */}
                <div className="h-6 w-0.5 border-l-2 border-dashed border-[#7FA7A3] ml-6 opacity-60" />

                {/* Floating badge 2 */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white border border-[#E5EAED] p-3 rounded-xl shadow-xs flex items-center gap-2 max-w-[280px] self-end"
                >
                  <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] font-bold text-green-600 uppercase leading-none">98.7% Match Confidence</p>
                    <p className="text-xs font-bold text-[#0B1726] mt-0.5">UPI Capture Match</p>
                  </div>
                </motion.div>

                <div className="h-6 w-0.5 border-l-2 border-dashed border-[#7FA7A3] ml-64 opacity-60" />

                {/* Floating badge 3 */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-[#0F2433] text-white p-3 rounded-xl shadow-sm flex items-center justify-between gap-3 max-w-[280px] self-start"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-[#7FA7A3]">
                      <Database className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-[8px] font-bold text-[#7FA7A3] uppercase leading-none">Audit Timeline</p>
                      <p className="text-[10px] font-bold mt-0.5">Reconciliation complete</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-green-600/35 text-green-400 font-bold px-1.5 py-0.5 rounded-full">
                    91% Reconciled
                  </span>
                </motion.div>

              </div>

              <div className="absolute top-2 right-2 border border-amber-200 bg-amber-50 text-[#C58B24] rounded-lg p-2 text-[9px] font-bold flex items-center gap-1 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>₹2.4L Requires Attention</span>
              </div>

              {/* Cash forecast strip */}
              <div className="bg-[#DDECEF]/65 border border-[#2F6F73]/10 p-2.5 rounded-xl mt-4 flex items-center justify-between text-[10px] font-bold text-[#2F6F73] relative z-10">
                <span>30-Day Cash Forecast</span>
                <span className="text-[#0B1726]">₹26.0L Projected</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Trust strip */}
      <div className="bg-[#F4F7F8]/40 border-b border-[#E5EAED] py-6 w-full">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-[10px] md:text-xs font-bold text-[#5F6B78] uppercase tracking-wider text-left">
            Built for finance teams that need answers they can verify.
          </span>
          <div className="flex flex-wrap justify-center gap-5 md:gap-7 text-[10px] font-extrabold text-[#7FA7A3] uppercase tracking-widest">
            <span>Reconciliation</span>
            <span>Payments</span>
            <span>Invoices</span>
            <span>Settlements</span>
            <span>Cash Flow</span>
            <span>Audit</span>
          </div>
        </div>
      </div>

      {/* Section: The Finance Problem */}
      <section id="problem" className="py-24 border-b border-[#E5EAED] text-left bg-white w-full">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[9px] bg-[#DDECEF] text-[#2F6F73] px-3 py-1 rounded-full font-bold uppercase tracking-wider">The Challenge</span>
            <h2 className="text-3xl md:text-4xl font-serif text-[#0B1726] tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Your financial data<br />is <span className="italic text-[#C94C4C]">everywhere</span>.
            </h2>
            <p className="text-xs md:text-sm text-[#5F6B78] leading-relaxed font-medium">
              Bank transactions live in one system. Invoices in another. Payments somewhere else. Settlements arrive later. And exceptions end up in spreadsheets.
            </p>
            <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-xs text-[#C94C4C] font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Manual alignment of files leads to processing leakage, untracked gateway fees, and delayed book closing cycles.</p>
            </div>
          </div>

          <div className="lg:col-span-7 flex justify-center w-full">
            {/* Disconnected systems transitioning to central node */}
            <div className="bg-[#F4F7F8]/50 border border-[#E5EAED] rounded-3xl p-6 md:p-8 w-full max-w-xl text-center space-y-6 relative overflow-hidden">
              <span className="text-[9px] font-extrabold text-[#7FA7A3] uppercase tracking-wider block">Unified Control Layer Connection Flow</span>
              
              <div className="grid grid-cols-5 gap-2 relative">
                
                {/* Left Column Input nodes */}
                <div className="col-span-2 space-y-2 flex flex-col justify-center text-xs">
                  <div className="p-2.5 bg-white border border-[#E5EAED] rounded-lg font-bold text-[#0B1726] flex items-center justify-between">
                    <span>Bank Payouts</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  </div>
                  <div className="p-2.5 bg-white border border-[#E5EAED] rounded-lg font-bold text-[#0B1726] flex items-center justify-between">
                    <span>Invoices API</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  </div>
                  <div className="p-2.5 bg-white border border-[#E5EAED] rounded-lg font-bold text-[#0B1726] flex items-center justify-between">
                    <span>Gateway Payments</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  </div>
                  <div className="p-2.5 bg-white border border-[#E5EAED] rounded-lg font-bold text-[#0B1726] flex items-center justify-between">
                    <span>Settlements Data</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </div>
                </div>

                {/* Connective arrows placeholder */}
                <div className="col-span-1 flex flex-col justify-center items-center opacity-60">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent to-[#2F6F73] border-t border-dashed border-[#7FA7A3] my-1" />
                  <ChevronRight className="w-4 h-4 text-[#2F6F73] animate-pulse" />
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent to-[#2F6F73] border-t border-dashed border-[#7FA7A3] my-1" />
                </div>

                {/* Central Node */}
                <div className="col-span-2 flex flex-col justify-center items-center">
                  <div className="p-4 bg-white border border-[#2F6F73]/30 rounded-2xl shadow-sm text-center space-y-2 max-w-[160px]">
                    <div className="w-9 h-9 rounded-full bg-[#DDECEF] flex items-center justify-center text-[#2F6F73] mx-auto">
                      <Logo />
                    </div>
                    <span className="text-[10px] font-extrabold text-[#0B1726] block">AI Controller</span>
                    <span className="text-[8px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold">Closed Loop</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Section: Core Loop */}
      <section id="core-loop" className="py-24 border-b border-[#E5EAED] bg-[#F4F7F8]/30 w-full">
        <div className="max-w-7xl mx-auto px-6 text-left space-y-12">
          <div>
            <span className="text-[9px] bg-[#DDECEF] text-[#2F6F73] px-3 py-1 rounded-full font-bold uppercase tracking-wider">The Process</span>
            <h2 className="text-3xl font-serif text-[#0B1726] tracking-tight mt-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              One control loop.<br /><span className="italic text-[#2F6F73]">From transaction to decision.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Step 1 */}
            <div className="bg-white border border-[#E5EAED] p-6 rounded-2xl text-left space-y-4 hover:border-[#2F6F73]/25 transition-colors shadow-2xs">
              <span className="text-3xl font-serif font-normal text-[#7FA7A3]">01</span>
              <div>
                <h3 className="text-sm font-bold text-[#0B1726] uppercase tracking-wider">Ingest</h3>
                <p className="text-xs text-[#5F6B78] mt-1.5 leading-relaxed font-medium">Bring in bank statements, gateway events, invoices, and ledger records automatically.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-[#E5EAED] p-6 rounded-2xl text-left space-y-4 hover:border-[#2F6F73]/25 transition-colors shadow-2xs">
              <span className="text-3xl font-serif font-normal text-[#7FA7A3]">02</span>
              <div>
                <h3 className="text-sm font-bold text-[#0B1726] uppercase tracking-wider">Reconcile</h3>
                <p className="text-xs text-[#5F6B78] mt-1.5 leading-relaxed font-medium">Compare records instantly using strict, configurable deterministic business rules.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-[#E5EAED] p-6 rounded-2xl text-left space-y-4 hover:border-[#2F6F73]/25 transition-colors shadow-2xs">
              <span className="text-3xl font-serif font-normal text-[#7FA7A3]">03</span>
              <div>
                <h3 className="text-sm font-bold text-[#0B1726] uppercase tracking-wider">Analyze</h3>
                <p className="text-xs text-[#5F6B78] mt-1.5 leading-relaxed font-medium">The AI assistant inspects fuzzy data, matches descriptions, and categorizes exceptions.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-[#E5EAED] p-6 rounded-2xl text-left space-y-4 hover:border-[#2F6F73]/25 transition-colors shadow-2xs">
              <span className="text-3xl font-serif font-normal text-[#7FA7A3]">04</span>
              <div>
                <h3 className="text-sm font-bold text-[#0B1726] uppercase tracking-wider">Review</h3>
                <p className="text-xs text-[#5F6B78] mt-1.5 leading-relaxed font-medium">Finance controllers inspect discrepancies and authorize final mappings with one click.</p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-white border border-[#E5EAED] p-6 rounded-2xl text-left space-y-4 hover:border-[#2F6F73]/25 transition-colors shadow-2xs">
              <span className="text-3xl font-serif font-normal text-[#7FA7A3]">05</span>
              <div>
                <h3 className="text-sm font-bold text-[#0B1726] uppercase tracking-wider">Forecast</h3>
                <p className="text-xs text-[#5F6B78] mt-1.5 leading-relaxed font-medium">Transform verified ledger data into a forward-looking 30-day cash visibility matrix.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Section: Reconciliation */}
      <section id="reconciliation" className="py-24 border-b border-[#E5EAED] text-left bg-white w-full">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[9px] bg-[#DDECEF] text-[#2F6F73] px-3 py-1 rounded-full font-bold uppercase tracking-wider">Deterministic Engine</span>
            <h2 className="text-3xl font-serif text-[#0B1726] tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              100 records.<br /><span className="italic text-[#2F6F73]">One clear answer.</span>
            </h2>
            <p className="text-xs md:text-sm text-[#5F6B78] leading-relaxed font-medium">
              Automatically compare transactions, invoices, payments and settlements — then measure exactly what matched and what didn't.
            </p>
            
            {/* Batch Stats Row */}
            <div className="grid grid-cols-3 gap-3 border border-[#E5EAED] p-4 rounded-2xl bg-neutral-50">
              <div>
                <p className="text-lg font-bold text-[#0B1726]">91%</p>
                <p className="text-[8px] font-bold text-[#5F6B78] uppercase mt-0.5">Match Rate</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">4</p>
                <p className="text-[8px] font-bold text-[#5F6B78] uppercase mt-0.5">Probable Mappings</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">5</p>
                <p className="text-[8px] font-bold text-[#5F6B78] uppercase mt-0.5">Exceptions</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 w-full">
            {/* Table preview component */}
            <div className="bg-white border border-[#E5EAED] rounded-2xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-[#E5EAED] bg-neutral-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-[#0B1726] uppercase tracking-wider">Active Reconciliation Run</span>
                </div>
                <span className="text-[9px] font-extrabold text-[#7FA7A3]">94.1% Avg Confidence</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E5EAED] text-left text-[11px] font-medium text-[#5F6B78]">
                  <thead className="bg-[#F4F7F8] text-[9px] text-[#0B1726] font-bold uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Transaction</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Matched With</th>
                      <th className="px-4 py-2.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAED]">
                    {[
                      { id: 1, status: 'MATCHED', type: 'UPI Payout', desc: 'Acme Services Corp', val: '₹12,500.00', match: 'INV-1002', reason: 'Reference & Amount Match' },
                      { id: 2, status: 'MATCHED', type: 'Card Payout', desc: 'Delta Cloud Labs', val: '₹47,980.00', match: 'INV-1003', reason: 'Exact Amount Match' },
                      { id: 3, status: 'PROBABLE', type: 'UPI Capture', desc: 'Tata Tech', val: '₹85,000.00', match: 'INV-1014', reason: 'Fuzzy Customer Match (94%)' },
                      { id: 4, status: 'EXCEPTION', type: 'Bank Settlement', desc: 'Unknown Payout', val: '₹2,10,000.00', match: '--', reason: 'Missing Invoice Reference' }
                    ].map((row, idx) => (
                      <tr 
                        key={row.id}
                        className={`hover:bg-[#F4F7F8]/40 transition-colors cursor-default ${hoveredReconcileRow === idx ? 'bg-[#F4F7F8]/20' : ''}`}
                        onMouseEnter={() => setHoveredReconcileRow(idx)}
                        onMouseLeave={() => setHoveredReconcileRow(null)}
                      >
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full ${
                            row.status === 'MATCHED' ? 'bg-green-50 text-green-700' :
                            row.status === 'PROBABLE' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#0B1726]">{row.desc}</p>
                          <p className="text-[9px] text-[#7FA7A3]">{row.type}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-[#0B1726]">{row.val}</td>
                        <td className="px-4 py-3 font-mono font-bold text-[#2F6F73]">{row.match}</td>
                        <td className="px-4 py-3 text-[10px] italic">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Section: Evidence-First AI */}
      <section id="evidence-ai" className="py-24 border-b border-[#E5EAED] bg-[#F4F7F8]/20 w-full">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          <div className="space-y-3">
            <span className="text-[9px] bg-[#DDECEF] text-[#2F6F73] px-3 py-1 rounded-full font-bold uppercase tracking-wider">Explainability</span>
            <h2 className="text-3xl font-serif text-[#0B1726] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              AI that can <span className="italic text-[#2F6F73]">show its work</span>.
            </h2>
            <p className="text-xs md:text-sm text-[#5F6B78] font-medium max-w-lg mx-auto">
              Every recommendation is connected to evidence. No hidden chain-of-thought, only concise, auditable decision factors.
            </p>
          </div>

          {/* Evidence Chain Component */}
          <div className="bg-white border border-[#E5EAED] rounded-3xl p-6 md:p-8 max-w-3xl mx-auto shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5EAED] mb-6 text-left">
              <div>
                <h4 className="text-xs font-bold text-[#0B1726] uppercase">Evidence Chain</h4>
                <p className="text-[10px] text-[#5F6B78] font-semibold mt-0.5">Verification trace for INV-1003 Match recommendation</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full">
                  98.7% Confidence
                </span>
              </div>
            </div>

            {/* Chain visual flow */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center text-xs font-bold text-[#0B1726]">
              <div className="bg-neutral-50 p-2.5 border border-[#E5EAED] rounded-lg">
                <p className="text-[8px] text-[#7FA7A3] uppercase">Source</p>
                <p className="mt-1">Bank Txn</p>
              </div>
              <div className="text-[#2F6F73] font-serif text-lg rotate-90 md:rotate-0">→</div>
              <div className="bg-neutral-50 p-2.5 border border-[#E5EAED] rounded-lg">
                <p className="text-[8px] text-[#7FA7A3] uppercase">Rule 1</p>
                <p className="mt-1">Ref Match</p>
              </div>
              <div className="text-[#2F6F73] font-serif text-lg rotate-90 md:rotate-0">→</div>
              <div className="bg-neutral-50 p-2.5 border border-[#E5EAED] rounded-lg">
                <p className="text-[8px] text-[#7FA7A3] uppercase">Rule 2</p>
                <p className="mt-1">Amount Match</p>
              </div>
              <div className="text-[#2F6F73] font-serif text-lg rotate-90 md:rotate-0">→</div>
              <div className="bg-[#2F6F73] text-white p-2.5 rounded-lg shadow-sm">
                <p className="text-[8px] text-[#7FA7A3] uppercase">Verdict</p>
                <p className="mt-1">Auto-Match</p>
              </div>
            </div>

            {/* Audit checks list */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 mt-6 border-t border-[#E5EAED] text-left text-[11px] font-semibold text-[#5F6B78]">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span>Exact amount match</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span>Reference matched</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span>Customer names match</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span>Date inside settlement window</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Section: AI vs Rules */}
      <section className="py-24 border-b border-[#E5EAED] text-left bg-white w-full">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[9px] bg-[#DDECEF] text-[#2F6F73] px-3 py-1 rounded-full font-bold uppercase tracking-wider">Architectural Balance</span>
            <h2 className="text-3xl font-serif text-[#0B1726] tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              AI recommends.<br /><span className="italic text-[#2F6F73]">Rules verify.</span>
            </h2>
            <p className="text-xs md:text-sm text-[#5F6B78] leading-relaxed font-medium">
              Deterministic business rules handle 92% of perfect matches instantly. The AI assistance model analyzes description contexts and ambiguous references to recommend matches for the remaining 8%.
            </p>
          </div>

          <div className="lg:col-span-7 flex justify-center w-full">
            {/* Architecture comparison visual block */}
            <div className="border border-[#E5EAED] bg-[#F4F7F8]/30 rounded-3xl p-6 w-full max-w-lg space-y-4">
              
              <div className="bg-white border border-[#E5EAED] p-4 rounded-xl flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[8px] font-bold text-[#7FA7A3] uppercase">Deterministic Checks</span>
                  <h4 className="text-xs font-bold text-[#0B1726] mt-0.5">RULE ENGINE</h4>
                  <p className="text-[10px] text-[#5F6B78] font-semibold mt-1">Amount, Currency, Date tolerances, References</p>
                </div>
                <span className="text-xl font-serif font-normal text-[#2F6F73]">92%</span>
              </div>

              <div className="text-[#7FA7A3] text-center font-bold text-xs">+</div>

              <div className="bg-white border border-[#E5EAED] p-4 rounded-xl flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[8px] font-bold text-[#7FA7A3] uppercase">Contextual Intelligence</span>
                  <h4 className="text-xs font-bold text-[#0B1726] mt-0.5">AI ASSISTANCE</h4>
                  <p className="text-[10px] text-[#5F6B78] font-semibold mt-1">Description interpretation, Fuzzy names matching</p>
                </div>
                <span className="text-xl font-serif font-normal text-[#7FA7A3]">8%</span>
              </div>

              <div className="text-[#7FA7A3] text-center font-bold text-xs">=</div>

              <div className="bg-[#0F2433] text-white p-4.5 rounded-xl flex items-center justify-between shadow-sm">
                <div className="text-left">
                  <span className="text-[8px] font-bold text-[#7FA7A3] uppercase">Final Recommendation</span>
                  <h4 className="text-xs font-bold mt-0.5">MATCH VERDICT</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-green-400">98.7% ACCURACY</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Human review gate active</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Section: Exceptions */}
      <section className="py-24 border-b border-[#E5EAED] bg-[#0F2433] text-white w-full">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-[9px] bg-red-600/35 text-red-300 border border-red-500/10 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Precision Control</span>
            <h2 className="text-3xl font-serif text-white tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Don't hide the <span className="italic text-[#7FA7A3]">exceptions</span>.
            </h2>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-medium">
              Good finance automation doesn't pretend everything matches. We surface inconsistencies, duplicate attempts, and fee discrepancies instantly for human audit.
            </p>

            {/* Exception totals widgets */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-800">
              <div>
                <h4 className="text-xl font-bold text-white">5</h4>
                <span className="text-[8px] text-gray-400 font-bold uppercase mt-0.5 block">Unresolved Logs</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-red-400">₹3.10L</h4>
                <span className="text-[8px] text-gray-400 font-bold uppercase mt-0.5 block">Unresolved Value</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-[#7FA7A3]">3</h4>
                <span className="text-[8px] text-gray-400 font-bold uppercase mt-0.5 block">Need Review</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 w-full text-left space-y-3">
            {[
              { label: 'Unmatched reference', val: '₹2,10,000.00', desc: 'Missing invoice reference in bank settlement payouts record' },
              { label: 'Duplicate payment suspected', val: '₹1,10,000.00', desc: 'Two identical card payout transactions detected within 3 seconds' },
              { label: 'Partial mismatch', val: '₹85,000.00', desc: 'Expected invoice amount ₹90,000 but bank payout was ₹85,000' }
            ].map((item, idx) => (
              <div key={idx} className="bg-neutral-900 border border-neutral-800 hover:border-red-500/25 p-4 rounded-xl transition-colors flex items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] text-[#7FA7A3] font-bold uppercase block">{item.label}</span>
                  <p className="text-[10px] text-gray-400 mt-1 font-semibold">{item.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-red-400">{item.val}</p>
                  <span className="text-[8px] bg-red-950 text-red-400 font-extrabold px-1.5 py-0.5 rounded-full mt-1.5 inline-block">Review</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Section: Attention Required */}
      <section className="py-24 border-b border-[#E5EAED] text-left bg-white w-full">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[9px] bg-[#DDECEF] text-[#2F6F73] px-3 py-1 rounded-full font-bold uppercase tracking-wider">Action Board</span>
            <h2 className="text-3xl font-serif text-[#0B1726] tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Know what needs<br />your <span className="italic text-[#2F6F73]">attention</span>.
            </h2>
            <p className="text-xs md:text-sm text-[#5F6B78] leading-relaxed font-medium">
              Our active operations hub filters transaction records and prioritizes items based on value, date warnings, and cutoff times.
            </p>
          </div>

          <div className="lg:col-span-7 w-full space-y-3">
            <div className="bg-white border border-[#E5EAED] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 bg-amber-50/50 border-b border-[#E5EAED] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#C58B24]" />
                  <span className="text-[10px] font-bold text-[#0B1726] uppercase tracking-wider">ATTENTION REQUIRED</span>
                </div>
                <span className="text-[8px] bg-amber-100 text-[#C58B24] font-extrabold px-2 py-0.5 rounded-full">3 Warnings</span>
              </div>

              <div className="divide-y divide-[#E5EAED] text-xs font-semibold text-[#5F6B78]">
                <div className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                  <div>
                    <p className="text-[10px] text-[#0B1726] font-bold">Priority 1: ₹2.10L payment has no matching invoice</p>
                    <p className="text-[9px] text-[#7FA7A3] mt-0.5">Cutoff: 3 hours remaining</p>
                  </div>
                  <button 
                    onClick={() => navigate('/exceptions')}
                    className="text-[9px] bg-[#2F6F73] text-white hover:bg-[#25575a] px-3 py-1 rounded-lg font-bold cursor-pointer"
                  >
                    Review
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                  <div>
                    <p className="text-[10px] text-[#0B1726] font-bold">Priority 2: Suspicious duplicate card payout detected</p>
                    <p className="text-[9px] text-[#7FA7A3] mt-0.5">Value: ₹1.10L • Gateway ID pay_perf_104</p>
                  </div>
                  <button 
                    onClick={() => navigate('/exceptions')}
                    className="text-[9px] bg-[#2F6F73] text-white hover:bg-[#25575a] px-3 py-1 rounded-lg font-bold cursor-pointer"
                  >
                    Review
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                  <div>
                    <p className="text-[10px] text-[#0B1726] font-bold">Priority 3: ₹85K customer invoice overdue</p>
                    <p className="text-[9px] text-[#7FA7A3] mt-0.5">Client: Acme Corp • 5 days outstanding</p>
                  </div>
                  <button 
                    onClick={() => navigate('/invoices')}
                    className="text-[9px] bg-[#2F6F73] text-white hover:bg-[#25575a] px-3 py-1 rounded-lg font-bold cursor-pointer"
                  >
                    Review
                  </button>
                </div>
              </div>

              <div className="bg-[#F4F7F8] p-3 text-[10px] font-semibold text-[#5F6B78] border-t border-[#E5EAED] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#2F6F73]" />
                <span>AI recommendation: <strong className="text-[#0B1726]">Review the first exception before today's settlement cutoff.</strong></span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Section: Cash Intelligence */}
      <section id="cash-intelligence" className="py-24 border-b border-[#E5EAED] bg-[#F4F7F8]/30 w-full text-left">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[9px] bg-[#DDECEF] text-[#2F6F73] px-3 py-1 rounded-full font-bold uppercase tracking-wider">Predictive Modeling</span>
            <h2 className="text-3xl font-serif text-[#0B1726] tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Know where your<br />cash is <span className="italic text-[#2F6F73]">going</span>.
            </h2>
            <p className="text-xs md:text-sm text-[#5F6B78] leading-relaxed font-medium">
              Reconciliation completes the loop. Turn matched data, pending balances, and overdue invoices into an intelligent, forward-looking cash forecasting projection.
            </p>

            {/* Cash Forecast Overview Row */}
            <div className="grid grid-cols-2 gap-3 border border-[#E5EAED] bg-white p-4 rounded-xl">
              <div>
                <span className="text-[8px] font-bold text-[#7FA7A3] uppercase">Current Cash</span>
                <p className="text-lg font-bold text-[#0B1726] mt-0.5">₹24.5L</p>
              </div>
              <div>
                <span className="text-[8px] font-bold text-[#7FA7A3] uppercase">30-Day Projected</span>
                <p className="text-lg font-bold text-[#2F6F73] mt-0.5">₹26.0L</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 w-full">
            {/* Cash Line Chart Block */}
            <div className="bg-white border border-[#E5EAED] rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
              
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-[#0B1726] uppercase">30-Day Cash Forecast</h4>
                  <p className="text-[10px] text-[#5F6B78] font-semibold">Consolidated projections for Indian Rupee (INR)</p>
                </div>
                <div className="flex gap-4 text-[9px] font-bold">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#2F6F73] inline-block" /> ACTUAL</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#7FA7A3] border-t border-dashed inline-block" /> PROJECTED</span>
                </div>
              </div>

              {/* Line Chart */}
              <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashForecastData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAED" />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#7FA7A3' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#7FA7A3' }} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#2F6F73" 
                      strokeWidth={2} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 6 }} 
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="projected" 
                      stroke="#7FA7A3" 
                      strokeWidth={1.5} 
                      strokeDasharray="4 4" 
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-[10px] text-[#C58B24] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>AI cash insight: <strong className="text-[#0B1726]">₹3.1L of projected inflows depend on overdue invoices.</strong></span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Section: Finance Control Score */}
      <section className="py-24 border-b border-[#E5EAED] text-left bg-white w-full">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[9px] bg-[#DDECEF] text-[#2F6F73] px-3 py-1 rounded-full font-bold uppercase tracking-wider">Health Index</span>
            <h2 className="text-3xl font-serif text-[#0B1726] tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Measure your<br />finance <span className="italic text-[#2F6F73]">control score</span>.
            </h2>
            <p className="text-xs md:text-sm text-[#5F6B78] leading-relaxed font-medium">
              A single view of how controlled your finance operations are. Automatically aggregated based on batch speeds, unresolved discrepancy age, and accuracy index ratings.
            </p>
          </div>

          <div className="lg:col-span-7 flex justify-center w-full">
            {/* Score widget */}
            <div className="bg-white border border-[#E5EAED] rounded-3xl p-6 w-full max-w-md shadow-md grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Large score display */}
              <div className="md:col-span-5 text-center space-y-2 border-b md:border-b-0 md:border-r border-[#E5EAED] pb-6 md:pb-0 md:pr-6">
                <h3 className="text-5xl font-serif font-normal text-[#2F6F73]">92</h3>
                <p className="text-[8px] font-bold text-[#5F6B78] uppercase">Finance Control Score</p>
                <span className="inline-block bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase mt-1">
                  EXCELLENT
                </span>
              </div>

              {/* Score breakdown parameters */}
              <div className="md:col-span-7 space-y-2.5 text-xs text-[#5F6B78] font-bold">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span>Reconciliation Accuracy</span>
                    <span className="text-[#0B1726]">96</span>
                  </div>
                  <div className="w-full bg-[#E5EAED] h-1.5 rounded-full"><div className="bg-[#2F6F73] h-1.5 rounded-full" style={{ width: '96%' }} /></div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span>Data Quality Index</span>
                    <span className="text-[#0B1726]">91</span>
                  </div>
                  <div className="w-full bg-[#E5EAED] h-1.5 rounded-full"><div className="bg-[#2F6F73] h-1.5 rounded-full" style={{ width: '91%' }} /></div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span>Exception Handling Speed</span>
                    <span className="text-[#0B1726]">88</span>
                  </div>
                  <div className="w-full bg-[#E5EAED] h-1.5 rounded-full"><div className="bg-[#7FA7A3] h-1.5 rounded-full" style={{ width: '88%' }} /></div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span>Cash Visibility Index</span>
                    <span className="text-[#0B1726]">95</span>
                  </div>
                  <div className="w-full bg-[#E5EAED] h-1.5 rounded-full"><div className="bg-[#2F6F73] h-1.5 rounded-full" style={{ width: '95%' }} /></div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Section: AI Copilot */}
      <section className="py-24 border-b border-[#E5EAED] bg-[#F4F7F8]/30 w-full text-left">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* AI Copilot Info */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[9px] bg-[#DDECEF] text-[#2F6F73] px-3 py-1 rounded-full font-bold uppercase tracking-wider">Natural Query Engine</span>
            <h2 className="text-3xl font-serif text-[#0B1726] tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Ask your <span className="italic text-[#2F6F73]">numbers</span>.
            </h2>
            <p className="text-xs md:text-sm text-[#5F6B78] leading-relaxed font-medium">
              Query your reconciliation runs, outstanding collections, and exception values using natural language. We translate prompts into exact verified ledger evidence trace logs.
            </p>

            {/* Demo Selector Questions */}
            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => setActiveQuestion('low-reconciliation')}
                className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                  activeQuestion === 'low-reconciliation' 
                    ? 'bg-white border-[#2F6F73] text-[#2F6F73] shadow-2xs' 
                    : 'bg-transparent border-[#E5EAED] text-[#5F6B78] hover:bg-white'
                }`}
              >
                <span>Why is today's reconciliation rate low?</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setActiveQuestion('largest-exceptions')}
                className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                  activeQuestion === 'largest-exceptions' 
                    ? 'bg-white border-[#2F6F73] text-[#2F6F73] shadow-2xs' 
                    : 'bg-transparent border-[#E5EAED] text-[#5F6B78] hover:bg-white'
                }`}
              >
                <span>What are the largest unresolved exceptions?</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setActiveQuestion('cash-expected')}
                className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                  activeQuestion === 'cash-expected' 
                    ? 'bg-white border-[#2F6F73] text-[#2F6F73] shadow-2xs' 
                    : 'bg-transparent border-[#E5EAED] text-[#5F6B78] hover:bg-white'
                }`}
              >
                <span>How much cash is expected in 30 days?</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setActiveQuestion('txn-1023')}
                className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                  activeQuestion === 'txn-1023' 
                    ? 'bg-white border-[#2F6F73] text-[#2F6F73] shadow-2xs' 
                    : 'bg-transparent border-[#E5EAED] text-[#5F6B78] hover:bg-white'
                }`}
              >
                <span>Why wasn't TXN-1023 matched?</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* AI Response Preview Block */}
          <div className="lg:col-span-7 w-full">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="bg-white border border-[#E5EAED] rounded-3xl p-6 shadow-md space-y-6 text-left"
              >
                {/* Query header */}
                <div className="flex items-center gap-2 border-b border-[#E5EAED] pb-4">
                  <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-[#5F6B78]">Q</div>
                  <span className="text-xs font-bold text-[#0B1726]">{qaResponses[activeQuestion].query}</span>
                </div>

                {/* AI Response body */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#2F6F73] text-white flex items-center justify-center text-[9px] font-bold">AI</div>
                  <div className="space-y-4 flex-1">
                    <p className="text-[11px] md:text-xs text-[#0B1726] leading-relaxed font-semibold">
                      {qaResponses[activeQuestion].answer}
                    </p>

                    {/* Stat summary card inside response */}
                    {qaResponses[activeQuestion].stats && (
                      <div className="grid grid-cols-2 gap-3 max-w-[280px] bg-[#F4F7F8] p-3 rounded-xl border border-[#E5EAED]">
                        {qaResponses[activeQuestion].stats.map((st, i) => (
                          <div key={i}>
                            <span className="text-[8px] text-[#7FA7A3] uppercase block font-bold">{st.label}</span>
                            <span className="text-sm font-bold text-[#0B1726] mt-0.5 block">{st.val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI recommendation action strip */}
                    {qaResponses[activeQuestion].highlight && (
                      <div className="p-3 bg-[#DDECEF]/60 text-[#2F6F73] rounded-xl text-[10px] font-bold flex items-center gap-1.5 border border-[#2F6F73]/10">
                        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{qaResponses[activeQuestion].highlight}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </section>

      {/* Section: Auditability */}
      <section className="py-24 border-b border-[#E5EAED] text-left bg-white w-full">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[9px] bg-[#DDECEF] text-[#2F6F73] px-3 py-1 rounded-full font-bold uppercase tracking-wider">Auditability</span>
            <h2 className="text-3xl font-serif text-[#0B1726] tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Every decision<br />leaves a <span className="italic text-[#2F6F73]">trail</span>.
            </h2>
            <p className="text-xs md:text-sm text-[#5F6B78] leading-relaxed font-medium">
              Financial automation you can inspect, explain, and audit. All batch runs record exact timestamps, matching thresholds, and user verification hashes.
            </p>
          </div>

          <div className="lg:col-span-7 w-full flex justify-center">
            {/* Vertical timeline component */}
            <div className="border border-[#E5EAED] rounded-3xl p-6 md:p-8 w-full max-w-md bg-[#F4F7F8]/20 space-y-4">
              <span className="text-[9px] font-bold text-[#7FA7A3] uppercase block border-b border-[#E5EAED] pb-3">Audit Logs Timeline</span>

              <div className="space-y-4 relative pl-4 border-l-2 border-[#DDECEF] ml-2">
                
                <div className="relative">
                  <div className="absolute w-2 h-2 rounded-full bg-[#7FA7A3] -left-[19px] top-1" />
                  <p className="text-[9px] font-extrabold text-[#7FA7A3]">09:42 AM</p>
                  <p className="text-xs font-bold text-[#0B1726] mt-0.5">Gateway Data Imported</p>
                  <p className="text-[10px] text-[#5F6B78]">100 records imported from payment api</p>
                </div>

                <div className="relative">
                  <div className="absolute w-2 h-2 rounded-full bg-[#7FA7A3] -left-[19px] top-1" />
                  <p className="text-[9px] font-extrabold text-[#7FA7A3]">09:43 AM</p>
                  <p className="text-xs font-bold text-[#0B1726] mt-0.5">Reconciliation Engine Started</p>
                  <p className="text-[10px] text-[#5F6B78]">Applying deterministic matching rulesets</p>
                </div>

                <div className="relative">
                  <div className="absolute w-2 h-2 rounded-full bg-[#2F6F73] -left-[19px] top-1" />
                  <p className="text-[9px] font-extrabold text-[#2F6F73]">09:44 AM</p>
                  <p className="text-xs font-bold text-[#0B1726] mt-0.5">91 Perfect Matches Recorded</p>
                  <p className="text-[10px] text-[#5F6B78]">Exact reference codes and amount alignment verified</p>
                </div>

                <div className="relative">
                  <div className="absolute w-2 h-2 rounded-full bg-[#7FA7A3] -left-[19px] top-1" />
                  <p className="text-[9px] font-extrabold text-[#7FA7A3]">09:45 AM</p>
                  <p className="text-xs font-bold text-[#0B1726] mt-0.5">AI Contextual Analysis Finished</p>
                  <p className="text-[10px] text-[#5F6B78]">Fuzzy match score resolved for 4 ambiguous tags</p>
                </div>

                <div className="relative">
                  <div className="absolute w-2 h-2 rounded-full bg-green-600 -left-[19px] top-1" />
                  <p className="text-[9px] font-extrabold text-green-600">09:46 AM</p>
                  <p className="text-xs font-bold text-[#0B1726] mt-0.5">Exception Approved By Admin</p>
                  <p className="text-[10px] text-gray-500 italic">Audit signature: auth_hash_8f912c</p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Section: Final CTA */}
      <section className="bg-[#0F2433] text-white py-24 text-center relative overflow-hidden w-full">
        {/* Subtle animated background lines pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100 Q 300 200 600 100 T 1200 150 T 1800 50" fill="none" stroke="white" strokeWidth="2" />
            <path d="M0 250 Q 400 100 800 200 T 1600 150" fill="none" stroke="white" strokeWidth="2" />
          </svg>
        </div>

        <div className="max-w-3xl mx-auto px-6 space-y-8 relative z-10">
          <span className="text-[9px] bg-white/10 text-[#7FA7A3] border border-white/10 px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider">Ready to Integrate</span>
          <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Close the loop.
          </h2>
          <p className="text-xs md:text-sm text-gray-400 font-semibold max-w-md mx-auto leading-relaxed">
            Reconcile the books. Understand the exceptions. See your cash position.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {token ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="bg-white hover:bg-neutral-50 text-[#0F2433] px-8 py-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Launch Demo
              </button>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/register')}
                  className="bg-white hover:bg-neutral-50 text-[#0F2433] px-8 py-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Launch Demo
                </button>
                <a 
                  href="#problem"
                  className="bg-white/10 hover:bg-white/15 border border-white/10 text-white px-7 py-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Explore the Platform
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5EAED] bg-white py-12 w-full text-left">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 text-xs text-[#5F6B78]">
          
          {/* Footer Logo Column */}
          <div className="md:col-span-4 space-y-4">
            <Logo />
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed max-w-xs">
              © 2026 AI Finance Controller. Powered by Razorpay Finance API & Groq Engine.
            </p>
            <p className="text-[9px] font-bold text-[#2F6F73] italic">
              "AI recommends. Rules verify. Humans decide."
            </p>
          </div>

          {/* Links columns */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-extrabold text-[#0B1726] uppercase text-[9px] tracking-wider">Product</h4>
            <ul className="space-y-2 font-semibold">
              <li><a href="#core-loop" className="hover:text-[#2F6F73]">Overview</a></li>
              <li><a href="#reconciliation" className="hover:text-[#2F6F73]">Reconciliation</a></li>
              <li><a href="#evidence-ai" className="hover:text-[#2F6F73]">AI Controller</a></li>
              <li><a href="#cash-intelligence" className="hover:text-[#2F6F73]">Cash Intelligence</a></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="font-extrabold text-[#0B1726] uppercase text-[9px] tracking-wider">Company</h4>
            <ul className="space-y-2 font-semibold">
              <li><Link to="#" className="hover:text-[#2F6F73]">About Us</Link></li>
              <li><Link to="#" className="hover:text-[#2F6F73]">Security Standards</Link></li>
              <li><Link to="#" className="hover:text-[#2F6F73]">Contact Support</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="font-extrabold text-[#0B1726] uppercase text-[9px] tracking-wider">Resources</h4>
            <ul className="space-y-2 font-semibold">
              <li><Link to="/api-test" className="hover:text-[#2F6F73]">API Documentation</Link></li>
              <li><Link to="#" className="hover:text-[#2F6F73]">Developer Sandbox</Link></li>
              <li><Link to="#" className="hover:text-[#2F6F73]">System Status</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="font-extrabold text-[#0B1726] uppercase text-[9px] tracking-wider">Legal</h4>
            <ul className="space-y-2 font-semibold">
              <li><Link to="#" className="hover:text-[#2F6F73]">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-[#2F6F73]">Terms of Service</Link></li>
            </ul>
          </div>

        </div>
      </footer>

    </div>
  );
}
