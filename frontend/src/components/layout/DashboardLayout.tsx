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
  AlertCircle
} from 'lucide-react';
import { LedgerlyProvider, useLedgerly } from '../../context/LedgerlyContext';

// Primary Ledgerly Topbar and Sidebar layout wrapper
function DashboardLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    settings, 
    addTransactions, 
    uploadDocumentFile, 
    syncGoogleDrive,
    refetchState 
  } = useLedgerly();

  // Dialog Modals State
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  // Parse active username
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Nitheesh';
  
  // Navigation Menu specs
  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
    { label: 'Recurring', path: '/recurring', icon: Repeat },
    { label: 'Subscriptions', path: '/subscriptions', icon: Package },
    { label: 'Budgets', path: '/budgets', icon: PieChart },
    { label: 'Goals', path: '/goals', icon: Target },
    { label: 'Documents', path: '/documents', icon: FileText },
    { label: 'Rules', path: '/rules', icon: Sliders },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  // Get current page header title
  const currentTitle = menuItems.find(item => location.pathname.startsWith(item.path))?.label || 'Ledgerly';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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

  // Set default dropdown picks when settings load
  useEffect(() => {
    if (settings) {
      if (settings.categories && settings.categories.length > 0) {
        setEntryCategory(settings.categories[0]);
      }
      if (settings.accounts && settings.accounts.length > 0) {
        setEntryAccount(settings.accounts[0]);
      }
    }
  }, [settings]);

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !entryTags.includes(trimmed)) {
      setEntryTags(prev => [...prev, trimmed]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setEntryTags(prev => prev.filter(t => t !== tag));
  };

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
        // Upload receipt to R2 first
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
          setCsvPreview(rows.slice(1, 6).filter(r => r.length > 1)); // show preview of first 5 records
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

        // Auto map type: debit/negative -> expense, credit/positive -> income
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
      await refetchState(); // update logs
    } catch (err: any) {
      setSyncError(err.message || 'Sync connection failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-800">
      
      {/* 1. DESKTOP LEFT SIDEBAR (238 px wide) */}
      <aside className="w-[238px] flex-shrink-0 bg-white border-r border-gray-100 hidden lg:flex lg:flex-col h-screen sticky top-0">
        
        {/* Brand header */}
        <div className="h-[76px] px-6 border-b border-gray-50 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#6558D3] to-[#8b7eff] rounded-xl flex items-center justify-center text-white shadow-md shadow-primary-500/10">
            <span className="font-extrabold text-sm tracking-tighter">LD</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-gray-900 text-sm tracking-tight leading-none">Ledgerly</span>
            <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Personal Finance</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-[#6558D3]/10 text-[#6558D3]' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout in Sidebar */}
        <div className="p-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
              {userName[0]}
            </div>
            <div className="flex flex-col text-left max-w-[120px]">
              <span className="text-[11px] font-bold text-gray-800 truncate">{userName}</span>
              <span className="text-[9px] text-gray-400 font-semibold truncate uppercase">Owner</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-400 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 2. STICKY TOP BAR (76 px high) */}
        <header className="h-[76px] bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
          
          {/* Left: Tab Title */}
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-lg text-gray-900 tracking-tight lg:block hidden">{currentTitle}</span>
            <div className="flex items-center gap-1.5 lg:hidden">
              {/* Compact Logo for Mobile */}
              <div className="w-7 h-7 bg-[#6558D3] rounded-lg flex items-center justify-center text-white font-bold text-xs">L</div>
              <span className="font-extrabold text-sm text-gray-900 tracking-tight">{currentTitle}</span>
            </div>
          </div>

          {/* Right: Actions and Sync Controls */}
          <div className="flex items-center gap-2">
            
            {/* Sync Drive action */}
            <button 
              onClick={() => setIsSyncOpen(true)}
              className="px-3.5 py-2 border border-gray-100 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-600 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sync Google Drive"
            >
              <CloudLightning className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Drive sync</span>
            </button>

            {/* Import statement action */}
            <button 
              onClick={() => setIsImportOpen(true)}
              className="px-3.5 py-2 border border-gray-100 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-600 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Import CSV statement"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </button>

            {/* Manual entry action */}
            <button 
              onClick={() => setIsAddEntryOpen(true)}
              className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-primary-500/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Add manual entry"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add entry</span>
            </button>

            {/* Mobile user profile log out */}
            <button 
              onClick={handleLogout}
              className="lg:hidden p-2 hover:bg-red-50 hover:text-red-600 rounded-xl text-gray-400 transition-colors cursor-pointer ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto pb-24 lg:pb-8">
          <Outlet />
        </main>

        {/* 3. MOBILE BOTTOM NAVIGATION (horizontally scrollable) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 py-2 px-3 flex gap-2 overflow-x-auto scrollbar-none shadow-[0_-2px_10px_rgba(0,0,0,0.03)] justify-start items-center">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl text-[10px] font-bold tracking-wide whitespace-nowrap transition-all ${
                  isActive 
                    ? 'text-[#6558D3]' 
                    : 'text-gray-400 hover:text-gray-700'
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
      {/* 4. MODAL DIALOGS */}

      {/* A. ADD ENTRY MODAL */}
      {isAddEntryOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center bg-gray-50/50 px-6 py-4.5 border-b border-gray-100">
              <h2 className="text-sm font-extrabold text-gray-900">Add Transaction</h2>
              <button 
                onClick={() => setIsAddEntryOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleAddEntrySubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              {entryError && (
                <div className="p-3.5 bg-red-50 text-red-800 border border-red-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{entryError}</span>
                </div>
              )}

              {/* Segmented Expense/Income Choice */}
              <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-100">
                <button
                  type="button"
                  onClick={() => setEntryType('expense')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    entryType === 'expense' ? 'bg-[#6558D3] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('income')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    entryType === 'income' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
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
                  placeholder="e.g. Netflix, Target, Walmart"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                />
              </div>

              {/* Category & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Category</label>
                  <select
                    value={entryCategory}
                    onChange={(e) => setEntryCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
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
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
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
                
                {/* Tag Pills */}
                {entryTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {entryTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#6558D3]/10 text-[#6558D3]">
                        <span>{tag}</span>
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-600 text-[#6558D3]/70 font-bold cursor-pointer">×</button>
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
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="bg-gray-100 hover:bg-gray-200 border border-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Attachment Checkbox */}
              <div className="border-t border-gray-50 pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachReceipt}
                    onChange={(e) => setAttachReceipt(e.target.checked)}
                    className="rounded border-gray-300 text-[#6558D3] focus:ring-[#6558D3]"
                  />
                  <span className="text-xs font-semibold text-gray-600">I have a receipt to attach</span>
                </label>

                {attachReceipt && (
                  <div className="mt-3 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                    <input
                      type="file"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="text-xs font-semibold text-gray-500 w-full"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 font-bold">Max size limit: 20 MB</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddEntryOpen(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEntry}
                  className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            <div className="flex justify-between items-center bg-gray-50/50 px-6 py-4.5 border-b border-gray-100">
              <h2 className="text-sm font-extrabold text-gray-900">Import CSV Statement</h2>
              <button 
                onClick={() => {
                  setIsImportOpen(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                  setImportResult(null);
                  setImportError(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              {importError && (
                <div className="p-3.5 bg-red-50 text-red-800 border border-red-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importResult && (
                <div className="p-3.5 bg-green-50 text-green-800 border border-green-100 rounded-xl text-xs font-semibold flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
                    <span className="font-extrabold text-green-900">Import Completed!</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] font-bold text-green-800/80 pl-1 space-y-0.5">
                    <li>Inserted transactions: {importResult.inserted}</li>
                    <li>Duplicate entries skipped: {importResult.duplicate}</li>
                  </ul>
                </div>
              )}

              {/* CSV File Input */}
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvChange}
                  className="text-xs font-semibold text-gray-500 w-full"
                />
                <p className="text-[10px] text-gray-400 mt-1 font-bold">Max size limit: 20 MB</p>
              </div>

              {/* Column Mapping Controls (Displayed only when file is selected) */}
              {csvFile && csvHeaders.length > 0 && (
                <div className="space-y-3.5 border-t border-gray-50 pt-4">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Column Mappings</span>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold text-gray-500">
                    <div>
                      <label className="block text-[9px] font-bold mb-1">Date</label>
                      <select 
                        value={mappingDate} 
                        onChange={(e) => setMappingDate(parseInt(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg p-1.5"
                      >
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h || `Col ${i}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold mb-1">Merchant</label>
                      <select 
                        value={mappingMerchant} 
                        onChange={(e) => setMappingMerchant(parseInt(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg p-1.5"
                      >
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h || `Col ${i}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold mb-1">Amount</label>
                      <select 
                        value={mappingAmount} 
                        onChange={(e) => setMappingAmount(parseInt(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg p-1.5"
                      >
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h || `Col ${i}`}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* CSV Preview Grid */}
                  {csvPreview.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Sample Data Preview</span>
                      <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 p-2.5 max-h-[140px] overflow-y-auto">
                        <table className="w-full text-[10px] font-medium text-gray-500">
                          <thead>
                            <tr className="border-b border-gray-100 font-bold text-gray-700">
                              <th className="p-1 text-left">Date</th>
                              <th className="p-1 text-left">Merchant</th>
                              <th className="p-1 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-gray-100/50">
                                <td className="p-1 font-mono">{row[mappingDate] || '-'}</td>
                                <td className="p-1 font-bold text-gray-700 truncate max-w-[120px]">{row[mappingMerchant] || '-'}</td>
                                <td className="p-1 text-right font-extrabold text-gray-900">{row[mappingAmount] || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false);
                    setCsvFile(null);
                    setCsvPreview([]);
                    setImportResult(null);
                    setImportError(null);
                  }}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
                >
                  Close
                </button>
                {csvFile && (
                  <button
                    type="submit"
                    disabled={importing}
                    className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            
            <div className="flex justify-between items-center bg-gray-50/50 px-6 py-4.5 border-b border-gray-100">
              <h2 className="text-sm font-extrabold text-gray-900">Google Drive Sync Status</h2>
              <button 
                onClick={() => {
                  setIsSyncOpen(false);
                  setSyncResult(null);
                  setSyncError(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {syncError && (
                <div className="p-3.5 bg-red-50 text-red-800 border border-red-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{syncError}</span>
                </div>
              )}

              {syncResult && (
                <div className="p-3.5 bg-green-50 text-green-800 border border-green-100 rounded-xl text-xs font-semibold flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
                    <span className="font-extrabold text-green-900">Sync Completed Successfully!</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] font-bold text-green-800/80 pl-1 space-y-0.5">
                    <li>Status: {syncResult.status}</li>
                    <li>Transactions imported: {syncResult.importedCount}</li>
                    <li>Duplicate entries skipped: {syncResult.duplicateCount}</li>
                    <li>Documents needing review: {syncResult.reviewCount}</li>
                    <li>Sync errors: {syncResult.errorCount}</li>
                  </ul>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2.5 text-xs font-bold text-gray-600">
                <div className="flex justify-between items-center">
                  <span>Folder Name:</span>
                  <span className="text-gray-800 font-extrabold">{settings?.driveFolderName || 'Ledgerly Financial Inbox'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cadence:</span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[9px] uppercase font-extrabold">8:00 AM Daily</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>TimeZone:</span>
                  <span className="text-gray-800 font-medium">Asia/Kolkata</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200/50 pt-2 text-[10px] text-gray-400">
                  <span>Last Sync Status:</span>
                  <span className="uppercase text-gray-600">{settings?.driveSyncLogs?.lastStatus || 'never'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsSyncOpen(false);
                    setSyncResult(null);
                    setSyncError(null);
                  }}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleDriveSyncSubmit}
                  disabled={syncing}
                  className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {syncing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Sync Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Global Provider Wrapper
export function DashboardLayout() {
  return (
    <LedgerlyProvider>
      <DashboardLayoutInner />
    </LedgerlyProvider>
  );
}
