import React, { useState } from 'react';
import { useLedgerly } from '../context/LedgerlyContext';
import type { Goal } from '../context/LedgerlyContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Target, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  AlertCircle,
  Calendar
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function GoalsPage() {
  const { settings, updatePreferences } = useLedgerly();

  // Dialog states
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentSavedAmount, setCurrentSavedAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goalList = settings?.goals || [];

  const handleOpenForm = (item?: Goal) => {
    setError(null);
    if (item) {
      setEditId(item.id);
      setName(item.name);
      setTargetAmount(String(item.targetAmount));
      setCurrentSavedAmount(String(item.currentSavedAmount));
      setDueDate(item.dueDate || '');
      setNote(item.note || '');
    } else {
      setEditId(null);
      setName('');
      setTargetAmount('');
      setCurrentSavedAmount('');
      setDueDate('');
      setNote('');
    }
    setIsOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentSavedAmount || '0');

    if (!name.trim()) {
      setError('Goal name is required.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setError('Target amount must be a positive number.');
      return;
    }
    if (isNaN(current) || current < 0) {
      setError('Current saved amount must be a non-negative number.');
      return;
    }

    try {
      let updated: Goal[] = [];
      if (editId) {
        updated = goalList.map(item => {
          if (item.id === editId) {
            return {
              ...item,
              name: name.trim(),
              targetAmount: target,
              currentSavedAmount: current,
              dueDate: dueDate || undefined,
              note: note.trim() || undefined
            };
          }
          return item;
        });
      } else {
        const newItem: Goal = {
          id: uuidv4(),
          name: name.trim(),
          targetAmount: target,
          currentSavedAmount: current,
          dueDate: dueDate || undefined,
          note: note.trim() || undefined
        };
        updated = [...goalList, newItem];
      }

      await updatePreferences({ goals: updated });
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update goals.');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      try {
        const updated = goalList.filter(item => item.id !== id);
        await updatePreferences({ goals: updated });
      } catch (err) {
        alert('Failed to delete goal.');
      }
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">Savings & Targets Goals</h2>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Define target values for vehicle purchases, emergency funds or holidays</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-primary-500/10"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Goal</span>
        </button>
      </div>

      {goalList.length === 0 ? (
        // Empty State
        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-gray-900">No active goals configured</h4>
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">Save for an emergency fund, a new car, or home downpayment to track progress here.</p>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Create your first goal
          </button>
        </div>
      ) : (
        // Goals Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goalList.map(g => {
            const remaining = g.targetAmount - g.currentSavedAmount;
            const pct = g.targetAmount > 0 ? (g.currentSavedAmount / g.targetAmount) * 100 : 0;
            const isCompleted = remaining <= 0;
            
            return (
              <div key={g.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[180px] space-y-4">
                
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1 text-left">
                    <span className="text-xs font-extrabold text-gray-900 block">{g.name}</span>
                    {g.dueDate && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                        <Calendar className="w-3 h-3 text-[#6558D3]" />
                        <span>Due {formatDate(g.dueDate)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenForm(g)}
                      className="p-1 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress calculations */}
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div>
                    <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Saved</span>
                    <span className="text-xs font-extrabold text-[#6558D3] mt-0.5 block">{formatCurrency(g.currentSavedAmount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Target</span>
                    <span className="text-xs font-extrabold text-gray-900 mt-0.5 block">{formatCurrency(g.targetAmount)}</span>
                  </div>
                </div>

                {/* Slider / Bar progress */}
                <div className="space-y-1.5">
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        isCompleted ? 'bg-green-500' : 'bg-[#6558D3]'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-gray-400">
                    <span>{pct.toFixed(0)}% saved</span>
                    {isCompleted ? (
                      <span className="text-green-600 font-extrabold">Completed!</span>
                    ) : (
                      <span>{formatCurrency(remaining)} left</span>
                    )}
                  </div>
                </div>

                {/* Note */}
                {g.note && (
                  <div className="text-[10px] text-gray-400 font-semibold bg-gray-50/50 p-2 rounded-xl text-left truncate">
                    {g.note}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Goal Form Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            
            <div className="flex justify-between items-center bg-gray-50/50 px-6 py-4.5 border-b border-gray-100">
              <h2 className="text-sm font-extrabold text-gray-900">{editId ? 'Edit Savings Goal' : 'Configure Savings Goal'}</h2>
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
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Goal Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emergency Fund, Eurotrip"
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Target Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Current Saved ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentSavedAmount}
                    onChange={(e) => setCurrentSavedAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Target Due Date (Optional)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Short Description (Optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Set aside 3-6 months expenses"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6558D3]/20 max-h-[80px]"
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
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
