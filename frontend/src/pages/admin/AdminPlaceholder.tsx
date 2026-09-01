import { useLocation } from 'react-router-dom';
import { Hammer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPlaceholder() {
  const location = useLocation();
  const path = location.pathname.split('/').pop()?.replace('-', ' ') || 'Page';
  
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <div className="w-20 h-20 bg-[#2F6F73]/10 rounded-full flex items-center justify-center mb-6">
        <Hammer className="w-10 h-10 text-[#2F6F73]" />
      </div>
      <h2 className="text-3xl font-black text-[#0B1726] capitalize mb-3">
        {path} Module
      </h2>
      <p className="text-gray-500 font-medium max-w-md mb-8">
        This section is currently under construction for the hackathon. 
        Detailed metrics and management tools for {path} will be available here.
      </p>
      <Link 
        to="/admin/dashboard" 
        className="flex items-center gap-2 px-6 py-3 bg-[#0B1726] text-white rounded-lg font-bold hover:bg-[#2F6F73] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </Link>
    </div>
  );
}
