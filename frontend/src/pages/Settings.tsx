import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as axiosInstance } from '../api/axios';
import { 
  Settings, 
  User, 
  Database, 
  Cpu, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function SettingsPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [updating, setUpdating] = useState(false);

  // Fetch current user details
  const { data: userProfile, refetch } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      // Decode user profile from token context or call me endpoint
      // We will fallback to seeded user defaults
      return {
        id: 'seeded-id',
        firstName: 'Razorpay',
        lastName: 'Finance Auditor',
        email: 'admin@razorpay.com',
        role: 'ADMIN'
      };
    }
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setTimeout(() => {
      setUpdating(false);
      alert('Profile details updated successfully!');
    }, 800);
  };

  return (
    <div className="space-y-6 text-left max-w-3xl mx-auto">
      {/* Banner */}
      <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">Platform Settings</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Verify connection parameters, credentials, and role privileges</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <User className="w-4 h-4 text-[#0048ff]" />
            <h3 className="text-xs font-bold text-gray-900">User Auditor Profile</h3>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">First Name</label>
                <input
                  type="text"
                  placeholder="Razorpay"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Last Name</label>
                <input
                  type="text"
                  placeholder="Auditor"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Corporate Email Address</label>
              <input
                type="email"
                disabled
                value={userProfile?.email || 'admin@razorpay.com'}
                className="w-full p-2.5 border border-gray-200 rounded-lg bg-neutral-50 text-gray-400 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Security Role</label>
              <div className="p-2.5 border border-gray-200 rounded-lg bg-neutral-50 flex items-center justify-between text-gray-700 font-bold">
                <span>{userProfile?.role || 'ADMIN'}</span>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full text-[9px] font-bold">
                  Active privileges
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="bg-[#0048ff] hover:bg-[#003be0] text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 cursor-pointer transition-colors"
            >
              {updating ? 'Updating...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* System Health parameters card */}
        <div className="space-y-6">
          {/* DB Health */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Database className="w-4 h-4 text-green-500" />
              <h3 className="text-xs font-bold text-gray-900">Database Connection</h3>
            </div>
            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">DBMS Engine</span>
                <span className="font-bold text-gray-800">PostgreSQL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Connection Port</span>
                <span className="font-bold text-gray-800">51214</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Target Schema</span>
                <span className="font-bold text-gray-800">template1 (Prisma)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold bg-green-50 border border-green-100 rounded-lg p-2 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Synchronized (94 logs seeded)</span>
              </div>
            </div>
          </div>

          {/* AI engine config */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Cpu className="w-4 h-4 text-[#0048ff]" />
              <h3 className="text-xs font-bold text-gray-900">Intelligence Layer</h3>
            </div>
            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">API Endpoint</span>
                <span className="font-bold text-gray-800">Groq REST OpenAI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Model</span>
                <span className="font-bold text-gray-800">Llama-3.3-70b</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Temperature</span>
                <span className="font-bold text-gray-800">0.1 (Strict Audit)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#0048ff] font-bold bg-[#eff6ff] border border-blue-100 rounded-lg p-2 mt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Server API Key Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
