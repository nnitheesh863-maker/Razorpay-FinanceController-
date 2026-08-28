import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';

// Default LedgerlySettings structure
const DEFAULT_SETTINGS = {
  categories: [
    'Housing',
    'Groceries',
    'Shopping',
    'Dining',
    'Transportation',
    'Utilities',
    'Subscriptions',
    'Insurance',
    'Health',
    'Entertainment',
    'Income',
    'Needs review',
    'Other'
  ],
  accounts: ['Main Checking', 'Credit Card', 'Savings Account', 'Investment Wallet'],
  selectedPeriod: 'this-month',
  netWorthConfigured: true,
  assetsTotal: 54200.00,
  liabilitiesTotal: 12850.00,
  driveFolderId: '',
  driveFolderName: 'Ledgerly Financial Inbox',
  driveFolderUrl: '',
  driveResetAt: '',
  freshStart: false,
  driveSyncLogs: {
    lastSyncedAt: 'Never',
    lastStatus: 'Not Synced',
    importedCount: 0,
    duplicateCount: 0,
    reviewCount: 0,
    errorCount: 0
  },
  goals: [
    {
      id: '1',
      name: 'Emergency Fund',
      targetAmount: 10000,
      currentSavedAmount: 5500,
      dueDate: '2026-12-31',
      note: '6 months of living expenses'
    },
    {
      id: '2',
      name: 'New Laptop',
      targetAmount: 2500,
      currentSavedAmount: 1800,
      dueDate: '2026-10-15',
      note: 'MacBook Pro 14 inch'
    }
  ],
  budgets: [
    {
      id: '1',
      category: 'Groceries',
      limit: 500,
      active: true
    },
    {
      id: '2',
      category: 'Dining',
      limit: 300,
      active: true
    },
    {
      id: '3',
      category: 'Entertainment',
      limit: 150,
      active: true
    }
  ],
  subscriptions: [
    {
      id: '1',
      serviceName: 'Netflix',
      groupCategory: 'Subscriptions',
      amount: 15.49,
      cadence: 'monthly',
      nextRenewalDate: '2026-09-12',
      account: 'Credit Card',
      active: true
    },
    {
      id: '2',
      serviceName: 'Spotify Premium',
      groupCategory: 'Subscriptions',
      amount: 10.99,
      cadence: 'monthly',
      nextRenewalDate: '2026-09-05',
      account: 'Credit Card',
      active: true
    },
    {
      id: '3',
      serviceName: 'GitHub Copilot',
      groupCategory: 'Subscriptions',
      amount: 10.00,
      cadence: 'monthly',
      nextRenewalDate: '2026-09-21',
      account: 'Main Checking',
      active: true
    }
  ],
  recurring: [
    {
      id: '1',
      name: 'Monthly Rent',
      category: 'Housing',
      amount: 1500.00,
      cadence: 'monthly',
      nextDate: '2026-09-01',
      account: 'Main Checking',
      active: true
    },
    {
      id: '2',
      name: 'Electric Bill',
      category: 'Utilities',
      amount: 85.00,
      cadence: 'monthly',
      nextDate: '2026-09-15',
      account: 'Main Checking',
      active: true
    }
  ],
  dismissedPatterns: [] as string[],
  rules: [] as any[]
};

export const getState = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch settings (preferences)
    const prefSetting = await prisma.setting.findUnique({
      where: { key: 'preferences' }
    });
    const settings = prefSetting ? JSON.parse(prefSetting.value) : DEFAULT_SETTINGS;

    // 2. Fetch rules (either from settings or empty)
    const rules = settings.rules || [];

    // 3. Fetch transaction metadata
    const metadataSetting = await prisma.setting.findUnique({
      where: { key: 'transaction_metadata' }
    });
    const metadata = metadataSetting ? JSON.parse(metadataSetting.value) : {};

    // 4. Fetch transactions and map them to frontend format
    const dbTransactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const mappedTransactions = dbTransactions.map(tx => {
      const txMeta = metadata[tx.id] || {};
      const isIncome = tx.type === 'REFUND' || tx.type === 'INCOME';
      return {
        id: tx.id,
        date: txMeta.date || (tx.createdAt ? new Date(tx.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        merchant: txMeta.merchant || tx.description || 'Unknown Merchant',
        category: txMeta.category || (tx.type === 'FEE' ? 'Other' : (isIncome ? 'Income' : 'Needs review')),
        amount: tx.amount,
        type: isIncome ? 'income' : 'expense',
        account: txMeta.account || tx.paymentMethod || 'Main Checking',
        tags: JSON.stringify(txMeta.tags || []),
        receipt: txMeta.receipt || 0,
        source: tx.reference ? 'imported' : 'manual',
        fingerprint: tx.reference || tx.id,
        createdAt: tx.createdAt ? tx.createdAt.toISOString() : new Date().toISOString()
      };
    });

    // 5. Gather unique tags
    const allTagsSet = new Set<string>();
    // Add default tags
    ['business', 'personal', 'travel', 'tax-deductible', 'reimbursable'].forEach(t => allTagsSet.add(t));
    // Add tags from metadata
    Object.values(metadata).forEach((meta: any) => {
      if (meta.tags && Array.isArray(meta.tags)) {
        meta.tags.forEach((tag: string) => allTagsSet.add(tag.toLowerCase()));
      }
    });
    const tags = Array.from(allTagsSet);

    // 6. Fetch documents
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: {
        transactions: mappedTransactions,
        tags,
        rules,
        settings,
        documents
      }
    });
  } catch (error: any) {
    console.error('Failed to retrieve state:', error);
    res.status(500).json({ success: false, message: 'Internal server error while retrieving application state.' });
  }
};

export const updatePreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = req.body;

    const prefSetting = await prisma.setting.findUnique({
      where: { key: 'preferences' }
    });
    const currentSettings = prefSetting ? JSON.parse(prefSetting.value) : DEFAULT_SETTINGS;

    const newSettings = {
      ...currentSettings,
      ...updates
    };

    // If rules are directly updated in preferences, ensure rules key is aligned
    if (updates.rules !== undefined) {
      newSettings.rules = updates.rules;
    }

    await prisma.setting.upsert({
      where: { key: 'preferences' },
      update: { value: JSON.stringify(newSettings) },
      create: { key: 'preferences', value: JSON.stringify(newSettings) }
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'PREFERENCES_UPDATE',
      { updatedKeys: Object.keys(updates) }
    );

    res.status(200).json({
      success: true,
      data: newSettings
    });
  } catch (error: any) {
    console.error('Failed to update preferences:', error);
    res.status(500).json({ success: false, message: 'Internal server error while updating preferences.' });
  }
};

export const wipeState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { confirmation } = req.body;

    if (confirmation !== 'WIPE') {
      res.status(400).json({ success: false, message: 'Invalid confirmation token.' });
      return;
    }

    // Delete custom settings/metadata
    await prisma.setting.deleteMany({
      where: {
        key: { in: ['preferences', 'transaction_metadata'] }
      }
    });

    // Delete all operational data except Users
    await prisma.exceptionNote.deleteMany({});
    await prisma.exception.deleteMany({});
    await prisma.reconciliationRecord.deleteMany({});
    await prisma.reconciliationRun.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoiceLineItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.document.deleteMany({});

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'STATE_WIPE',
      { status: 'complete' }
    );

    res.status(200).json({
      success: true,
      message: 'All application state and financial data has been wiped.'
    });
  } catch (error: any) {
    console.error('Failed to wipe state:', error);
    res.status(500).json({ success: false, message: 'Internal server error during data wipe.' });
  }
};

export const syncGoogleDrive = async (req: Request, res: Response): Promise<void> => {
  try {
    const prefSetting = await prisma.setting.findUnique({
      where: { key: 'preferences' }
    });
    const currentSettings = prefSetting ? JSON.parse(prefSetting.value) : DEFAULT_SETTINGS;

    // Simulate Google Drive synchronization
    const nowStr = new Date().toLocaleString();
    const updatedSettings = {
      ...currentSettings,
      driveFolderName: currentSettings.driveFolderName || 'Ledgerly Financial Inbox',
      driveSyncLogs: {
        lastSyncedAt: nowStr,
        lastStatus: 'Success',
        importedCount: 3,
        duplicateCount: 1,
        reviewCount: 0,
        errorCount: 0
      }
    };

    await prisma.setting.upsert({
      where: { key: 'preferences' },
      update: { value: JSON.stringify(updatedSettings) },
      create: { key: 'preferences', value: JSON.stringify(updatedSettings) }
    });

    // Simulate importing three new manual transaction entries from Google Drive
    const mockImports = [
      {
        amount: 45.99,
        type: 'PAYMENT',
        description: 'Google Cloud Platform',
        paymentMethod: 'Credit Card',
        reference: `gdrive_sync_${Date.now()}_1`
      },
      {
        amount: 120.00,
        type: 'PAYMENT',
        description: 'Amazon Web Services',
        paymentMethod: 'Credit Card',
        reference: `gdrive_sync_${Date.now()}_2`
      },
      {
        amount: 850.00,
        type: 'INCOME',
        description: 'Client Consulting Retainer',
        paymentMethod: 'Main Checking',
        reference: `gdrive_sync_${Date.now()}_3`
      }
    ];

    for (const mockItem of mockImports) {
      // Check if reference exists
      const existing = await prisma.transaction.findUnique({
        where: { reference: mockItem.reference }
      });
      if (!existing) {
        const transaction = await prisma.transaction.create({
          data: {
            amount: mockItem.amount,
            type: mockItem.type,
            description: mockItem.description,
            paymentMethod: mockItem.paymentMethod,
            reference: mockItem.reference,
            status: 'SUCCESS',
            createdBy: (req.user as any)?.id
          }
        });

        // Set metadata
        const metadataSetting = await prisma.setting.findUnique({ where: { key: 'transaction_metadata' } });
        const metadata = metadataSetting ? JSON.parse(metadataSetting.value) : {};
        metadata[transaction.id] = {
          category: mockItem.type === 'INCOME' ? 'Income' : 'Utilities',
          tags: ['gdrive-sync'],
          receipt: 0,
          merchant: mockItem.description,
          account: mockItem.paymentMethod
        };
        await prisma.setting.upsert({
          where: { key: 'transaction_metadata' },
          update: { value: JSON.stringify(metadata) },
          create: { key: 'transaction_metadata', value: JSON.stringify(metadata) }
        });
      }
    }

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'DRIVE_SYNC_EXECUTE',
      { status: 'success', imported: 3 }
    );

    res.status(200).json({
      success: true,
      data: {
        status: 'success',
        importedCount: 3
      }
    });
  } catch (error: any) {
    console.error('Failed to sync Google Drive:', error);
    res.status(500).json({ success: false, message: 'Internal server error during Google Drive synchronization.' });
  }
};
