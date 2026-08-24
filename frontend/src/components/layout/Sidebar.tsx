import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  FileText, 
  CreditCard, 
  CheckSquare, 
  AlertTriangle, 
  MessageSquare, 
  Shield 
} from 'lucide-react';

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
  
  { label: 'Agent', isHeader: true },
  { label: 'Finance Agent', icon: MessageSquare, href: '/agent' },
  
  { label: 'Administration', isHeader: true },
  { label: 'Audit Logs', icon: Shield, href: '/audit-logs' },
  
  { label: 'Development', isHeader: true },
  { label: 'API Test', icon: FileText, href: '/api-test' },
];

export function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-border-subtle bg-white hidden lg:flex lg:flex-col h-[calc(100vh-4rem)]">
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item, index) => {
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
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700 font-medium' 
                    : 'text-text-main hover:bg-neutral-100 hover:text-text-main'
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
