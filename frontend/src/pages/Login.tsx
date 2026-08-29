import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ShieldCheck, AlertCircle, Key, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().min(1, 'Corporate email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFields = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [failedMsg, setFailedMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    setFailedMsg(null);
    setSuccessMsg(null);
    try {
      await login(data);
      setSuccessMsg('Welcome back! Logging you in...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setFailedMsg(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email: string) => {
    setValue('email', email);
    setValue('password', 'password123');
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col lg:flex-row font-sans selection:bg-[#2F6F73]/20">
      {/* Left Panel: Enterprise Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B1726] text-white relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,#2F6F73,transparent_60%)] opacity-20" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        {/* Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#2F6F73] text-white font-extrabold text-lg tracking-tight">
            AFC
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5 text-white">
              AI Finance Controller
            </h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Enterprise Ledgers</p>
          </div>
        </div>

        {/* Brand Core Hook */}
        <div className="relative z-10 space-y-10 my-auto">
          <div className="space-y-4">
            <span className="text-xs font-bold text-[#2F6F73] uppercase tracking-wider bg-[#2F6F73]/10 px-3 py-1.5 rounded-full inline-block border border-[#2F6F73]/25">
              Secure Operations Layer
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight max-w-lg">
              Know where your money stands.
            </h2>
            <p className="text-neutral-400 text-sm max-w-md leading-relaxed">
              Reconcile payments, settlements and financial records with an evidence-first finance control layer.
            </p>
          </div>

          <div className="space-y-4 max-w-md">
            {[
              {
                icon: ShieldCheck,
                title: "Evidence-First Integrity",
                desc: "Every record trace requires deterministic ledger correlation and multi-factor identity authorization."
              },
              {
                icon: CheckCircle2,
                title: "Multi-Route Gateway Link",
                desc: "Link card settlements, direct bank feeds, invoices, and payment gateways into a unified ledger."
              }
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <feature.icon className="w-5 h-5 text-[#2F6F73] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-neutral-200">{feature.title}</h4>
                  <p className="text-xs text-neutral-400 leading-normal mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-neutral-500">
          © {new Date().getFullYear()} AI Finance Controller. Built with enterprise-grade multi-tenant isolation.
        </div>
      </div>

      {/* Right Panel: Auth Controls */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobile logo header */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0B1726] text-white font-black text-lg">
              AFC
            </div>
            <div className="text-left">
              <h1 className="text-md font-black tracking-tight text-[#0B1726]">AI Finance Controller</h1>
              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Enterprise Control</p>
            </div>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-[#0B1726] sm:text-3xl">
              Welcome back
            </h2>
            <p className="text-xs text-neutral-400 font-medium">
              Sign in to your finance workspace.
            </p>
          </div>

          <div className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="p-6 bg-white border border-gray-100 rounded-3xl shadow-[0_0_20px_rgba(47,111,115,0.08)] hover:shadow-[0_0_30px_rgba(47,111,115,0.22)] transition-all duration-300 relative group overflow-hidden"
            >
              <div className="absolute -inset-[100%] bg-[radial-gradient(circle_at_50%_120%,rgba(47,111,115,0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <form className="space-y-4 relative z-10" onSubmit={handleSubmit(onSubmit)}>
                {failedMsg && (
                  <div className="p-3 bg-red-50 border border-red-100 text-[#C94C4C] rounded-lg text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#C94C4C] mt-0.5" />
                    <span>{failedMsg}</span>
                  </div>
                )}

                <Input
                  label="Corporate Email"
                  type="email"
                  error={errors.email?.message}
                  required
                  placeholder="name@finance-controller.com"
                  {...register('email')}
                />

                <Input
                  label="Security Password"
                  type="password"
                  error={errors.password?.message}
                  required
                  placeholder="••••••••"
                  {...register('password')}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    fullWidth
                    isLoading={loading}
                    className="bg-[#0B1726] hover:bg-[#1a2c41] text-xs py-3 font-bold cursor-pointer text-white"
                  >
                    Authenticate Securely
                  </Button>
                </div>
              </form>

              {/* Quick Access Profiles */}
              <div className="mt-8 border-t border-neutral-100 pt-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-3 text-center lg:text-left">
                  Quick Access Profiles (Development)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@razorpay.com')}
                    className="flex items-center justify-between px-3.5 py-2.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-left transition-all cursor-pointer hover:border-neutral-300"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#0B1726] block">Admin Auditor</span>
                      <span className="text-[10px] text-neutral-400 block">Aditya Sharma</span>
                    </div>
                    <Key className="w-3.5 h-3.5 text-neutral-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('manager@razorpay.com')}
                    className="flex items-center justify-between px-3.5 py-2.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-left transition-all cursor-pointer hover:border-neutral-300"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#0B1726] block">Finance Manager</span>
                      <span className="text-[10px] text-neutral-400 block">Neha Goel</span>
                    </div>
                    <Key className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                </div>
              </div>
            </motion.div>

            <div className="mt-8 text-center lg:text-left flex justify-between items-center text-xs border-t border-neutral-100 pt-5">
              <span className="text-neutral-400">
                Need access?{' '}
                <Link to="/register" className="font-bold text-[#2F6F73] hover:underline transition-colors">
                  Create workspace profile
                </Link>
              </span>
              <Link to="/" className="text-neutral-400 hover:text-neutral-700 transition-colors font-semibold">
                ← Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Glowing Success Alert Overlay */}
      {successMsg && (
        <div className="fixed inset-0 z-50 bg-[#0B1726]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-emerald-500 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-9 h-9 text-emerald-500 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Success!</h3>
              <p className="text-xs font-bold text-emerald-600 animate-pulse">{successMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Glowing Error Alert Overlay */}
      {failedMsg && (
        <div className="fixed inset-0 z-50 bg-[#0B1726]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <XCircle className="w-9 h-9 text-red-500 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Login Failed</h3>
              <p className="text-xs font-bold text-red-600 leading-relaxed">{failedMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => setFailedMsg(null)}
              className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black rounded-xl transition-colors cursor-pointer border border-red-100"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
