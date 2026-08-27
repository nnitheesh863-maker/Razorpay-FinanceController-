import { useState } from 'react';
import { useLedgerly } from '../context/LedgerlyContext';
import type { Transaction } from '../context/LedgerlyContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Search, 
  Trash2, 
  Plus, 
  X, 
  FileCheck, 
  FileQuestion,
  Tag as TagIcon
} from 'lucide-react';

export default function TransactionsPage() {
  const { 
    transactions, 
    tags, 
    settings, 
    updateTransactionInline, 
    deleteTransaction, 
    updatePreferences 
  } = useLedgerly();

  // Search, Filters & Periods
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState('All');

  // Tag Modal states
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  const selectedPeriod = settings?.selectedPeriod || 'all-time';

  const handlePeriodChange = async (period: string) => {
    try {
      await updatePreferences({ selectedPeriod: period });
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Date Period filtering
  const filterTransactionsByPeriod = (txs: Transaction[], period: string) => {
    if (period === 'all-time') return txs;
    const now = new Date();
    const start = new Date();
    
    if (period === 'this-month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'last-month') {
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return txs.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    } else if (period === 'last-3-months') {
      start.setMonth(now.getMonth() - 3);
    } else if (period === 'last-6-months') {
      start.setMonth(now.getMonth() - 6);
    } else if (period === 'this-year') {
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    
    return txs.filter(t => new Date(t.date) >= start);
  };

  const periodTxs = filterTransactionsByPeriod(transactions, selectedPeriod);

  // 2. Search & Category/Account filters
  const filteredTxs = periodTxs.filter(t => {
    const matchesSearch = 
      t.merchant.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.account.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesAccount = selectedAccount === 'All' || t.account === selectedAccount;

    return matchesSearch && matchesCategory && matchesAccount;
  });

  // --- Inline Edits ---
  const handleCategoryChange = async (id: string, newCategory: string) => {
    try {
      await updateTransactionInline(id, newCategory, undefined);
    } catch (err) {
      alert('Failed to update category.');
    }
  };

  const handleRemoveTag = async (tx: Transaction, tagToRemove: string) => {
    try {
      const currentTags: string[] = JSON.parse(tx.tags || '[]');
      const updatedTags = currentTags.filter(t => t !== tagToRemove);
      await updateTransactionInline(tx.id, undefined, updatedTags);
    } catch (err) {
      alert('Failed to remove tag.');
    }
  };

  // --- Tag Editor Modal Actions ---
  const openTagModal = (txId: string) => {
    setActiveTxId(txId);
    setNewTagName('');
    setTagError(null);
  };

  const handleSaveTagModal = async () => {
    if (!activeTxId) return;
    const trimmed = newTagName.trim();
    if (!trimmed) {
      setTagError('Tag name cannot be empty.');
      return;
    }

    try {
      const tx = transactions.find(t => t.id === activeTxId);
      if (tx) {
        const currentTags: string[] = JSON.parse(tx.tags || '[]');
        if (!currentTags.map(t => t.toLowerCase()).includes(trimmed.toLowerCase())) {
          currentTags.push(trimmed);
        }
        await updateTransactionInline(activeTxId, undefined, currentTags);
        setActiveTxId(null);
      }
    } catch (err: any) {
      setTagError(err.message || 'Failed to save tag.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
      } catch (err) {
        alert('Failed to delete transaction.');
      }
    }
  };

  const activeTx = transactions.find(t => t.id === activeTxId);
  const activeTxTags: string[] = activeTx ? JSON.parse(activeTx.tags || '[]') : [];

  return (
    <div className="space-y-6 text-left">
      
      {/* Date Period Selector Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
        <span className="text-xs font-bold text-gray-500">Date Range Filter</span>
        <div className="flex flex-wrap gap-1 bg-gray-100/60 p-1 rounded-xl">
          {[
            { label: 'All time', value: 'all-time' },
            { label: 'This Month', value: 'this-month' },
            { label: 'Last Month', value: 'last-month' },
            { label: 'Last 3 Mths', value: 'last-3-months' },
            { label: 'Last 6 Mths', value: 'last-6-months' },
            { label: 'This Year', value: 'this-year' },
          ].map((period) => (
            <button
              key={period.value}
              onClick={() => handlePeriodChange(period.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold tracking-tight transition-all cursor-pointer ${
                selectedPeriod === period.value
                  ? 'bg-white text-[#6558D3] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4.5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
        
        {/* Search */}
        <div className="relative">
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Search Entries</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant, category, account..."
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Category Filter</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
          >
            <option value="All">All Categories</option>
            {settings?.categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Account Filter */}
        <div>
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Account Filter</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
          >
            <option value="All">All Accounts</option>
            {settings?.accounts.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Transactions Table/List Wrapper */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Merchant / Source</th>
                <th className="px-6 py-4">Category (Click to edit)</th>
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4 text-center">Receipt</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400 font-bold">
                    No transactions found in selected period.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((t) => {
                  const txTags: string[] = JSON.parse(t.tags || '[]');
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/40 align-middle">
                      {/* Date */}
                      <td className="px-6 py-4 text-[10px] font-mono text-gray-400 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      
                      {/* Merchant */}
                      <td className="px-6 py-4 font-bold text-gray-900 truncate max-w-[160px]">
                        {t.merchant}
                      </td>
                      
                      {/* Category Dropdown */}
                      <td className="px-6 py-4">
                        <select
                          value={t.category}
                          onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                          className="bg-gray-100 hover:bg-gray-200 border-none text-gray-700 px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer focus:ring-1 focus:ring-[#6558D3]/50 focus:outline-none"
                        >
                          {settings?.categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      
                      {/* Account */}
                      <td className="px-6 py-4 text-gray-500 font-semibold whitespace-nowrap">
                        {t.account}
                      </td>
                      
                      {/* Tags inline */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                          {txTags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#6558D3]/10 text-[#6558D3]">
                              <span>{tag}</span>
                              <button 
                                onClick={() => handleRemoveTag(t, tag)}
                                className="text-[#6558D3]/70 hover:text-red-600 font-bold ml-0.5 text-[9px] cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => openTagModal(t.id)}
                            className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold transition-colors cursor-pointer"
                            title="Add Tag"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      
                      {/* Receipt Status */}
                      <td className="px-6 py-4 text-center" title={t.receipt === 1 ? "Receipt Attached" : "No Receipt"}>
                        {t.receipt === 1 ? (
                          <FileCheck className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <FileQuestion className="w-4 h-4 text-gray-300 mx-auto" />
                        )}
                      </td>
                      
                      {/* Signed Amount */}
                      <td className={`px-6 py-4 text-right font-extrabold whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. ADD TAG MODAL */}
      {activeTxId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            
            <div className="flex justify-between items-center bg-gray-50/50 px-6 py-4.5 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <TagIcon className="w-4 h-4 text-[#6558D3]" />
                <h2 className="text-xs font-extrabold text-gray-900">Manage Tags</h2>
              </div>
              <button 
                onClick={() => setActiveTxId(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {tagError && (
                <div className="p-2.5 bg-red-50 text-red-800 border border-red-100 rounded-xl text-[11px] font-semibold">
                  {tagError}
                </div>
              )}

              {/* Existing Tags selection list */}
              {tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase block tracking-wider">Select Existing Tags</span>
                  <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto border border-gray-100 p-2.5 rounded-xl bg-gray-50/30">
                    {tags.map(tName => {
                      const isLinked = activeTxTags.map(t => t.toLowerCase()).includes(tName.toLowerCase());
                      return (
                        <button
                          key={tName}
                          onClick={async () => {
                            if (!activeTxId) return;
                            const tx = transactions.find(t => t.id === activeTxId);
                            if (tx) {
                              let currentTags: string[] = JSON.parse(tx.tags || '[]');
                              if (isLinked) {
                                currentTags = currentTags.filter(t => t.toLowerCase() !== tName.toLowerCase());
                              } else {
                                currentTags.push(tName);
                              }
                              await updateTransactionInline(activeTxId, undefined, currentTags);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold cursor-pointer transition-colors ${
                            isLinked 
                              ? 'bg-[#6558D3] text-white shadow-xs' 
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {tName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Create/Type Tag */}
              <div>
                <label className="text-[9px] font-extrabold text-gray-400 uppercase block mb-1 tracking-wider">Create New Tag</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Enter tag name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveTagModal();
                      }
                    }}
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  />
                  <button
                    onClick={handleSaveTagModal}
                    className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-end border-t border-gray-100 pt-4 mt-6">
                <button
                  onClick={() => setActiveTxId(null)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
