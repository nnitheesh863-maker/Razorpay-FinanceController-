import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth.api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ShieldCheck, AlertCircle, RefreshCw, Key, CheckCircle2, Cpu } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFields = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    setErrorMsg(null);
    try {
      const response = await loginUser(data);
      if (response.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      } else {
        setErrorMsg('Authentication failed. No token provided.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email: string) => {
    setValue('email', email);
    setValue('password', 'password123');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col lg:flex-row">
      {/* Left Panel: Razorpay Brand Display */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#081125] text-white relative overflow-hidden flex-col justify-between p-12">
        {/* Glowing radial gradient backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e40af,transparent_55%)] opacity-35" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0048ff] text-white font-black text-xl italic tracking-tighter">
            R
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5">
              Razorpay <span className="text-[#0048ff] font-medium text-xs bg-[#0048ff]/10 px-2 py-0.5 rounded-full">FINANCE</span>
            </h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Controller Platform</p>
          </div>
        </div>

        {/* Brand Value Proposition */}
        <div className="relative z-10 space-y-8 my-auto">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#3b82f6] uppercase tracking-wider bg-[#3b82f6]/10 px-3 py-1 rounded-full inline-block">
              Enterprise Operations Control
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              AI-Powered Financial Reconciliation
            </h2>
            <p className="text-neutral-400 text-sm max-w-md">
              Securely reconcile transactions, automate discrepancy detection, and leverage Groq AI for detailed investigation.
            </p>
          </div>

          <div className="space-y-4 max-w-md">
            {[
              {
                icon: CheckCircle2,
                title: "Deterministic Engine",
                desc: "Reconcile invoices, payments, bank records, and settlements with strict tolerance thresholds."
              },
              {
                icon: AlertCircle,
                title: "Instant Exception Audit",
                desc: "Identify gateway fee mismatches, duplicate charges, or missing ledger logs immediately."
              },
              {
                icon: Cpu,
                title: "Groq AI Intelligence",
                desc: "Analyze transaction flows, explain settle discrepancies, and auto-recommend next actions."
              }
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <feature.icon className="w-5 h-5 text-[#3b82f6] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-200">{feature.title}</h4>
                  <p className="text-xs text-neutral-400 leading-normal mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-neutral-500">
          © {new Date().getFullYear()} Razorpay Software Private Limited. Built with Enterprise Security.
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobile view branding */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0048ff] text-white font-black text-xl italic">
              R
            </div>
            <div className="text-left">
              <h1 className="text-lg font-black tracking-tight">Razorpay</h1>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Finance Controller</p>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
              Platform Authentication
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Please sign in to access the operational control center.
            </p>
          </div>

          <div className="mt-8">
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Input
                label="Corporate Email"
                type="email"
                error={errors.email?.message}
                required
                placeholder="name@razorpay.com"
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
                <Button type="submit" fullWidth isLoading={loading} className="bg-[#0048ff] hover:bg-[#003be0] text-sm py-2.5 font-bold cursor-pointer">
                  Authenticate Securely
                </Button>
              </div>
            </form>

            {/* Quick Login Shortcuts */}
            <div className="mt-6 border-t border-neutral-100 pt-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-3 text-center lg:text-left">
                Quick Access Profiles (Development)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@razorpay.com')}
                  className="flex items-center justify-between px-3 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-left transition-colors cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block">Admin</span>
                    <span className="text-[10px] text-neutral-400 block">Aditya Sharma</span>
                  </div>
                  <Key className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('manager@razorpay.com')}
                  className="flex items-center justify-between px-3 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-left transition-colors cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block">Manager</span>
                    <span className="text-[10px] text-neutral-400 block">Neha Goel</span>
                  </div>
                  <Key className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              </div>
            </div>

            <div className="mt-6 text-center lg:text-left flex justify-between items-center text-xs">
              <Link to="/register" className="font-semibold text-[#0048ff] hover:text-[#003be0] transition-colors">
                Register for corporate access
              </Link>
              <Link to="/" className="text-neutral-400 hover:text-neutral-700 transition-colors">
                ← Home page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
