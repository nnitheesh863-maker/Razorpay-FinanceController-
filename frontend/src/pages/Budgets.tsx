import React, { useState } from 'react';
import { useLedgerly } from '../context/LedgerlyContext';
import type { Budget, Transaction } from '../context/LedgerlyContext';
import { formatCurrency } from '../utils/formatters';
import { 
  PieChart as PieIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  AlertCircle,
  Activity
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function BudgetsPage() {
  const { transactions, settings, updatePreferences } = useLedgerly();

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const budgetList = settings?.budgets || [];
  const selectedPeriod = settings?.selectedPeriod || 'all-time';

  // 1. Date Period filtering helper
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
  const expenses = periodTxs.filter(t => t.type === 'expense');

  // Compute spending for each category
  const getCategorySpending = (catName: string) => {
    return expenses
      .filter(t => t.category.toLowerCase() === catName.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Build budget list with real-time actual spending data
  const budgetStats = budgetList.map(b => {
    const spent = getCategorySpending(b.category);
    const remaining = b.limit - spent;
    const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    return {
      ...b,
      spent,
      remaining,
      pct
    };
  });

  // Budget ring calculations
  const totalLimit = budgetList.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgetStats.reduce((sum, b) => sum + b.spent, 0);
  const overallPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  // Form handlers
  const handleOpenForm = (item?: Budget) => {
    setError(null);
    if (item) {
      setEditId(item.id);
      setCategory(item.category);
      setLimit(String(item.limit));
    } else {
      setEditId(null);
      // Default to first unused category if any
      const usedCats = budgetList.map(b => b.category.toLowerCase());
      const available = settings?.categories.find(c => !usedCats.includes(c.toLowerCase()));
      setCategory(available || settings?.categories[0] || 'Housing');
      setLimit('');
    }
    setIsOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const limitNum = parseFloat(limit);

    if (isNaN(limitNum) || limitNum <= 0) {
      setError('Limit must be a positive number.');
      return;
    }

    // Check duplicate category in add mode
    if (!editId) {
      const exists = budgetList.some(b => b.category.toLowerCase() === category.toLowerCase());
      if (exists) {
        setError('A budget limit for this category already exists.');
        return;
      }
    }

    try {
      let updated: Budget[] = [];
      if (editId) {
        updated = budgetList.map(item => {
          if (item.id === editId) {
            return { ...item, category, limit: limitNum };
          }
          return item;
        });
      } else {
        const newItem: Budget = {
          id: uuidv4(),
          category,
          limit: limitNum,
          active: true
        };
        updated = [...budgetList, newItem];
      }

      await updatePreferences({ budgets: updated });
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update budgets.');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      try {
        const updated = budgetList.filter(item => item.id !== id);
        await updatePreferences({ budgets: updated });
      } catch (err) {
        alert('Failed to delete budget.');
      }
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">Budgets Ring & Limits</h2>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Control category expenditure caps in current filtered period</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-primary-500/10"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Budget</span>
        </button>
      </div>

      {budgetList.length === 0 ? (
        // Empty State
        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
            <PieIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-gray-900">No active budgets configured</h4>
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">Create a monthly spending limit for housing, groceries, utilities or shopping to map metrics.</p>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Create your first budget
          </button>
        </div>
      ) : (
        <>
          {/* Budget Health Progress Bar Summary */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-1 md:col-span-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Overall Budget Progress</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-gray-900">{formatCurrency(totalSpent)}</span>
                <span className="text-xs text-gray-400 font-semibold">spent of {formatCurrency(totalLimit)} limit</span>
              </div>
              
              {/* Progress Slider */}
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mt-3">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    overallPct >= 100 ? 'bg-red-500' : overallPct >= 85 ? 'bg-amber-500' : 'bg-[#6558D3]'
                  }`}
                  style={{ width: `${Math.min(overallPct, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-3">
              <Activity className="w-8 h-8 text-[#6558D3]/30 flex-shrink-0" />
              <div className="text-left">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase block">Budget Health</span>
                <span className={`text-xs font-extrabold block mt-0.5 ${overallPct >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                  {overallPct >= 100 ? 'Over-spent Limit' : 'Within Limits'}
                </span>
              </div>
            </div>
          </div>

          {/* Budgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetStats.map(b => {
              const isOver = b.spent > b.limit;
              return (
                <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3.5">
                  
                  {/* Category & Status */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-gray-900">{b.category}</span>
                      {isOver && (
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">Over budget</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenForm(b)}
                        className="p-1 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBudget(b.id)}
                        className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Limits metrics */}
                  <div className="grid grid-cols-3 gap-2 text-left">
                    <div>
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Spent</span>
                      <span className="text-xs font-extrabold text-gray-900 mt-0.5 block">{formatCurrency(b.spent)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Limit</span>
                      <span className="text-xs font-extrabold text-gray-500 mt-0.5 block">{formatCurrency(b.limit)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Remaining</span>
                      <span className={`text-xs font-extrabold mt-0.5 block ${b.remaining < 0 ? 'text-red-600 font-extrabold' : 'text-green-600'}`}>
                        {b.remaining < 0 ? '-' : ''}{formatCurrency(Math.abs(b.remaining))}
                      </span>
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${
                          isOver ? 'bg-red-500' : b.pct >= 80 ? 'bg-amber-500' : 'bg-[#6558D3]'
                        }`}
                        style={{ width: `${Math.min(b.pct, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-gray-400">
                      <span>{b.pct.toFixed(0)}% utilized</span>
                      <span>{formatCurrency(b.limit)} max</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Adjust Budgets Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            
            <div className="flex justify-between items-center bg-gray-50/50 px-6 py-4.5 border-b border-gray-100">
              <h2 className="text-sm font-extrabold text-gray-900">{editId ? 'Adjust Budget Limit' : 'Configure Budget'}</h2>
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

              {/* Category dropdown selection */}
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Target Category</label>
                {editId ? (
                  <input
                    type="text"
                    value={category}
                    disabled
                    className="w-full bg-gray-100 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-500 focus:outline-none"
                  />
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  >
                    {settings?.categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Limit input */}
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Monthly Limit ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                />
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
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
