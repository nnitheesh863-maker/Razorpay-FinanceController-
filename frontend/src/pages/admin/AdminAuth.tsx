import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminLogin, adminRegister } from '../../api/admin.api';
import { Shield, Lock, Mail, User, Key, AlertCircle } from 'lucide-react';

export default function AdminAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', inviteCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuthData } = useAuth(); // Assuming setAuthData exists in AuthContext, if not I'll have to use normal login

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await adminLogin({ email: formData.email, password: formData.password });
        setAuthData(response.data.user, response.data.token);
        navigate('/admin/dashboard');
      } else {
        await adminRegister(formData);
        // Switch to login
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1726] flex items-center justify-center p-4 selection:bg-[#2F6F73]/30">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#F6F8FA] rounded-2xl border border-[#E4E7EC] flex items-center justify-center text-[#2F6F73]">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        
        <h1 className="text-2xl font-black text-center text-[#0B1726] tracking-tight mb-2">
          {isLogin ? 'Admin Portal' : 'Admin Registration'}
        </h1>
        <p className="text-xs font-bold text-center text-gray-500 uppercase tracking-widest mb-8">
          Authorized Personnel Only
        </p>

        {error && (
          <div className={`p-4 rounded-xl mb-6 text-xs font-bold flex items-center gap-2 ${
            error.includes('successful') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-[#0B1726] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/50"
                  placeholder="System Admin"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-[#0B1726] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/50"
                placeholder="admin@enterprise.com"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-[#0B1726] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/50"
                placeholder="••••••••"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Invite Code</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                  className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-[#0B1726] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/50"
                  placeholder="AFC-ADMIN-2026"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2F6F73] hover:bg-[#1a4a4d] text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Secure Login' : 'Register Admin'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-xs font-bold text-[#667085] hover:text-[#0B1726] transition-colors"
          >
            {isLogin ? 'Need an admin account? Register' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
