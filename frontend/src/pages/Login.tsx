import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth.api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ShieldCheck, AlertCircle } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-bg-base flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-primary-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-text-main">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-text-muted">
          Or{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
            register for a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-border-subtle rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {errorMsg && (
              <div className="p-3 bg-danger-50 border border-danger-100 text-danger-700 rounded-lg text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-danger-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              error={errors.email?.message}
              required
              placeholder="name@company.com"
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              error={errors.password?.message}
              required
              placeholder="••••••••"
              {...register('password')}
            />

            <div>
              <Button type="submit" fullWidth isLoading={loading}>
                Sign In
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-text-muted hover:text-text-main transition-colors">
              ← Back to Landing Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
