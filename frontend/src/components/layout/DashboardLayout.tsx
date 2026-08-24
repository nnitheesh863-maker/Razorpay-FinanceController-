import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';

export function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        
        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 w-full min-h-[calc(100vh-4rem)]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
