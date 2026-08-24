import { Menu, Bell } from 'lucide-react';

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="h-16 border-b border-border-subtle bg-white flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-text-muted hover:text-text-main hover:bg-neutral-100 rounded-md transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="font-semibold text-text-main text-lg tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center text-white font-bold">
            FC
          </div>
          <span className="hidden sm:inline-block">AI Finance Controller</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="text-text-muted hover:text-text-main p-2 rounded-full hover:bg-neutral-100 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full border border-white"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-border-subtle">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-text-main leading-tight">Nitheesh</span>
            <span className="text-xs text-text-muted leading-tight">Finance Manager</span>
          </div>
          <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium">
            N
          </div>
        </div>
      </div>
    </header>
  );
}
