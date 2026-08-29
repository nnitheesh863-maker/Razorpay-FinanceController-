import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { X, LayoutDashboard, ArrowRightLeft, FileText, CreditCard, CheckSquare, AlertTriangle, MessageSquare, Shield } from 'lucide-react';

const navItems = [
  { label: 'Overview', isHeader: true },
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  
  { label: 'Finance', isHeader: true },
  { label: 'Transactions', icon: ArrowRightLeft, href: '/transactions' },
  { label: 'Invoices', icon: FileText, href: '/invoices' },
  { label: 'Payments', icon: CreditCard, href: '/payments' },
  
  { label: 'Reconciliation', isHeader: true },
  { label: 'Reconciliation', icon: CheckSquare, href: '/reconciliation' },
  { label: 'Exceptions', icon: AlertTriangle, href: '/exceptions' },
  
  { label: 'AI', isHeader: true },
  { label: 'AI Controller', icon: MessageSquare, href: '/agent' },
  
  { label: 'Administration', isHeader: true },
  { label: 'Audit Logs', icon: Shield, href: '/audit-logs' },
];

export function MobileSidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user } = useAuth();

  const activeNavItems = [...navItems];
  if (user?.role === 'ADMIN') {
    const adminHeaderIndex = activeNavItems.findIndex(item => item.label === 'Administration');
    if (adminHeaderIndex !== -1) {
      activeNavItems.splice(adminHeaderIndex + 1, 0, { label: 'Admin Control', icon: Shield, href: '/admin' });
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div 
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 left-0 w-3/4 max-w-sm bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="font-semibold text-text-main text-lg tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center text-white font-bold">
              FC
            </div>
            <span>Finance Controller</span>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {activeNavItems.map((item, index) => {
            if (item.isHeader) {
              return (
                <div key={index} className="pt-4 pb-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {item.label}
                </div>
              );
            }
            
            const Icon = item.icon!;
            return (
              <NavLink
                key={index}
                to={item.href!}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    isActive 
                      ? 'bg-primary-50 text-primary-700 font-medium' 
                      : 'text-text-main hover:bg-neutral-100'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
