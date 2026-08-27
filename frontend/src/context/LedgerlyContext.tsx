import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/axios';

// TypeScript Interfaces matching database models
export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
  account: string;
  tags: string; // JSON array string
  receipt: number; // 0 = false, 1 = true
  source: string;
  fingerprint: string;
  createdAt: string;
}

export interface Rule {
  id: string;
  whenText: string;
  thenText: string;
  enabled: number; // 0 = disabled, 1 = enabled
  createdAt: string;
}

export interface Document {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  objectKey: string;
  status: string;
  source: string;
  createdAt: string;
}

export interface SyncLogs {
  lastSyncedAt: string;
  lastStatus: string;
  importedCount: number;
  duplicateCount: number;
  reviewCount: number;
  errorCount: number;
}

export interface LedgerlySettings {
  categories: string[];
  accounts: string[];
  selectedPeriod: string;
  netWorthConfigured: boolean;
  assetsTotal: number;
  liabilitiesTotal: number;
  driveFolderId: string;
  driveFolderName: string;
  driveFolderUrl: string;
  driveResetAt: string;
  freshStart: boolean;
  driveSyncLogs: SyncLogs;
  goals: Goal[];
  budgets: Budget[];
  subscriptions: Subscription[];
  recurring: RecurringItem[];
  dismissedPatterns: string[]; // ignored recurring merchant keys
  rules?: Rule[];
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentSavedAmount: number;
  dueDate?: string;
  note?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  active: boolean;
}

export interface Subscription {
  id: string;
  serviceName: string;
  groupCategory: string;
  amount: number;
  cadence: string;
  nextRenewalDate: string;
  account?: string;
  active: boolean;
}

export interface RecurringItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  cadence: string;
  nextDate: string;
  account?: string;
  active: boolean;
}

interface LedgerlyContextType {
  transactions: Transaction[];
  tags: string[];
  rules: Rule[];
  settings: LedgerlySettings | null;
  documents: Document[];
  loading: boolean;
  error: string | null;
  refetchState: () => Promise<void>;
  addTransactions: (payload: Partial<Transaction> | Partial<Transaction>[]) => Promise<{ inserted: number; duplicate: number }>;
  updateTransactionInline: (id: string, category?: string, tags?: string[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updatePreferences: (pref: Partial<LedgerlySettings>) => Promise<void>;
  uploadDocumentFile: (file: File) => Promise<Document>;
  wipeData: (confirmation: string) => Promise<void>;
  syncGoogleDrive: () => Promise<any>;
}

const LedgerlyContext = createContext<LedgerlyContextType | undefined>(undefined);

export const LedgerlyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [settings, setSettings] = useState<LedgerlySettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/state');
      if (response.data.success) {
        const { transactions, tags, rules, settings, documents } = response.data.data;
        setTransactions(transactions);
        setTags(tags);
        setRules(rules);
        setDocuments(documents);
        
        // Parse preferences arrays if not present
        const parsedSettings: LedgerlySettings = {
          ...settings,
          goals: settings.goals ? (typeof settings.goals === 'string' ? JSON.parse(settings.goals) : settings.goals) : [],
          budgets: settings.budgets ? (typeof settings.budgets === 'string' ? JSON.parse(settings.budgets) : settings.budgets) : [],
          subscriptions: settings.subscriptions ? (typeof settings.subscriptions === 'string' ? JSON.parse(settings.subscriptions) : settings.subscriptions) : [],
          recurring: settings.recurring ? (typeof settings.recurring === 'string' ? JSON.parse(settings.recurring) : settings.recurring) : [],
          dismissedPatterns: settings.dismissedPatterns ? (typeof settings.dismissedPatterns === 'string' ? JSON.parse(settings.dismissedPatterns) : settings.dismissedPatterns) : []
        };
        setSettings(parsedSettings);
      }
    } catch (err: any) {
      console.error('Failed to load Ledgerly state:', err);
      setError(err.message || 'Unable to retrieve financial metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const addTransactions = async (payload: Partial<Transaction> | Partial<Transaction>[]) => {
    try {
      const response = await apiClient.post('/transactions', payload);
      await fetchState();
      return response.data.data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to insert entries.');
    }
  };

  const updateTransactionInline = async (id: string, category?: string, tags?: string[]) => {
    try {
      await apiClient.patch(`/transactions/${id}`, { category, tags });
      // Update local state without full refetch for high speed performance
      setTransactions(prev => prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            category: category !== undefined ? category : t.category,
            tags: tags !== undefined ? JSON.stringify(tags) : t.tags
          };
        }
        return t;
      }));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to edit transaction.');
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await apiClient.delete(`/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete transaction.');
    }
  };

  const updatePreferences = async (pref: Partial<LedgerlySettings>) => {
    try {
      await apiClient.put('/preferences', pref);
      setSettings(prev => prev ? { ...prev, ...pref } : null);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update preferences.');
    }
  };

  const uploadDocumentFile = async (file: File): Promise<Document> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      await fetchState();
      return response.data.data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to upload document.');
    }
  };

  const wipeData = async (confirmation: string) => {
    try {
      await apiClient.delete('/state', { data: { confirmation } });
      await fetchState();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to wipe data.');
    }
  };

  const syncGoogleDrive = async () => {
    try {
      const response = await apiClient.post('/drive-sync', {});
      await fetchState();
      return response.data.data;
    } catch (err: any) {
      throw new Error(err.message || 'Drive sync failed.');
    }
  };

  return (
    <LedgerlyContext.Provider
      value={{
        transactions,
        tags,
        rules,
        settings,
        documents,
        loading,
        error,
        refetchState: fetchState,
        addTransactions,
        updateTransactionInline,
        deleteTransaction,
        updatePreferences,
        uploadDocumentFile,
        wipeData,
        syncGoogleDrive
      }}
    >
      {children}
    </LedgerlyContext.Provider>
  );
};

export const useLedgerly = () => {
  const context = useContext(LedgerlyContext);
  if (!context) {
    throw new Error('useLedgerly must be used within a LedgerlyProvider');
  }
  return context;
};
