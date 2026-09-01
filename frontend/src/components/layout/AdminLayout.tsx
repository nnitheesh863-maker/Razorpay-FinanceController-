import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Shield, 
  LayoutDashboard, 
  Users, 
  ArrowRightLeft, 
  AlertTriangle, 
  FileText, 
  CreditCard, 
  Sparkles, 
  Mic, 
  ClipboardList, 
  Activity, 
  Settings, 
  LogOut,
  Search,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const sidebarCategories = [
    {
      title: 'MAIN',
      items: [
        { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Users', path: '/admin/users', icon: Users },
        { label: 'Reconciliation', path: '/admin/reconciliation-runs', icon: ArrowRightLeft },
        { label: 'Exceptions', path: '/admin/exceptions', icon: AlertTriangle },
      ]
    },
    {
      title: 'AI & DATA',
      items: [
        { label: 'Smart Documents', path: '/admin/documents', icon: FileText },
        { label: 'Razorpay', path: '/admin/razorpay', icon: CreditCard },
        { label: 'AI Activity', path: '/admin/ai-activity', icon: Sparkles },
        { label: 'Voice AI', path: '/admin/voice-ai', icon: Mic },
      ]
    },
    {
      title: 'CONTROL',
      items: [
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: ClipboardList },
        { label: 'System Health', path: '/admin/system-health', icon: Activity },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Settings', path: '/admin/settings', icon: Settings },
      ]
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B1726] text-white border-r border-gray-800 w-[240px]">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex flex-col text-left">
          <span className="font-bold text-xs tracking-tight text-white uppercase">AI Finance</span>
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Controller</span>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto space-y-6">
        {sidebarCategories.map((category, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-800 pb-2">
              {category.title}
            </h3>
            <div className="space-y-0.5">
              {category.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (location.pathname === '/admin' && item.path === '/admin/dashboard');
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-[#2F6F73] text-white shadow-sm' 
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-gray-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-xs font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F6F8FA] text-[#0B1726] selection:bg-[#2F6F73]/20 font-sans">
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-screen sticky top-0 z-20 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)]">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-[#0B1726]/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="relative z-50 h-full flex flex-col w-[240px]"
          >
            {sidebarContent}
          </motion.div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#E4E7EC] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shrink-0">
          
          {/* Left Side: Breadcrumb */}
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-400">
              <span className="text-[#0B1726]">AI Finance Controller</span>
              <span>/</span>
              <span>Admin</span>
              <span>/</span>
              <span className="text-[#2F6F73]">Overview</span>
            </div>
          </div>

          {/* Center: Global Search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <div className="flex items-center w-full gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-[#2F6F73] focus-within:ring-1 focus-within:ring-[#2F6F73] transition-all">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search transactions, users, runs..." 
                className="bg-transparent text-xs font-medium text-[#0B1726] placeholder:text-gray-400 outline-none w-full"
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4 shrink-0">
            <button className="relative p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>

            {/* ASK FINANCE AI BUTTON */}
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#2F6F73] to-[#25575a] hover:from-[#25575a] hover:to-[#1a3d3f] text-white rounded-lg transition-all shadow-sm">
              <Mic className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Ask Finance AI</span>
            </button>

            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-[#0B1726] flex items-center justify-center text-xs font-bold text-white shadow-sm">
                A
              </div>
              <span className="text-xs font-bold text-[#0B1726] hidden sm:block">Admin ▾</span>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-[#F6F8FA]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
