import React, { useState } from 'react';
import { useLedgerly } from '../context/LedgerlyContext';
import { formatCurrency } from '../utils/formatters';
import { 
  AlertTriangle, 
  X, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

export default function SettingsPage() {
  const { settings, updatePreferences, wipeData } = useLedgerly();

  // Net Worth Form State
  const [assets, setAssets] = useState(settings?.assetsTotal ? String(settings.assetsTotal) : '0');
  const [liabilities, setLiabilities] = useState(settings?.liabilitiesTotal ? String(settings.liabilitiesTotal) : '0');
  const [nwSuccess, setNwSuccess] = useState(false);

  // Lists additions state
  const [newCategory, setNewCategory] = useState('');
  const [newAccount, setNewAccount] = useState('');

  // Sync state settings
  const [folderName, setFolderName] = useState(settings?.driveFolderName || 'Ledgerly Financial Inbox');
  const [folderUrl, setFolderUrl] = useState(settings?.driveFolderUrl || '');

  // Wipe Modal State
  const [isWipeOpen, setIsWipeOpen] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [wiping, setWiping] = useState(false);

  if (!settings) return null;

  // --- Net Worth Save ---
  const handleSaveNetWorth = async (e: React.FormEvent) => {
    e.preventDefault();
    setNwSuccess(false);
    const ast = parseFloat(assets) || 0;
    const lia = parseFloat(liabilities) || 0;
    try {
      await updatePreferences({
        assetsTotal: ast,
        liabilitiesTotal: lia,
        netWorthConfigured: true
      });
      setNwSuccess(true);
      setTimeout(() => setNwSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update Net Worth.');
    }
  };

  // --- Lists Add/Delete ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategory.trim();
    if (!clean) return;
    if (settings.categories.map(c => c.toLowerCase()).includes(clean.toLowerCase())) {
      alert('Category already exists.');
      return;
    }
    try {
      const updated = [...settings.categories, clean];
      await updatePreferences({ categories: updated });
      setNewCategory('');
    } catch (err) {
      alert('Failed to add category.');
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    if (settings.categories.length <= 1) {
      alert('You must keep at least one category.');
      return;
    }
    if (confirm(`Are you sure you want to remove category "${catName}"? Existing transactions will retain their label.`)) {
      try {
        const updated = settings.categories.filter(c => c !== catName);
        await updatePreferences({ categories: updated });
      } catch (err) {
        alert('Failed to delete category.');
      }
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAccount.trim();
    if (!clean) return;
    if (settings.accounts.map(a => a.toLowerCase()).includes(clean.toLowerCase())) {
      alert('Account already exists.');
      return;
    }
    try {
      const updated = [...settings.accounts, clean];
      await updatePreferences({ accounts: updated });
      setNewAccount('');
    } catch (err) {
      alert('Failed to add account.');
    }
  };

  const handleDeleteAccount = async (accName: string) => {
    if (settings.accounts.length <= 1) {
      alert('You must keep at least one account.');
      return;
    }
    if (confirm(`Are you sure you want to remove account "${accName}"?`)) {
      try {
        const updated = settings.accounts.filter(a => a !== accName);
        await updatePreferences({ accounts: updated });
      } catch (err) {
        alert('Failed to delete account.');
      }
    }
  };

  // --- Sync metadata save ---
  const handleSaveSyncSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePreferences({
        driveFolderName: folderName.trim(),
        driveFolderUrl: folderUrl.trim()
      });
      alert('Sync settings updated successfully.');
    } catch (err) {
      alert('Failed to update sync settings.');
    }
  };

  // --- Reset Ignored Recommendations ---
  const handleRestoreIgnored = async () => {
    try {
      await updatePreferences({ dismissedPatterns: [] });
      alert('Ignored suggestions restored. Review the Recurring/Subscriptions tabs to see candidates.');
    } catch (err) {
      alert('Failed to restore suggestions.');
    }
  };

  // --- Wipe Complete Data ---
  const handleWipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWipeError(null);
    if (wipeConfirmInput !== 'DELETE') {
      setWipeError('Please type the validation code "DELETE" exactly.');
      return;
    }

    setWiping(true);
    try {
      await wipeData('DELETE ALL LEDGERLY DATA');
      setIsWipeOpen(false);
      alert('All Ledgerly data has been erased successfully.');
      window.location.reload(); // Hard refresh to flush cached provider
    } catch (err: any) {
      setWipeError(err.message || 'Wipe transaction failed.');
    } finally {
      setWiping(false);
    }
  };

  const netWorthVal = (parseFloat(assets) || 0) - (parseFloat(liabilities) || 0);

  return (
    <div className="space-y-6 text-left max-w-4xl">
      
      {/* 1. Net Worth Setup Panel */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
        <div>
          <h3 className="text-xs font-bold text-gray-900">Net Worth Configuration</h3>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Asset and liability totals are user-entered and independent from monthly transactions</p>
        </div>

        {nwSuccess && (
          <div className="mt-3 p-2.5 bg-green-50 text-green-800 border border-green-100 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>Net Worth totals saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSaveNetWorth} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Total Assets ($)</label>
            <input
              type="number"
              step="0.01"
              value={assets}
              onChange={(e) => setAssets(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Total Liabilities ($)</label>
            <input
              type="number"
              step="0.01"
              value={liabilities}
              onChange={(e) => setLiabilities(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-[#6558D3] hover:bg-[#4d3ecc] text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Save Totals
            </button>
            <div className="px-3.5 py-2 bg-gray-100 text-gray-900 rounded-xl text-xs font-extrabold text-center min-w-[90px]">
              {formatCurrency(netWorthVal)}
            </div>
          </div>
        </form>
      </div>

      {/* 2. Lists definition panels (Categories & Accounts side-by-side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Category list */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Manage Category Pickers</h3>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Customize transaction classification lists</p>
          </div>

          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Travel, Education"
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none"
            />
            <button type="submit" className="bg-gray-100 hover:bg-gray-200 border border-gray-100 text-gray-700 px-3 rounded-xl text-xs font-bold cursor-pointer">
              Add
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto border border-gray-100 p-3 rounded-xl bg-gray-50/20">
            {settings.categories.map(c => (
              <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-[#6558D3]/5 text-[#6558D3] border border-[#6558D3]/5">
                <span>{c}</span>
                <button type="button" onClick={() => handleDeleteCategory(c)} className="text-gray-400 hover:text-red-600 font-bold cursor-pointer">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Account list */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Manage Account Pickers</h3>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Customize active accounts (Checking, Visa, Cash)</p>
          </div>

          <form onSubmit={handleAddAccount} className="flex gap-2">
            <input
              type="text"
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
              placeholder="e.g. Savings Fund, Amex"
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none"
            />
            <button type="submit" className="bg-gray-100 hover:bg-gray-200 border border-gray-100 text-gray-700 px-3 rounded-xl text-xs font-bold cursor-pointer">
              Add
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto border border-gray-100 p-3 rounded-xl bg-gray-50/20">
            {settings.accounts.map(a => (
              <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                <span>{a}</span>
                <button type="button" onClick={() => handleDeleteAccount(a)} className="text-gray-400 hover:text-red-600 font-bold cursor-pointer">×</button>
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Google Drive Sync Settings */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold text-gray-900">Google Drive Configuration</h3>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Automations poll this directory once daily at 8:00 AM</p>
        </div>

        <form onSubmit={handleSaveSyncSettings} className="space-y-4 max-w-xl text-left">
          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Target Folder Name</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Folder URL Link (Optional)</label>
            <input
              type="text"
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Update Folders Settings
          </button>
        </form>
      </div>

      {/* 4. Scanner Restore Settings */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div className="space-y-1 text-left">
          <h3 className="text-xs font-bold text-gray-900">Scan Exclusions</h3>
          <span className="text-[10px] text-gray-400 font-semibold block leading-tight">
            Ignored recurring suggestions: {settings.dismissedPatterns.length} merchants. Click restore to clear the blacklist.
          </span>
        </div>

        <button
          onClick={handleRestoreIgnored}
          disabled={settings.dismissedPatterns.length === 0}
          className="bg-gray-100 hover:bg-gray-200 border border-gray-100 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restore Suggestions</span>
        </button>
      </div>

      {/* 5. Danger Zone Complete Purge */}
      <div className="bg-red-50/30 border border-red-100 rounded-2xl p-5 space-y-4">
        <div className="text-left space-y-1">
          <h3 className="text-xs font-extrabold text-red-800 uppercase tracking-wide">Danger Zone</h3>
          <span className="text-[10px] text-red-700/70 font-semibold block leading-snug">
            Erase all Ledgerly data. This irreversibly drops all transactions, document records, custom budgets, rules, and tags definitions from D1 PostgreSQL databases and disk folders.
          </span>
        </div>

        <button
          onClick={() => {
            setWipeConfirmInput('');
            setWipeError(null);
            setIsWipeOpen(true);
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md shadow-red-500/10"
        >
          Erase All Ledgerly Data
        </button>
      </div>

      {/* Wipe Confirmation Modal */}
      {isWipeOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            
            <div className="flex justify-between items-center bg-red-50 px-6 py-4.5 border-b border-red-100">
              <div className="flex items-center gap-2 text-red-800 font-extrabold">
                <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
                <span className="text-xs">Confirm Complete Destruction</span>
              </div>
              <button onClick={() => setIsWipeOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWipeSubmit} className="p-6 space-y-4">
              {wipeError && (
                <div className="p-2.5 bg-red-50 text-red-800 border border-red-100 rounded-xl text-xs font-semibold">
                  {wipeError}
                </div>
              )}

              <p className="text-[11px] font-bold text-gray-500 leading-relaxed">
                This action is irreversible. All database records (transactions, rules, tags, preferences) and file uploads will be permanently destroyed. Original Google Drive files will remain safe.
              </p>

              <div>
                <label className="text-[10px] font-extrabold text-red-700 uppercase block mb-1 tracking-wider">
                  Type "DELETE" to authorize
                </label>
                <input
                  type="text"
                  value={wipeConfirmInput}
                  onChange={(e) => setWipeConfirmInput(e.target.value)}
                  placeholder="Type DELETE"
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600/20"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsWipeOpen(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={wipeConfirmInput !== 'DELETE' || wiping}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {wiping && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Execute Complete Wipe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
