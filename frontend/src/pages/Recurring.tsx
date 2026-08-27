import React, { useState } from 'react';
import { useLedgerly } from '../context/LedgerlyContext';
import type { RecurringItem } from '../context/LedgerlyContext';
import { detectPatterns } from '../utils/detection';
import type { SuggestedPattern } from '../utils/detection';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Repeat, 
  Sparkles, 
  Plus, 
  Trash2, 
  X, 
  AlertCircle,
  TrendingUp,
  Clock,
  ThumbsUp,
  EyeOff
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function RecurringPage() {
  const { transactions, settings, updatePreferences } = useLedgerly();

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState('monthly');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [account, setAccount] = useState('Main Checking');
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmedList = settings?.recurring || [];
  const dismissedList = settings?.dismissedPatterns || [];

  // Run detection
  const allSuggestions = detectPatterns(transactions, dismissedList);
  // Filter for non-subscription recurring bills
  const suggestedBills = allSuggestions.filter(s => !s.isSubscription);

  // Totals calculations
  const calculateTotals = () => {
    let monthlyTotal = 0;
    // Add confirmed bills
    confirmedList.forEach(item => {
      if (!item.active) return;
      let equiv = item.amount;
      if (item.cadence === 'weekly') equiv = (item.amount * 52) / 12;
      else if (item.cadence === 'biweekly') equiv = (item.amount * 26) / 12;
      else if (item.cadence === 'quarterly') equiv = item.amount / 3;
      else if (item.cadence === 'annual') equiv = item.amount / 12;
      monthlyTotal += equiv;
    });
    return {
      monthly: monthlyTotal,
      annual: monthlyTotal * 12
    };
  };

  const totals = calculateTotals();

  // Suggestions Actions
  const handleKeepSuggestion = async (s: SuggestedPattern) => {
    try {
      const newItem: RecurringItem = {
        id: uuidv4(),
        name: s.rawMerchantName,
        category: s.category || 'Utilities',
        amount: s.averageAmount,
        cadence: s.cadence,
        nextDate: s.nextExpectedDate,
        active: true
      };
      const updated = [...confirmedList, newItem];
      await updatePreferences({ recurring: updated });
    } catch (err) {
      alert('Failed to save recurring bill.');
    }
  };

  const handleIgnoreSuggestion = async (merchantKey: string) => {
    try {
      const updatedIgnored = [...dismissedList, merchantKey];
      await updatePreferences({ dismissedPatterns: updatedIgnored });
    } catch (err) {
      alert('Failed to ignore suggestion.');
    }
  };

  // Manual Add/Edit Form Actions
  const handleOpenForm = (item?: RecurringItem) => {
    setError(null);
    if (item) {
      setEditId(item.id);
      setName(item.name);
      setCategory(item.category);
      setAmount(String(item.amount));
      setCadence(item.cadence);
      setNextDate(item.nextDate);
      setAccount(item.account || 'Main Checking');
    } else {
      setEditId(null);
      setName('');
      setCategory('Utilities');
      setAmount('');
      setCadence('monthly');
      setNextDate(new Date().toISOString().split('T')[0]);
      setAccount('Main Checking');
    }
    setIsOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amtNum = parseFloat(amount);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Amount must be positive.');
      return;
    }

    try {
      let updated: RecurringItem[] = [];
      if (editId) {
        // Edit mode
        updated = confirmedList.map(item => {
          if (item.id === editId) {
            return {
              ...item,
              name: name.trim(),
              category,
              amount: amtNum,
              cadence,
              nextDate,
              account
            };
          }
          return item;
        });
      } else {
        // Add mode
        const newItem: RecurringItem = {
          id: uuidv4(),
          name: name.trim(),
          category,
          amount: amtNum,
          cadence,
          nextDate,
          account,
          active: true
        };
        updated = [...confirmedList, newItem];
      }

      await updatePreferences({ recurring: updated });
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save recurring bill details.');
    }
  };

  const handleDeleteConfirmed = async (id: string) => {
    if (confirm('Are you sure you want to delete this recurring bill?')) {
      try {
        const updated = confirmedList.filter(item => item.id !== id);
        await updatePreferences({ recurring: updated });
      } catch (err) {
        alert('Failed to delete recurring bill.');
      }
    }
  };

  const handleToggleActive = async (item: RecurringItem) => {
    try {
      const updated = confirmedList.map(i => {
        if (i.id === item.id) {
          return { ...i, active: !i.active };
        }
        return i;
      });
      await updatePreferences({ recurring: updated });
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Active Detection Status Banner */}
      <div className="bg-gradient-to-r from-[#6558D3] to-[#8b7eff] rounded-2xl p-4.5 text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold block">Recurring Engine Active</span>
            <span className="text-[10px] text-white/80 font-medium block mt-0.5">Scanning transactions for monthly bills, utility spikes, and cadences.</span>
          </div>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="bg-white hover:bg-gray-50 text-[#6558D3] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Bill</span>
        </button>
      </div>

      {/* Commitment Totals Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Estimated Monthly Outflow</span>
            <span className="text-xl font-extrabold text-gray-900 block">{formatCurrency(totals.monthly)}</span>
          </div>
          <Clock className="w-8 h-8 text-blue-500/25" />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Annual Commitment</span>
            <span className="text-xl font-extrabold text-gray-900 block">{formatCurrency(totals.annual)}</span>
          </div>
          <TrendingUp className="w-8 h-8 text-indigo-500/25" />
        </div>
      </div>

      {/* Suggestions Panel */}
      {suggestedBills.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4.5 h-4.5 text-[#6558D3]" />
            <h3 className="text-xs font-bold text-gray-900">Suggested Recurring Bills</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedBills.map((s) => (
              <div key={s.merchant} className="bg-white border border-gray-100 rounded-2xl p-4.5 shadow-xs flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-gray-900">{s.rawMerchantName}</span>
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold capitalize">{s.cadence}</span>
                  </div>
                  
                  <div className="space-y-0.5 text-[10px] text-gray-400 font-semibold">
                    <div>Average Amount: <span className="text-gray-700 font-bold">{formatCurrency(s.averageAmount)}</span></div>
                    <div>Est. Monthly Outflow: <span className="text-gray-700 font-bold">{formatCurrency(s.monthlyEquivalent)}</span></div>
                    <div>Next Expected: <span className="text-gray-700 font-bold">{formatDate(s.nextExpectedDate)}</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleKeepSuggestion(s)}
                    className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-colors cursor-pointer"
                    title="Confirm Bill"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleIgnoreSuggestion(s.merchant)}
                    className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors cursor-pointer"
                    title="Dismiss suggestion"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed list */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold text-gray-900">Active Recurring Bills</h3>
          <p className="text-[10px] text-gray-400 font-semibold">Track mortgage, rents, utility, loans, and auto transfers</p>
        </div>

        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Bill Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Cadence</th>
                <th className="px-4 py-3">Next Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-semibold text-gray-700">
              {confirmedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400 font-bold">
                    No confirmed recurring bills yet. Setup manually or review suggestions.
                  </td>
                </tr>
              ) : (
                confirmedList.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold cursor-pointer uppercase ${
                          item.active 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {item.active ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-extrabold text-gray-900">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-500">{item.cadence}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{formatDate(item.nextDate)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3 text-center flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenForm(item)}
                        className="p-1 hover:bg-gray-50 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                        title="Edit Details"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteConfirmed(item.id)}
                        className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Form Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            
            <div className="flex justify-between items-center bg-gray-50/50 px-6 py-4.5 border-b border-gray-100">
              <h2 className="text-sm font-extrabold text-gray-900">{editId ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-2.5 bg-red-50 text-red-800 border border-red-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Bill Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electric Bill, Rent"
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Cadence</label>
                  <select
                    value={cadence}
                    onChange={(e) => setCadence(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  >
                    <option value="Housing">Housing</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Next Expected Date</label>
                  <input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
