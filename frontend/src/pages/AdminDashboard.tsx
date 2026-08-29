import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdminUsersAudit } from '../api/auth.api';
import { PageContainer, SectionCard } from '../components/dashboard/ShellComponents';
import { 
  Users, 
  Database, 
  RefreshCw, 
  TrendingUp, 
  ShieldAlert, 
  Mail, 
  Calendar,
  FileCheck2
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function AdminDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users-audit'],
    queryFn: getAdminUsersAudit
  });

  const auditData = data?.data || [];

  // Summary Aggregates
  const totalUsers = auditData.length;
  const totalRecordsControlled = auditData.reduce((sum, u) => sum + u.recordsCount, 0);
  const totalReconciliations = auditData.reduce((sum, u) => sum + u.reconciliationCount, 0);
  const avgSystemMatchRate = totalUsers > 0
    ? Number((auditData.reduce((sum, u) => sum + u.averageMatchRate, 0) / totalUsers).toFixed(1))
    : 0;

  return (
    <PageContainer>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 text-left border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#2F6F73]" />
            <span>Admin Control Portal</span>
          </h2>
          <p className="text-xs font-semibold text-gray-500">Audit system operations, records controlled, and ledger health metrics across all registered accounts.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="text-xs font-black bg-white hover:bg-neutral-50 text-gray-700 px-4 py-2 border border-gray-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Total Users */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow text-left flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#2F6F73]" />
            <span>Total System Users</span>
          </span>
          <div className="space-y-1.5 mt-2">
            <span className="text-2xl font-black text-gray-900">
              {isLoading ? '—' : totalUsers.toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-gray-400 block">Active corporate log profiles</span>
          </div>
        </div>

        {/* Total Records Controlled */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow text-left flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-[#2F6F73]" />
            <span>Records Controlled</span>
          </span>
          <div className="space-y-1.5 mt-2">
            <span className="text-2xl font-black text-gray-900">
              {isLoading ? '—' : totalRecordsControlled.toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-gray-400 block">Total normalized ledger entries</span>
          </div>
        </div>

        {/* Total Reconciliation Runs */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow text-left flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 text-[#2F6F73]" />
            <span>Reconciliations Wrote</span>
          </span>
          <div className="space-y-1.5 mt-2">
            <span className="text-2xl font-black text-gray-900">
              {isLoading ? '—' : totalReconciliations.toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-gray-400 block">Total reconciliation batch runs</span>
          </div>
        </div>

        {/* Average Match Efficiency */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow text-left flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-[#2F6F73]" />
            <span>Avg Match Efficiency</span>
          </span>
          <div className="space-y-1.5 mt-2">
            <span className={`text-2xl font-black ${avgSystemMatchRate >= 90 ? 'text-emerald-600' : 'text-amber-500'}`}>
              {isLoading ? '—' : `${avgSystemMatchRate}%`}
            </span>
            <span className="text-[9px] font-bold text-gray-400 block">Average system-wide match rate</span>
          </div>
        </div>

      </div>

      {/* Audit Registry Table */}
      <SectionCard title="Registered Users & Ledger Audits">
        <div className="overflow-x-auto -mx-5 -my-4">
          <table className="min-w-full divide-y divide-gray-100 text-xs font-semibold text-gray-600 text-left font-sans">
            <thead className="bg-neutral-50 text-[9px] text-gray-400 font-bold uppercase">
              <tr>
                <th className="py-2.5 px-5">User Details</th>
                <th>System Role</th>
                <th>Normalized Records</th>
                <th>Reconciliation Runs</th>
                <th>Avg Match Rate</th>
                <th className="py-2.5 px-5 text-right">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                    Loading users audit data registry...
                  </td>
                </tr>
              ) : auditData.map((user: any) => (
                <tr key={user.id} className="hover:bg-neutral-50/50">
                  
                  {/* Name & Email */}
                  <td className="py-3.5 px-5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#2F6F73]/5 text-[#2F6F73] font-black text-[10px] flex items-center justify-center">
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-extrabold text-gray-900 block">{user.name}</span>
                      <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        <span>{user.email}</span>
                      </span>
                    </div>
                  </td>

                  {/* System Role */}
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      user.role === 'ADMIN' 
                        ? 'bg-red-50 text-red-700 border border-red-100' 
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {user.role}
                    </span>
                  </td>

                  {/* Normalized Records */}
                  <td>
                    <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-gray-400" />
                      <span>{user.recordsCount.toLocaleString()}</span>
                    </span>
                  </td>

                  {/* Reconciliation Runs */}
                  <td>
                    <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-gray-400" />
                      <span>{user.reconciliationCount}</span>
                    </span>
                  </td>

                  {/* Avg Match Rate */}
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${user.averageMatchRate >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                          style={{ width: `${user.averageMatchRate}%` }} 
                        />
                      </div>
                      <span className={`font-black text-[10px] ${user.averageMatchRate >= 90 ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {user.averageMatchRate}%
                      </span>
                    </div>
                  </td>

                  {/* Created Date */}
                  <td className="py-3.5 px-5 text-right text-gray-400 text-[10px] font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(user.createdAt)}</span>
                    </span>
                  </td>

                </tr>
              ))}
              {auditData.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                    No registered user accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
