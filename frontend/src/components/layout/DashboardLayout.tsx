import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Repeat, 
  Package, 
  PieChart, 
  Target, 
  FileText, 
  Sliders, 
  Settings, 
  CloudLightning, 
  UploadCloud, 
  PlusCircle, 
  X, 
  LogOut,
  CheckCircle2,
  AlertCircle,
  Coins,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { LedgerlyProvider, useLedgerly } from '../../context/LedgerlyContext';

// Mini intersecting curves logo for the sidebar header
const SidebarLogo = () => (
  <div className="relative w-7 h-7 flex items-center justify-center flex-shrink-0">
    <svg className="w-full h-full text-[#2F6F73]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 50C20 33.4315 33.4315 20 50 20C66.5685 20 80 33.4315 80 50" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
      <path d="M80 50C80 66.5685 66.5685 80 50 80C33.4315 80 20 66.5685 20 50" stroke="#7FA7A3" strokeWidth="12" strokeLinecap="round" />
    </svg>
    <div className="absolute w-1.5 h-1.5 rounded-full bg-[#2F6F73] top-1.5 right-1.5" />
  </div>
);

function DashboardLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    settings, 
    addTransactions, 
    uploadDocumentFile, 
    syncGoogleDrive,
    refetchState,
    updatePreferences
  } = useLedgerly();

  // Dialog Modals State
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Click-based User Dropdown Menu State
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Parse active username
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  // Profile Editable States (with database settings synchronization)
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (settings) {
      setProfileFirstName(settings.firstName || user?.firstName || '');
      setProfileLastName(settings.lastName || user?.lastName || '');
      setProfilePhoto(settings.profilePhoto || user?.profilePhoto || '');
      
      // Auto-sync database profile variables into active browser session
      const activeUser = localStorage.getItem('user');
      if (activeUser) {
        const userObj = JSON.parse(activeUser);
        let changed = false;
        if (settings.profilePhoto && userObj.profilePhoto !== settings.profilePhoto) {
          userObj.profilePhoto = settings.profilePhoto;
          changed = true;
        }
        if (settings.firstName && userObj.firstName !== settings.firstName) {
          userObj.firstName = settings.firstName;
          changed = true;
        }
        if (settings.lastName && userObj.lastName !== settings.lastName) {
          userObj.lastName = settings.lastName;
          changed = true;
        }
        if (changed) {
          localStorage.setItem('user', JSON.stringify(userObj));
        }
      }
    }
  }, [settings]);

  const userName = profileFirstName || profileLastName 
    ? `${profileFirstName} ${profileLastName}` 
    : (user ? `${user.firstName} ${user.lastName}` : 'Admin');

  // Navigation Menu specs representing exact mockup groupings
  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    
    { label: 'RECONCILIATION', isHeader: true },
    { label: 'Multi-Source Reconciliation', path: '/reconciliation', icon: ArrowRightLeft },
    { label: 'Exceptions', path: '/exceptions', icon: AlertCircle },
    { label: 'Match Review', path: '/reconciliation', icon: CheckCircle2 },
    { label: 'Rules & Mapping', path: '/rules', icon: Sliders },
    
    { label: 'CASH MANAGEMENT', isHeader: true },
    { label: 'Cash Position', path: '/dashboard', icon: Coins },
    { label: 'Cash Forecast', path: '/dashboard', icon: Repeat },
    { label: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
    { label: 'Budgets', path: '/budgets', icon: PieChart },
    { label: 'Goals', path: '/goals', icon: Target },
    { label: 'Subscriptions', path: '/subscriptions', icon: Package },
    
    { label: 'SETTLEMENT Q&A', isHeader: true },
    { label: 'Ask Finance AI', path: '/agent', icon: Sparkles },
    { label: 'Query History', path: '/agent', icon: FileText },
    
    { label: 'REPORTS', isHeader: true },
    { label: 'Reconciliation Report', path: '/reports', icon: FileText },
    { label: 'Exception Report', path: '/exceptions', icon: FileText },
    { label: 'Audit Trail', path: '/audit-logs', icon: Settings },
    { label: 'Documents', path: '/documents', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings }
  ];

  // Get current page header title
  const currentTitle = menuItems.find(item => !item.isHeader && location.pathname.startsWith(item.path))?.label || 'Dashboard';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Convert uploaded image to base64 for persistent storage in settings
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds the 2MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      // Upsert preferences permanently inside database
      await updatePreferences({
        profilePhoto,
        firstName: profileFirstName.trim(),
        lastName: profileLastName.trim()
      });

      // Synchronize active session memory
      const activeUser = localStorage.getItem('user');
      if (activeUser) {
        const userObj = JSON.parse(activeUser);
        userObj.firstName = profileFirstName.trim();
        userObj.lastName = profileLastName.trim();
        userObj.profilePhoto = profilePhoto;
        localStorage.setItem('user', JSON.stringify(userObj));
      }
      setIsProfileOpen(false);
      alert('Profile details and image saved permanently!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  // --- ADD ENTRY FORM STATES ---
  const [entryType, setEntryType] = useState<'expense' | 'income'>('expense');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryMerchant, setEntryMerchant] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryCategory, setEntryCategory] = useState('Needs review');
  const [entryAccount, setEntryAccount] = useState('Main Checking');
  const [entryTags, setEntryTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [attachReceipt, setAttachReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const handleAddEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);
    const amount = parseFloat(entryAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setEntryError('Amount must be a positive number.');
      return;
    }
    if (!entryMerchant.trim()) {
      setEntryError('Merchant or source is required.');
      return;
    }

    setSavingEntry(true);
    try {
      let isReceiptAttached = false;
      if (attachReceipt && receiptFile) {
        await uploadDocumentFile(receiptFile);
        isReceiptAttached = true;
      }

      await addTransactions({
        date: entryDate,
        merchant: entryMerchant.trim(),
        category: entryCategory,
        amount,
        type: entryType,
        account: entryAccount,
        tags: JSON.stringify(entryTags),
        receipt: isReceiptAttached ? 1 : 0,
        source: 'manual'
      });

      // Reset Form and close
      setEntryAmount('');
      setEntryMerchant('');
      setEntryTags([]);
      setReceiptFile(null);
      setAttachReceipt(false);
      setIsAddEntryOpen(false);
    } catch (err: any) {
      setEntryError(err.message || 'Failed to save transaction.');
    } finally {
      setSavingEntry(false);
    }
  };

  // --- CSV STATEMENT IMPORT STATES ---
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappingDate, setMappingDate] = useState(0);
  const [mappingMerchant, setMappingMerchant] = useState(1);
  const [mappingAmount, setMappingAmount] = useState(2);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; duplicate: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setImportResult(null);
      setImportError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, '')));
        if (rows.length > 0) {
          setCsvHeaders(rows[0]);
          setCsvPreview(rows.slice(1, 6).filter(r => r.length > 1));
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setImporting(true);
    setImportError(null);

    try {
      const text = await csvFile.text();
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, '')));
      
      const payload: any[] = [];
      const dataRows = rows.slice(1);

      for (const row of dataRows) {
        if (row.length <= Math.max(mappingDate, mappingMerchant, mappingAmount)) continue;

        const dateVal = row[mappingDate];
        const merchantVal = row[mappingMerchant];
        const rawAmount = parseFloat(row[mappingAmount]);

        if (!dateVal || !merchantVal || isNaN(rawAmount)) continue;

        const amountAbs = Math.abs(rawAmount);
        const typeVal = rawAmount < 0 ? 'expense' : 'income';

        payload.push({
          date: dateVal,
          merchant: merchantVal,
          category: 'Needs review',
          amount: amountAbs,
          type: typeVal,
          account: 'CSV statement',
          tags: ['CSV Import'],
          receipt: 0,
          source: 'csv'
        });
      }

      if (payload.length === 0) {
        setImportError('No valid rows found in CSV. Please verify column mappings.');
        setImporting(false);
        return;
      }

      const res = await addTransactions(payload);
      setImportResult(res);
      setCsvFile(null);
      setCsvPreview([]);
    } catch (err: any) {
      setImportError(err.message || 'Import process failed.');
    } finally {
      setImporting(false);
    }
  };

  // --- DRIVE SYNC WEBHOOK TRIGGER STATES ---
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleDriveSyncSubmit = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await syncGoogleDrive();
      setSyncResult(res);
      await refetchState();
    } catch (err: any) {
      setSyncError(err.message || 'Sync connection failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0A0D14] text-white selection:bg-[#2F6F73]/20">
      
      {/* 1. DESKTOP LEFT SIDEBAR (238 px wide) - Matches Mockup Style */}
      <aside className="w-[245px] flex-shrink-0 bg-[#0B0F19] border-r border-[#1F2937]/75 hidden lg:flex lg:flex-col h-screen sticky top-0 overflow-y-auto">
        
        {/* Brand Header */}
        <div className="h-[80px] px-5 border-b border-[#1F2937]/45 flex items-center gap-3">
          <SidebarLogo />
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-white text-xs tracking-tight leading-none">AI Finance Controller</span>
            <span className="text-[9px] font-semibold text-gray-500 mt-1">Intelligent Reconciliation</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-6 space-y-0.5">
          {menuItems.map((item, idx) => {
            if (item.isHeader) {
              return (
                <div key={idx} className="pt-4 pb-1.5 px-3.5 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest text-left">
                  {item.label}
                </div>
              );
            }

            const Icon = item.icon!;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path + '-' + idx}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                  isActive 
                    ? 'bg-[#1D4ED8] text-white' 
                    : 'text-gray-400 hover:bg-neutral-900/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Data Sources Widget */}
        <div className="p-4 mx-4 mb-4 border border-[#1F2937]/60 bg-[#111827]/40 rounded-xl text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Data Sources</span>
            <span className="text-[8px] bg-green-500/15 text-green-400 border border-green-500/10 px-1.5 py-0.5 rounded-full font-extrabold uppercase">
              All Connected
            </span>
          </div>

          <div className="space-y-2 text-[10px] font-bold text-gray-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>Bank Statements</span>
              </div>
              <span className="text-gray-500 text-[9px]">Last sync: 2 mins ago</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>Invoices</span>
              </div>
              <span className="text-gray-500 text-[9px]">Last sync: 2 mins ago</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>Payments</span>
              </div>
              <span className="text-gray-500 text-[9px]">Last sync: 1 min ago</span>
            </div>
          </div>
        </div>

        {/* User Card & Profile edit Trigger in Sidebar */}
        <div 
          onClick={() => setIsProfileOpen(true)}
          className="p-4 border-t border-[#1F2937]/45 flex items-center justify-between cursor-pointer hover:bg-neutral-900/40 transition-colors"
          title="Open Profile Settings"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-800 border border-[#1F2937] flex items-center justify-center text-xs font-extrabold text-white overflow-hidden shadow-sm flex-shrink-0">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userName[0]
              )}
            </div>
            <div className="flex flex-col text-left max-w-[110px]">
              <span className="text-[11px] font-bold text-white truncate">{userName}</span>
              <span className="text-[9px] text-gray-500 font-semibold truncate uppercase">Owner</span>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            className="p-1.5 hover:bg-red-950 hover:text-red-400 rounded-lg text-gray-500 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </aside>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 2. STICKY TOP BAR (80 px high) */}
        <header className="h-[80px] bg-[#0B0F19] border-b border-[#1F2937]/75 flex items-center justify-between px-6 sticky top-0 z-30">
          
          {/* Left: Tab Title */}
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-base text-white tracking-tight lg:block hidden">{currentTitle}</span>
            <div className="flex items-center gap-1.5 lg:hidden">
              <SidebarLogo />
              <span className="font-extrabold text-sm text-white tracking-tight">{currentTitle}</span>
            </div>
          </div>

          {/* Right: Actions and Sync Controls */}
          <div className="flex items-center gap-2">
            
            {/* Sync Drive action */}
            <button 
              onClick={() => setIsSyncOpen(true)}
              className="px-3.5 py-2 bg-[#111827] border border-[#1F2937] hover:bg-neutral-800 rounded-xl text-xs font-bold text-gray-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sync Google Drive"
            >
              <CloudLightning className="w-3.5 h-3.5 text-[#7FA7A3]" />
              <span className="hidden sm:inline">Drive sync</span>
            </button>

            {/* Import statement action */}
            <button 
              onClick={() => setIsImportOpen(true)}
              className="px-3.5 py-2 bg-[#111827] border border-[#1F2937] hover:bg-neutral-800 rounded-xl text-xs font-bold text-gray-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Import CSV statement"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#7FA7A3]" />
              <span className="hidden sm:inline">Import</span>
            </button>

            {/* Manual entry action */}
            <button 
              onClick={() => setIsAddEntryOpen(true)}
              className="bg-[#2F6F73] hover:bg-[#25575a] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#2F6F73]/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Add manual entry"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add entry</span>
            </button>

            {/* User Profile dropdown trigger on Click */}
            <div className="flex items-center gap-2 border-l border-[#1F2937] pl-3 ml-1 relative">
              <button 
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 hover:opacity-90 transition-opacity focus:outline-none cursor-pointer text-left"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 border border-[#1F2937] flex items-center justify-center text-xs font-extrabold text-white overflow-hidden shadow-sm flex-shrink-0">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      userName[0]
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0B0F19]" />
                </div>
                
                <div className="hidden md:flex items-center gap-1 text-xs font-bold text-gray-300 hover:text-white">
                  <span>{userName}</span>
                  <ChevronDown className="w-3 h-3 text-gray-500 transition-transform duration-200" style={{ transform: isUserDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </div>
              </button>

              {/* Click-based Dropdown Menu */}
              {isUserDropdownOpen && (
                <>
                  {/* Backdrop Overlay to catch click-outside events */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsUserDropdownOpen(false)} 
                  />
                  
                  <div className="absolute right-0 top-10 mt-1.5 w-44 bg-[#111827] border border-[#1F2937] rounded-xl shadow-xl py-2 z-50 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setIsProfileOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-gray-300 hover:bg-neutral-800 hover:text-white cursor-pointer"
                    >
                      Profile Settings
                    </button>
                    <hr className="border-[#1F2937] my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-400 hover:bg-neutral-800 hover:text-red-300 cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto pb-24 lg:pb-8">
          <Outlet />
        </main>

        {/* 3. MOBILE BOTTOM NAVIGATION (horizontally scrollable) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0B0F19] border-t border-[#1F2937] z-40 py-2 px-3 flex gap-2 overflow-x-auto scrollbar-none shadow-[0_-2px_10px_rgba(0,0,0,0.5)] justify-start items-center">
          {menuItems.filter(item => !item.isHeader).map((item, idx) => {
            const Icon = item.icon!;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path + '-mobile-' + idx}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl text-[10px] font-bold tracking-wide whitespace-nowrap transition-all ${
                  isActive 
                    ? 'text-white bg-[#1D4ED8]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. DIALOG MODALS IN DARK STYLE */}

      {/* A. ADD ENTRY MODAL */}
      {isAddEntryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#111827] border border-[#1F2937] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col text-white">
            
            {/* Header */}
            <div className="flex justify-between items-center bg-[#0B0F19]/50 px-6 py-4.5 border-b border-[#1F2937]">
              <h2 className="text-sm font-extrabold text-white">Add Transaction</h2>
              <button 
                onClick={() => setIsAddEntryOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleAddEntrySubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              {entryError && (
                <div className="p-3.5 bg-red-955/40 text-red-300 border border-red-900/30 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{entryError}</span>
                </div>
              )}

              {/* Segmented Expense/Income Choice */}
              <div className="flex bg-[#0B0F19] p-1 rounded-2xl border border-[#1F2937]">
                <button
                  type="button"
                  onClick={() => setEntryType('expense')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    entryType === 'expense' ? 'bg-[#2F6F73] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('income')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    entryType === 'income' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3.5 py-2 text-sm text-white font-extrabold focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3.5 py-2 text-xs font-bold text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  />
                </div>
              </div>

              {/* Merchant / Description */}
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Merchant / Source</label>
                <input
                  type="text"
                  value={entryMerchant}
                  onChange={(e) => setEntryMerchant(e.target.value)}
                  required
                  placeholder="e.g. Acme Corp, Delta Labs, HDFC Bank"
                  className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                />
              </div>

              {/* Category & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Category</label>
                  <select
                    value={entryCategory}
                    onChange={(e) => setEntryCategory(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3.5 py-2 text-xs font-bold text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  >
                    {settings?.categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Account</label>
                  <select
                    value={entryAccount}
                    onChange={(e) => setEntryAccount(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3.5 py-2 text-xs font-bold text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  >
                    {settings?.accounts.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags Selector & Add Tag */}
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Tags</label>
                
                {entryTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {entryTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2F6F73]/15 text-[#7FA7A3]">
                        <span>{tag}</span>
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-400 text-gray-400 font-bold cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Enter tag name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1 bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="bg-neutral-800 hover:bg-neutral-700 border border-[#1F2937] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Attachment Checkbox */}
              <div className="border-t border-[#1F2937] pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachReceipt}
                    onChange={(e) => setAttachReceipt(e.target.checked)}
                    className="rounded border-[#1F2937] text-[#2F6F73] focus:ring-[#2F6F73]/25 bg-[#0B0F19]"
                  />
                  <span className="text-xs font-semibold text-gray-300">I have a receipt to attach</span>
                </label>

                {attachReceipt && (
                  <div className="mt-3 bg-[#0B0F19] border border-dashed border-[#1F2937] rounded-2xl p-4 flex flex-col items-center justify-center">
                    <input
                      type="file"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="text-xs font-semibold text-gray-400 w-full"
                    />
                    <p className="text-[10px] text-gray-500 mt-1 font-bold">Max size limit: 20 MB</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-[#1F2937] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddEntryOpen(false)}
                  className="px-4 py-2 border border-[#1F2937] hover:bg-neutral-800 rounded-xl text-xs font-bold text-gray-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEntry}
                  className="bg-[#2F6F73] hover:bg-[#25575a] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingEntry && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Save Entry</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* B. CSV IMPORT MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#111827] border border-[#1F2937] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col text-white">
            
            <div className="flex justify-between items-center bg-[#0B0F19]/50 px-6 py-4.5 border-b border-[#1F2937]">
              <h2 className="text-sm font-extrabold text-white">Import CSV Statement</h2>
              <button 
                onClick={() => {
                  setIsImportOpen(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                  setImportResult(null);
                  setImportError(null);
                }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              {importError && (
                <div className="p-3.5 bg-red-955/40 text-red-300 border border-red-900/30 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importResult && (
                <div className="p-3.5 bg-green-950/40 text-green-300 border border-green-900/30 rounded-xl text-xs font-semibold flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                    <span className="font-extrabold text-green-400 font-bold">Import Completed!</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] font-bold text-green-300/80 pl-1 space-y-0.5">
                    <li>Inserted transactions: {importResult.inserted}</li>
                    <li>Duplicate entries skipped: {importResult.duplicate}</li>
                  </ul>
                </div>
              )}

              {/* CSV File Input */}
              <div className="bg-[#0B0F19] border border-dashed border-[#1F2937] rounded-2xl p-6 flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvChange}
                  className="text-xs font-semibold text-gray-400 w-full"
                />
                <p className="text-[10px] text-gray-500 mt-1 font-bold">Max size limit: 20 MB</p>
              </div>

              {/* Column Mapping Controls */}
              {csvFile && csvHeaders.length > 0 && (
                <div className="space-y-3.5 border-t border-[#1F2937] pt-4">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Column Mappings</span>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold text-gray-400">
                    <div>
                      <label className="block text-[9px] font-bold mb-1">Date</label>
                      <select 
                        value={mappingDate} 
                        onChange={(e) => setMappingDate(parseInt(e.target.value))}
                        className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg p-1.5 text-white"
                      >
                        {csvHeaders.map((h, i) => <option key={i} value={i} className="bg-[#111827]">{h || `Col ${i}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold mb-1">Merchant</label>
                      <select 
                        value={mappingMerchant} 
                        onChange={(e) => setMappingMerchant(parseInt(e.target.value))}
                        className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg p-1.5 text-white"
                      >
                        {csvHeaders.map((h, i) => <option key={i} value={i} className="bg-[#111827]">{h || `Col ${i}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold mb-1">Amount</label>
                      <select 
                        value={mappingAmount} 
                        onChange={(e) => setMappingAmount(parseInt(e.target.value))}
                        className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg p-1.5 text-white"
                      >
                        {csvHeaders.map((h, i) => <option key={i} value={i} className="bg-[#111827]">{h || `Col ${i}`}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* CSV Preview Grid */}
                  {csvPreview.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Sample Data Preview</span>
                      <div className="border border-[#1F2937] rounded-xl overflow-hidden bg-[#0B0F19] p-2.5 max-h-[140px] overflow-y-auto">
                        <table className="w-full text-[10px] font-medium text-gray-400">
                          <thead>
                            <tr className="border-b border-[#1F2937] font-bold text-white">
                              <th className="p-1 text-left">Date</th>
                              <th className="p-1 text-left">Merchant</th>
                              <th className="p-1 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-neutral-800/40">
                                <td className="p-1 font-mono">{row[mappingDate] || '-'}</td>
                                <td className="p-1 font-bold text-white truncate max-w-[120px]">{row[mappingMerchant] || '-'}</td>
                                <td className="p-1 text-right font-extrabold text-green-400">{row[mappingAmount] || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-[#1F2937] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false);
                    setCsvFile(null);
                    setCsvPreview([]);
                    setImportResult(null);
                    setImportError(null);
                  }}
                  className="px-4 py-2 border border-[#1F2937] hover:bg-neutral-800 rounded-xl text-xs font-bold text-gray-400 cursor-pointer"
                >
                  Close
                </button>
                {csvFile && (
                  <button
                    type="submit"
                    disabled={importing}
                    className="bg-[#2F6F73] hover:bg-[#25575a] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {importing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>Start Import</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. DRIVE SYNC DIALOG MODAL */}
      {isSyncOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#111827] border border-[#1F2937] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white text-left">
            
            <div className="flex justify-between items-center bg-[#0B0F19]/50 px-6 py-4.5 border-b border-[#1F2937]">
              <h2 className="text-sm font-extrabold text-white">Google Drive Sync Status</h2>
              <button 
                onClick={() => {
                  setIsSyncOpen(false);
                  setSyncResult(null);
                  setSyncError(null);
                }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {syncError && (
                <div className="p-3.5 bg-red-955/40 text-red-300 border border-red-900/30 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{syncError}</span>
                </div>
              )}

              {syncResult && (
                <div className="p-3.5 bg-green-950/40 text-green-300 border border-green-900/30 rounded-xl text-xs font-semibold flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                    <span className="font-extrabold text-green-400 font-bold">Sync Completed Successfully!</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] font-bold text-green-300/80 pl-1 space-y-0.5">
                    <li>Status: {syncResult.status}</li>
                    <li>Transactions imported: {syncResult.importedCount}</li>
                    <li>Duplicate entries skipped: {syncResult.duplicateCount}</li>
                    <li>Documents needing review: {syncResult.reviewCount}</li>
                    <li>Sync errors: {syncResult.errorCount}</li>
                  </ul>
                </div>
              )}

              <div className="bg-[#0B0F19] p-4 rounded-2xl border border-[#1F2937] space-y-2.5 text-xs font-bold text-gray-400">
                <div className="flex justify-between items-center">
                  <span>Folder Name:</span>
                  <span className="text-white font-extrabold">{settings?.driveFolderName || 'Ledgerly Financial Inbox'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cadence:</span>
                  <span className="bg-[#2F6F73]/20 text-[#7FA7A3] px-2 py-0.5 rounded-full text-[9px] uppercase font-extrabold">8:00 AM Daily</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>TimeZone:</span>
                  <span className="text-white font-medium">Asia/Kolkata</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#1F2937]/50 pt-2 text-[10px] text-gray-500">
                  <span>Last Sync Status:</span>
                  <span className="uppercase text-white font-semibold">{settings?.driveSyncLogs?.lastStatus || 'never'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#1F2937] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsSyncOpen(false);
                    setSyncResult(null);
                    setSyncError(null);
                  }}
                  className="px-4 py-2 border border-[#1F2937] hover:bg-neutral-800 rounded-xl text-xs font-bold text-gray-400 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleDriveSyncSubmit}
                  disabled={syncing}
                  className="bg-[#2F6F73] hover:bg-[#25575a] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {syncing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Sync Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D. PROFILE SETTINGS DIALOG MODAL */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#111827] border border-[#1F2937] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white text-left">
            
            <div className="flex justify-between items-center bg-[#0B0F19]/50 px-6 py-4.5 border-b border-[#1F2937]">
              <h2 className="text-sm font-extrabold text-white">Profile Settings</h2>
              <button 
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
              
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center gap-3 bg-[#0B0F19] p-4 rounded-2xl border border-[#1F2937] text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-[#1F2937] flex items-center justify-center text-xl font-extrabold text-white overflow-hidden shadow-md">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      userName[0]
                    )}
                  </div>
                  {profilePhoto && (
                    <button
                      type="button"
                      onClick={() => setProfilePhoto('')}
                      className="absolute -top-1 -right-1 bg-red-600 text-white p-1 rounded-full text-[10px] hover:bg-red-700 cursor-pointer shadow-sm"
                      title="Remove Photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                
                <div>
                  <label className="bg-[#2F6F73] hover:bg-[#25575a] text-white text-xs font-bold px-4.5 py-2 rounded-xl cursor-pointer inline-block transition-colors shadow-sm">
                    Upload Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoChange} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[9px] text-gray-500 font-bold mt-1.5 uppercase">Supports PNG, JPG (Max 2MB)</p>
                </div>
              </div>

              {/* Name Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">First Name</label>
                  <input
                    type="text"
                    value={profileFirstName}
                    onChange={(e) => setProfileFirstName(e.target.value)}
                    required
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profileLastName}
                    onChange={(e) => setProfileLastName(e.target.value)}
                    required
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  />
                </div>
              </div>

              {/* Email details (read-only role/metadata) */}
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1 font-semibold">Registered Email</label>
                <input
                  type="email"
                  value={user?.email || 'admin@ledgerly.com'}
                  disabled
                  className="w-full bg-[#0B0F19]/60 border border-[#1F2937] rounded-xl px-3.5 py-2 text-xs text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2 border-t border-[#1F2937] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="px-4 py-2 border border-[#1F2937] hover:bg-neutral-800 rounded-xl text-xs font-bold text-gray-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-[#2F6F73] hover:bg-[#25575a] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {savingProfile && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Save Profile</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export function DashboardLayout() {
  return (
    <LedgerlyProvider>
      <DashboardLayoutInner />
    </LedgerlyProvider>
  );
}
