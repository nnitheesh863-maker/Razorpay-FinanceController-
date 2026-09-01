import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ArrowRightLeft,
  FileText,
  CreditCard,
  Coins,
  CheckSquare,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Upload,
  Shield,
  Settings
} from 'lucide-react';

const navItems = [
  { label: 'Overview', isHeader: true },
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },

  { label: 'Core Ledger', isHeader: true },
  { label: 'Transactions', icon: ArrowRightLeft, href: '/transactions' },
  { label: 'Invoices', icon: FileText, href: '/invoices' },
  { label: 'Payments', icon: CreditCard, href: '/payments' },
  { label: 'Settlements', icon: Coins, href: '/settlements' },

  { label: 'Audit & Health', isHeader: true },
  { label: 'Reconciliation', icon: CheckSquare, href: '/reconciliation' },
  { label: 'Exceptions', icon: AlertTriangle, href: '/exceptions' },

  { label: 'Intelligence', isHeader: true },
  { label: 'AI Controller', icon: Sparkles, href: '/agent' },
  { label: 'Reports', icon: BarChart3, href: '/reports' },

  { label: 'Administration', isHeader: true },
  { label: 'Imports', icon: Upload, href: '/imports' },
  { label: 'Audit Logs', icon: Shield, href: '/audit-logs' },
  { label: 'Settings', icon: Settings, href: '/settings' }
];

export function Sidebar() {
  const { user } = useAuth();

  const activeNavItems = [...navItems];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border-subtle bg-white hidden lg:flex lg:flex-col h-[calc(100vh-4rem)]">
      <nav className="flex-1 overflow-y-auto p-4 space-y-0.5">
        {activeNavItems.map((item, index) => {
          if (item.isHeader) {
            return (
              <div key={index} className="pt-4 pb-1.5 px-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                {item.label}
              </div>
            );
          }

          const Icon = item.icon!;
          return (
            <NavLink
              key={index}
              to={item.href!}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive
                  ? 'bg-[#eff6ff] text-[#0048ff] font-extrabold shadow-2xs border-l-2 border-[#0048ff] rounded-l-none'
                  : 'text-text-main hover:bg-neutral-50 hover:text-text-main'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
