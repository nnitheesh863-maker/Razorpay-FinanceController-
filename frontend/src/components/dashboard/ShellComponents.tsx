import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Database, 
  ArrowRightLeft, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles, 
  Activity, 
  Shield, 
  Settings as SettingsIcon,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  User,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';

// Color system hex values as Tailwind config mappings (using arbitrary class values)
// Background: #F6F8FA, Surface: #FFFFFF, Primary: #0B1726, Secondary: #667085, Accent: #2F6F73

// 1. AppSidebar Component
interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  userName: string;
  userEmail?: string;
  userPhoto?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen,
  onClose,
  onLogout,
  userName,
  userEmail = 'controller@enterprise.com',
  userPhoto
}) => {
  const { user } = useAuth();

  const sidebarItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Data Center', path: '/data-center', icon: Database },
    { label: 'Reconciliation', path: '/reconciliation', icon: ArrowRightLeft },
    { label: 'Exceptions', path: '/exceptions', icon: AlertTriangle },
    { label: 'Cash Intelligence', path: '/cash-intelligence', icon: TrendingUp },
    { label: 'AI Controller', path: '/agent', icon: Sparkles },
    { label: 'Control Score', path: '/control-score', icon: Activity },
    { label: 'Performance', path: '/analytics', icon: BarChart3 },
    { label: 'Audit Trail', path: '/audit-logs', icon: Shield },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];



  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-[#0B1726] border-r border-[#E4E7EC] w-[260px]">
      
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-[#F2F4F7] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#2F6F73] rounded-lg flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
            A
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-xs tracking-tight text-[#0B1726]">AI Finance</span>
            <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider">Controller</span>
          </div>
        </div>

        {/* Mobile close trigger */}
        <button 
          onClick={onClose} 
          className="lg:hidden p-1 hover:bg-[#F2F4F7] rounded-lg text-[#667085] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-[#2F6F73]/10 text-[#2F6F73]' 
                    : 'text-[#667085] hover:bg-[#F2F4F7] hover:text-[#0B1726]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom User Card */}
      <div className="p-4 border-t border-[#F2F4F7] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#F2F4F7] border border-[#E4E7EC] flex items-center justify-center text-xs font-extrabold text-[#667085] overflow-hidden flex-shrink-0">
            {userPhoto ? (
              <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
            ) : (
              userName[0]
            )}
          </div>
          <div className="flex flex-col text-left min-w-0">
            <span className="text-[11px] font-bold text-[#0B1726] truncate">{userName}</span>
            <span className="text-[9px] text-[#667085] truncate font-medium">{userEmail}</span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-1.5 hover:bg-red-50 hover:text-[#C94C4C] rounded-lg text-[#667085] transition-colors cursor-pointer"
          title="Log Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-screen sticky top-0 z-20 flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-[#0B1726]/40 backdrop-blur-xs" 
            onClick={onClose} 
          />
          
          {/* Drawer container */}
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="relative z-50 h-full flex flex-col max-w-xs w-full focus:outline-none"
          >
            {sidebarContent}
          </motion.div>
        </div>
      )}
    </>
  );
};

import { useSocket } from '../../context/SocketContext';

// 2. TopHeader Component
interface TopHeaderProps {
  title: string;
  onOpenSidebar: () => void;
  userName: string;
  userPhoto?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  onOpenSidebar,
  userName,
  userPhoto
}) => {
  const { status } = useSocket();

  return (
    <header className="h-16 bg-white border-b border-[#E4E7EC] flex items-center justify-between px-6 sticky top-0 z-30 w-full text-left">
      
      {/* Title & Hamburger Menu */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenSidebar} 
          className="lg:hidden p-1.5 hover:bg-[#F2F4F7] rounded-lg text-[#667085] cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-sm text-[#0B1726] tracking-tight">{title}</h1>
      </div>

      {/* Search & Actions block */}
      <div className="flex items-center gap-4">
        
        {/* Real-time Connection Status Pill */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${
          status === 'Connected'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : status === 'Reconnecting'
              ? 'bg-amber-50 border-amber-100 text-amber-700 animate-pulse'
              : 'bg-neutral-50 border-neutral-200 text-neutral-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === 'Connected'
              ? 'bg-emerald-500'
              : status === 'Reconnecting'
                ? 'bg-amber-500'
                : 'bg-neutral-400'
          }`} />
          <span>{status === 'Connected' ? 'Live Sync' : status}</span>
        </div>

        {/* Search input placeholder */}
        <div className="relative hidden md:block w-64">
          <span className="absolute inset-y-0 left-3 flex items-center text-[#667085]">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input 
            type="text" 
            placeholder="Search transactions, audit logs..." 
            disabled
            className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0B1726] cursor-not-allowed focus:outline-none"
          />
        </div>

        {/* Notifications button */}
        <button 
          className="p-1.5 hover:bg-[#F2F4F7] rounded-lg text-[#667085] relative cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#C94C4C] rounded-full border border-white" />
        </button>

        {/* User avatar indicator */}
        <div className="flex items-center gap-2 border-l border-[#E4E7EC] pl-4">
          <div className="w-7 h-7 rounded-full bg-[#F2F4F7] border border-[#E4E7EC] flex items-center justify-center text-xs font-extrabold text-[#667085] overflow-hidden shadow-2xs">
            {userPhoto ? (
              <img src={userPhoto} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              userName[0]
            )}
          </div>
          <span className="text-xs font-bold text-[#0B1726] hidden sm:inline">{userName}</span>
        </div>

      </div>

    </header>
  );
};

// 3. PageContainer Component
interface PageContainerProps {
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  return (
    <main className="flex-1 bg-[#F6F8FA] p-6 md:p-8 space-y-6 text-left w-full overflow-y-auto">
      {children}
    </main>
  );
};

// 4. MetricCard Component
interface MetricCardProps {
  title: string;
  value: string | number;
  statusText?: string;
  statusType?: 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ComponentType<{ className?: string }>;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  statusText,
  statusType = 'info',
  icon: Icon
}) => {
  const getStatusColor = () => {
    switch (statusType) {
      case 'success': return 'text-[#198754]';
      case 'warning': return 'text-[#C58B24]';
      case 'danger': return 'text-[#C94C4C]';
      default: return 'text-[#667085]';
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
      className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-2xs flex flex-col justify-between min-h-[110px] text-left transition-all"
    >
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">{title}</span>
        {Icon && <Icon className="w-4 h-4 text-[#667085]" />}
      </div>
      
      {/* Large value with subtle animation placeholder if empty */}
      <h3 className="text-2xl font-bold tracking-tight text-[#0B1726] mt-2 animate-pulse duration-1000">
        {value}
      </h3>

      {statusText && (
        <div className={`text-[9px] font-bold mt-2 pt-2 border-t border-[#F2F4F7] flex items-center gap-1.5 ${getStatusColor()}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          <span>{statusText}</span>
        </div>
      )}
    </motion.div>
  );
};

// 5. SectionCard Component
interface SectionCardProps {
  title: string;
  actionText?: string;
  onAction?: () => void;
  children: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  actionText,
  onAction,
  children
}) => {
  return (
    <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-2xs flex flex-col space-y-4">
      <div className="flex justify-between items-center border-b border-[#F2F4F7] pb-3">
        <h3 className="text-xs font-bold text-[#0B1726] uppercase tracking-wider">{title}</h3>
        {actionText && (
          <button 
            onClick={onAction}
            className="text-[10px] bg-[#F6F8FA] hover:bg-[#F2F4F7] border border-[#E4E7EC] rounded-lg px-2.5 py-1.5 font-bold text-[#667085] transition-colors cursor-pointer"
          >
            {actionText}
          </button>
        )}
      </div>
      <div className="flex-1 w-full">
        {children}
      </div>
    </div>
  );
};

// 6. EmptyState Component
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  actionText,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-dashed border-[#E4E7EC] min-h-[220px] space-y-3">
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-[#F6F8FA] flex items-center justify-center text-[#667085]">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-[#0B1726]">{title}</h4>
        <p className="text-[10px] text-[#667085] leading-relaxed max-w-xs mx-auto font-medium">{description}</p>
      </div>
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="bg-[#2F6F73] hover:bg-[#25575a] text-white text-[10px] font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

// 7. LoadingSkeleton Component
export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse space-y-6 w-full text-left">
      <div className="h-6 bg-[#E4E7EC] rounded-md w-1/4" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white border border-[#E4E7EC] rounded-xl p-5 h-28 space-y-3">
            <div className="h-3 bg-[#F2F4F7] rounded w-1/3" />
            <div className="h-6 bg-[#E4E7EC] rounded w-1/2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E4E7EC] rounded-xl p-5 h-64 space-y-4">
          <div className="h-4 bg-[#F2F4F7] rounded w-1/4" />
          <div className="h-full bg-[#E4E7EC]/40 rounded" />
        </div>
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 h-64 space-y-4">
          <div className="h-4 bg-[#F2F4F7] rounded w-1/3" />
          <div className="h-full bg-[#E4E7EC]/40 rounded" />
        </div>
      </div>
    </div>
  );
};
