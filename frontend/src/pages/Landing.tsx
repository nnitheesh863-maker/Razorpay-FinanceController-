import { Link } from 'react-router-dom';
import { 
  GitCompareArrows, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  ArrowRightLeft
} from 'lucide-react';

export function Landing() {
  const token = localStorage.getItem('token');

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      {/* Navigation Header */}
      <header className="border-b border-border-subtle bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center text-white font-bold">
              FC
            </div>
            <span className="font-semibold text-text-main text-lg tracking-tight">
              Finance Controller
            </span>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 py-24 sm:py-32">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />
        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center rounded-full bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Empowering Financial Operations
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-[1.1]">
            Automate Financial Reconciliation with AI
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Verify transactions, check payment success rates, manage settlements, and resolve critical discrepancy exceptions instantly.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            {token ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-6 py-3 text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-6 py-3 text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-3 text-base font-semibold text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
                >
                  Live Demo
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Highlights / Features Grid */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl">
            Everything your finance operations team needs
          </h2>
          <p className="mt-4 text-text-muted">
            Designed to bridge the gap between transactions, invoices, and matching rules with precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm flex flex-col items-start hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-text-main mb-2">Transactions</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Track money movements and verify payments against ledger entries in real time.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm flex flex-col items-start hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-success-50 text-success-600 flex items-center justify-center mb-4">
              <GitCompareArrows className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-text-main mb-2">Reconciliation</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Automated multi-way reconciliation matching to keep balance sheets perfectly accurate.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm flex flex-col items-start hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-text-main mb-2">Exceptions</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Surface discrepancy warnings and route them to finance analysts for quick resolution.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm flex flex-col items-start hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-text-main mb-2">AI Agent Insights</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Leverage llama-based agents to analyze metrics and investigate mismatched logs.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border-subtle bg-white py-8 text-center text-xs text-text-muted">
        <p>© 2026 Finance Controller (Inspired by Razorpay Finance Ecosystem). Built for professional financial operations.</p>
      </footer>
    </div>
  );
}
