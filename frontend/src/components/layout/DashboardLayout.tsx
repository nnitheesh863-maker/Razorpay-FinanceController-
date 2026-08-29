import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  X, 
  AlertCircle, 
  CheckCircle2, 
  PlusCircle, 
  UploadCloud, 
  CloudLightning
} from 'lucide-react';
import { LedgerlyProvider, useLedgerly } from '../../context/LedgerlyContext';
import { AppSidebar, TopHeader } from '../dashboard/ShellComponents';

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

  // Responsive Drawer Sidebar Menu State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      const nameParts = (user?.name || '').split(' ');
      setProfileFirstName(settings.firstName || nameParts[0] || '');
      setProfileLastName(settings.lastName || nameParts.slice(1).join(' ') || '');
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
        const userObjNameParts = (userObj.name || '').split(' ');
        if (settings.firstName && userObjNameParts[0] !== settings.firstName) {
          userObjNameParts[0] = settings.firstName;
          userObj.name = userObjNameParts.join(' ');
          changed = true;
        }
        if (settings.lastName && userObjNameParts.slice(1).join(' ') !== settings.lastName) {
          userObjNameParts[1] = settings.lastName;
          userObj.name = userObjNameParts.join(' ');
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
    : (user ? user.name : 'Admin');

  const menuItems = [
    { label: 'Overview', path: '/dashboard' },
    { label: 'Data Center', path: '/data-center' },
    { label: 'Reconciliation', path: '/reconciliation' },
    { label: 'Exceptions', path: '/exceptions' },
    { label: 'Cash Intelligence', path: '/cash-intelligence' },
    { label: 'AI Controller', path: '/agent' },
    { label: 'Control Score', path: '/control-score' },
    { label: 'Performance', path: '/analytics' },
    { label: 'Audit Trail', path: '/audit-logs' },
    { label: 'Settings', path: '/settings' }
  ];

  // Get current page header title
  const currentTitle = location.pathname.startsWith('/admin') 
    ? 'Admin Control Portal' 
    : (menuItems.find(item => location.pathname.startsWith(item.path))?.label || 'Overview');

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
        userObj.name = `${profileFirstName.trim()} ${profileLastName.trim()}`.trim();
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
    <div className="min-h-screen flex bg-[#F6F8FA] text-[#0B1726] selection:bg-[#2F6F73]/20">
      
      {/* 1. App Sidebar Component */}
      <AppSidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        userName={userName}
        userEmail={user?.email}
        userPhoto={profilePhoto}
      />

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* 2. Top Header Component */}
        <TopHeader 
          title={currentTitle}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          userName={userName}
          userPhoto={profilePhoto}
        />

        {/* Content Outlet */}
        <Outlet />

      </div>




      {/* ======================================================== */}
      {/* 4. DIALOG MODALS IN DARK STYLE */}

      {/* A. ADD ENTRY MODAL */}
      {isAddEntryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E4E7EC] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col text-[#0B1726]">
            
            {/* Header */}
            <div className="flex justify-between items-center bg-[#F6F8FA] px-6 py-4.5 border-b border-[#E4E7EC]">
              <h2 className="text-sm font-extrabold text-[#0B1726]">Add Transaction</h2>
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
                <div className="p-3.5 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{entryError}</span>
                </div>
              )}

              {/* Segmented Choice */}
              <div className="flex bg-[#F6F8FA] p-1 rounded-2xl border border-[#E4E7EC]">
                <button
                  type="button"
                  onClick={() => setEntryType('expense')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    entryType === 'expense' ? 'bg-[#2F6F73] text-white shadow-sm' : 'text-[#667085] hover:text-[#0B1726]'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('income')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    entryType === 'income' ? 'bg-green-600 text-white shadow-sm' : 'text-[#667085] hover:text-[#0B1726]'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl px-3.5 py-2 text-sm text-[#0B1726] font-extrabold focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl px-3.5 py-2 text-xs font-bold text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  />
                </div>
              </div>

              {/* Merchant */}
              <div>
                <label className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">Merchant / Source</label>
                <input
                  type="text"
                  value={entryMerchant}
                  onChange={(e) => setEntryMerchant(e.target.value)}
                  required
                  placeholder="e.g. Acme Corp, Delta Labs, HDFC Bank"
                  className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl px-3.5 py-2 text-xs font-semibold text-[#0B1726] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                />
              </div>

              {/* Category & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">Category</label>
                  <select
                    value={entryCategory}
                    onChange={(e) => setEntryCategory(e.target.value)}
                    className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl px-3.5 py-2 text-xs font-bold text-[#0B1726] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  >
                    {settings?.categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">Account</label>
                  <select
                    value={entryAccount}
                    onChange={(e) => setEntryAccount(e.target.value)}
                    className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl px-3.5 py-2 text-xs font-bold text-[#0B1726] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  >
                    {settings?.accounts.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">Tags</label>
                
                {entryTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {entryTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2F6F73]/15 text-[#2F6F73]">
                        <span>{tag}</span>
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-600 text-gray-500 font-bold cursor-pointer">×</button>
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
                    className="flex-1 bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl px-3.5 py-1.5 text-xs font-semibold text-[#0B1726] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="bg-[#F2F4F7] hover:bg-[#E4E7EC] border border-[#E4E7EC] text-[#0B1726] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Attachment Checkbox */}
              <div className="border-t border-[#E4E7EC] pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachReceipt}
                    onChange={(e) => setAttachReceipt(e.target.checked)}
                    className="rounded border-[#E4E7EC] text-[#2F6F73] focus:ring-[#2F6F73]/25 bg-[#F6F8FA]"
                  />
                  <span className="text-xs font-semibold text-[#667085]">I have a receipt to attach</span>
                </label>

                {attachReceipt && (
                  <div className="mt-3 bg-[#F6F8FA] border border-dashed border-[#E4E7EC] rounded-2xl p-4 flex flex-col items-center justify-center">
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
              <div className="flex justify-end gap-2 border-t border-[#E4E7EC] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddEntryOpen(false)}
                  className="px-4 py-2 border border-[#E4E7EC] hover:bg-[#F2F4F7] rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
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
          <div className="bg-white border border-[#E4E7EC] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col text-[#0B1726]">
            
            <div className="flex justify-between items-center bg-[#F6F8FA] px-6 py-4.5 border-b border-[#E4E7EC]">
              <h2 className="text-sm font-extrabold text-[#0B1726]">Import CSV Statement</h2>
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
                <div className="p-3.5 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importResult && (
                <div className="p-3.5 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-semibold flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
                    <span className="font-extrabold text-green-900 font-bold">Import Completed!</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] font-bold text-green-800/80 pl-1 space-y-0.5">
                    <li>Inserted transactions: {importResult.inserted}</li>
                    <li>Duplicate entries skipped: {importResult.duplicate}</li>
                  </ul>
                </div>
              )}

              {/* CSV File Input */}
              <div className="bg-[#F6F8FA] border border-dashed border-[#E4E7EC] rounded-2xl p-6 flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvChange}
                  className="text-xs font-semibold text-gray-500 w-full"
                />
                <p className="text-[10px] text-gray-400 mt-1 font-bold">Max size limit: 20 MB</p>
              </div>

              {/* Column Mapping Controls */}
              {csvFile && csvHeaders.length > 0 && (
                <div className="space-y-3.5 border-t border-[#E4E7EC] pt-4">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Column Mappings</span>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold text-gray-600">
                    <div>
                      <label className="block text-[9px] font-bold mb-1">Date</label>
                      <select 
                        value={mappingDate} 
                        onChange={(e) => setMappingDate(parseInt(e.target.value))}
                        className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-lg p-1.5 text-[#0B1726]"
                      >
                        {csvHeaders.map((h, i) => <option key={i} value={i} className="bg-white">{h || `Col ${i}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold mb-1">Merchant</label>
                      <select 
                        value={mappingMerchant} 
                        onChange={(e) => setMappingMerchant(parseInt(e.target.value))}
                        className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-lg p-1.5 text-[#0B1726]"
                      >
                        {csvHeaders.map((h, i) => <option key={i} value={i} className="bg-white">{h || `Col ${i}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold mb-1">Amount</label>
                      <select 
                        value={mappingAmount} 
                        onChange={(e) => setMappingAmount(parseInt(e.target.value))}
                        className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-lg p-1.5 text-[#0B1726]"
                      >
                        {csvHeaders.map((h, i) => <option key={i} value={i} className="bg-white">{h || `Col ${i}`}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* CSV Preview Grid */}
                  {csvPreview.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Sample Data Preview</span>
                      <div className="border border-[#E4E7EC] rounded-xl overflow-hidden bg-[#F6F8FA] p-2.5 max-h-[140px] overflow-y-auto">
                        <table className="w-full text-[10px] font-medium text-gray-500">
                          <thead>
                            <tr className="border-b border-[#E4E7EC] font-bold text-[#0B1726]">
                              <th className="p-1 text-left">Date</th>
                              <th className="p-1 text-left">Merchant</th>
                              <th className="p-1 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-neutral-100/50">
                                <td className="p-1 font-mono">{row[mappingDate] || '-'}</td>
                                <td className="p-1 font-bold text-[#0B1726] truncate max-w-[120px]">{row[mappingMerchant] || '-'}</td>
                                <td className="p-1 text-right font-extrabold text-green-600">{row[mappingAmount] || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-[#E4E7EC] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false);
                    setCsvFile(null);
                    setCsvPreview([]);
                    setImportResult(null);
                    setImportError(null);
                  }}
                  className="px-4 py-2 border border-[#E4E7EC] hover:bg-[#F2F4F7] rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
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
          <div className="bg-white border border-[#E4E7EC] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#0B1726] text-left">
            
            <div className="flex justify-between items-center bg-[#F6F8FA] px-6 py-4.5 border-b border-[#E4E7EC]">
              <h2 className="text-sm font-extrabold text-[#0B1726]">Google Drive Sync Status</h2>
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
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{syncError}</span>
                </div>
              )}

              {syncResult && (
                <div className="p-3.5 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-semibold flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
                    <span className="font-extrabold text-green-900 font-bold">Sync Completed Successfully!</span>
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

              <div className="bg-[#F6F8FA] p-4 rounded-2xl border border-[#E4E7EC] space-y-2.5 text-xs font-bold text-gray-500">
                <div className="flex justify-between items-center">
                  <span>Folder Name:</span>
                  <span className="text-[#0B1726] font-extrabold">{settings?.driveFolderName || 'Ledgerly Financial Inbox'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cadence:</span>
                  <span className="bg-[#2F6F73]/15 text-[#2F6F73] px-2 py-0.5 rounded-full text-[9px] uppercase font-extrabold">8:00 AM Daily</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>TimeZone:</span>
                  <span className="text-[#0B1726] font-medium">Asia/Kolkata</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#E4E7EC] pt-2 text-[10px] text-gray-400">
                  <span>Last Sync Status:</span>
                  <span className="uppercase text-[#0B1726] font-semibold">{settings?.driveSyncLogs?.lastStatus || 'never'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E4E7EC] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsSyncOpen(false);
                    setSyncResult(null);
                    setSyncError(null);
                  }}
                  className="px-4 py-2 border border-[#E4E7EC] hover:bg-[#F2F4F7] rounded-xl text-xs font-bold text-gray-400 cursor-pointer"
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
          <div className="bg-white border border-[#E4E7EC] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#0B1726] text-left">
            
            <div className="flex justify-between items-center bg-[#F6F8FA] px-6 py-4.5 border-b border-[#E4E7EC]">
              <h2 className="text-sm font-extrabold text-[#0B1726]">Profile Settings</h2>
              <button 
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
              
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center gap-3 bg-[#F6F8FA] p-4 rounded-2xl border border-[#E4E7EC] text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[#F2F4F7] border-2 border-[#E4E7EC] flex items-center justify-center text-xl font-extrabold text-[#667085] overflow-hidden shadow-md">
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
                  <label className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">First Name</label>
                  <input
                    type="text"
                    value={profileFirstName}
                    onChange={(e) => setProfileFirstName(e.target.value)}
                    required
                    className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl px-3.5 py-2 text-xs text-[#0B1726] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profileLastName}
                    onChange={(e) => setProfileLastName(e.target.value)}
                    required
                    className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl px-3.5 py-2 text-xs text-[#0B1726] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/30"
                  />
                </div>
              </div>

              {/* Email details */}
              <div>
                <label className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1 font-semibold">Registered Email</label>
                <input
                  type="email"
                  value={user?.email || 'admin@ledgerly.com'}
                  disabled
                  className="w-full bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl px-3.5 py-2 text-xs text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2 border-t border-[#E4E7EC] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="px-4 py-2 border border-[#E4E7EC] hover:bg-[#F2F4F7] rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
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
