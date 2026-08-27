import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists for emulating R2
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Starter configurations as lookup definitions
const DEFAULT_CATEGORIES = [
  'Housing', 'Groceries', 'Shopping', 'Dining', 'Transportation', 
  'Utilities', 'Subscriptions', 'Insurance', 'Health', 
  'Entertainment', 'Income', 'Needs review', 'Other'
];

const DEFAULT_ACCOUNTS = ['Main Checking', 'Everyday Visa', 'Rewards Card', 'Cash'];

/**
 * Helper to fetch a setting or set default if missing
 */
const getSetting = async (key: string, defaultValue: string): Promise<string> => {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) {
    const now = new Date().toISOString();
    await prisma.setting.create({
      data: { key, value: defaultValue, updatedAt: now }
    });
    return defaultValue;
  }
  return setting.value;
};

/**
 * Helper to save/update a setting
 */
const setSetting = async (key: string, value: string): Promise<void> => {
  const now = new Date().toISOString();
  await prisma.setting.upsert({
    where: { key },
    update: { value, updatedAt: now },
    create: { key, value, updatedAt: now }
  });
};

/**
 * Normalizes merchant names to enable robust rule/recurring matching
 */
const normalizeMerchant = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // remove punctuation
    .replace(/#\d+/g, '') // remove terminal # plus numbers
    .replace(/\s+/g, ' '); // collapse whitespace
};

/**
 * Generates the unique duplicate transaction fingerprint
 */
const generateFingerprint = (date: string, merchant: string, amount: number, account: string): string => {
  return `${date}|${merchant.trim().toLowerCase()}|${amount.toFixed(2)}|${account.trim().toLowerCase()}`;
};

/**
 * GET /api/state
 * Returns one normalized state payload
 */
export const getState = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch Transactions (up to 5,000, newest first)
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000
    });

    // 2. Fetch Tags
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    });

    // 3. Fetch Rules
    const rules = await prisma.rule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // 4. Fetch Documents (up to 100, newest first)
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // 5. Initialize or fetch settings keys
    const categoriesJson = await getSetting('categories', JSON.stringify(DEFAULT_CATEGORIES));
    const accountsJson = await getSetting('accounts', JSON.stringify(DEFAULT_ACCOUNTS));
    const selectedPeriod = await getSetting('selectedPeriod', 'all-time');
    const netWorthConfigured = await getSetting('netWorthConfigured', 'false');
    const assetsTotal = await getSetting('assetsTotal', '0');
    const liabilitiesTotal = await getSetting('liabilitiesTotal', '0');
    const driveFolderId = await getSetting('driveFolderId', '');
    const driveFolderName = await getSetting('driveFolderName', '');
    const driveFolderUrl = await getSetting('driveFolderUrl', '');
    const driveResetAt = await getSetting('driveResetAt', '');
    const freshStart = await getSetting('freshStart', 'false');
    const driveSyncLogs = await getSetting('driveSyncLogs', JSON.stringify({
      lastSyncedAt: '',
      lastStatus: '',
      importedCount: 0,
      duplicateCount: 0,
      reviewCount: 0,
      errorCount: 0
    }));

    const settings = {
      categories: JSON.parse(categoriesJson),
      accounts: JSON.parse(accountsJson),
      selectedPeriod,
      netWorthConfigured: netWorthConfigured === 'true',
      assetsTotal: parseFloat(assetsTotal),
      liabilitiesTotal: parseFloat(liabilitiesTotal),
      driveFolderId,
      driveFolderName,
      driveFolderUrl,
      driveResetAt,
      freshStart: freshStart === 'true',
      driveSyncLogs: JSON.parse(driveSyncLogs)
    };

    res.status(200).json({
      success: true,
      data: {
        transactions,
        tags: tags.map(t => t.name),
        rules,
        settings,
        documents
      }
    });
  } catch (error: any) {
    console.error('getState error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * POST /api/transactions
 * Accepts one transaction or an array (batch). Performs duplicate check and applies rules.
 */
export const createTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawPayload = req.body;
    const items = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
    
    // Fetch all enabled rules for auto-categorization
    const rules = await prisma.rule.findMany({ where: { enabled: 1 } });
    
    let inserted = 0;
    let duplicate = 0;
    const savedRows = [];

    for (const item of items) {
      const { date, merchant, amount, type, account, tags, receipt, source } = item;

      // 1. Validation
      if (!merchant || !source || !date || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        continue; // skip invalid row
      }
      if (type !== 'expense' && type !== 'income') {
        continue;
      }

      // Format tags
      let tagArray: string[] = [];
      if (Array.isArray(tags)) {
        tagArray = tags
          .map(t => String(t).trim())
          .filter(t => t !== '')
          .filter((v, i, self) => self.findIndex(t => t.toLowerCase() === v.toLowerCase()) === i); // unique case-insensitively
      }

      const activeAccount = account ? String(account).trim() : 'Imported account';
      const fp = generateFingerprint(date, merchant, amount, activeAccount);

      // 2. Duplicate Pre-check
      const existing = await prisma.transaction.findUnique({ where: { fingerprint: fp } });
      if (existing) {
        duplicate++;
        continue;
      }

      // Save tags to Tag master list if new
      for (const t of tagArray) {
        await prisma.tag.upsert({
          where: { name: t },
          update: {},
          create: { name: t, createdAt: new Date().toISOString() }
        });
      }

      // 3. Rule Matching and Application (Only after duplicate check passes)
      let resolvedCategory = item.category || 'Needs review';
      const normMerchant = normalizeMerchant(merchant);

      for (const rule of rules) {
        const normWhen = normalizeMerchant(rule.whenText);
        if (normMerchant.includes(normWhen) && normWhen !== '') {
          // Rule action format: category or tag addition
          if (rule.thenText.startsWith('tag:')) {
            const addedTag = rule.thenText.replace('tag:', '').trim();
            if (addedTag && !tagArray.includes(addedTag)) {
              tagArray.push(addedTag);
            }
          } else {
            resolvedCategory = rule.thenText;
          }
        }
      }

      // 4. Save Transaction
      const created = await prisma.transaction.create({
        data: {
          date,
          merchant: merchant.trim(),
          category: resolvedCategory,
          amount,
          type,
          account: activeAccount,
          tags: JSON.stringify(tagArray),
          receipt: receipt ? 1 : 0,
          source,
          fingerprint: fp,
          createdAt: new Date().toISOString()
        }
      });
      savedRows.push(created);
      inserted++;
    }

    res.status(200).json({
      success: true,
      data: {
        inserted,
        duplicate,
        rows: savedRows
      }
    });
  } catch (error: any) {
    console.error('createTransactions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * PATCH /api/transactions/:id
 * Updates transaction category or tags list
 */
export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { category, tags } = req.body;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    const updateData: any = {};
    if (category !== undefined) {
      updateData.category = String(category);
    }
    if (tags !== undefined && Array.isArray(tags)) {
      const cleanTags = tags
        .map(t => String(t).trim())
        .filter(t => t !== '')
        .filter((v, i, self) => self.findIndex(t => t.toLowerCase() === v.toLowerCase()) === i);

      // Save tags to master list
      for (const t of cleanTags) {
        await prisma.tag.upsert({
          where: { name: t },
          update: {},
          create: { name: t, createdAt: new Date().toISOString() }
        });
      }
      updateData.tags = JSON.stringify(cleanTags);
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('updateTransaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * DELETE /api/transactions/:id
 * Deletes a transaction by ID
 */
export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    await prisma.transaction.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    console.error('deleteTransaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * PUT /api/preferences
 * Saves settings, categories, accounts, tags, rules, budgets, goals, etc.
 */
export const updatePreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      categories, 
      accounts, 
      selectedPeriod, 
      assetsTotal, 
      liabilitiesTotal, 
      netWorthConfigured,
      driveFolderId,
      driveFolderName,
      driveFolderUrl,
      goals,
      budgets,
      subscriptions,
      recurring,
      rules,
      dismissedPatterns,
      driveResetAt,
      freshStart
    } = req.body;

    if (categories && Array.isArray(categories)) {
      await setSetting('categories', JSON.stringify(categories.map(c => String(c).trim())));
    }
    if (accounts && Array.isArray(accounts)) {
      await setSetting('accounts', JSON.stringify(accounts.map(a => String(a).trim())));
    }
    if (selectedPeriod !== undefined) {
      await setSetting('selectedPeriod', String(selectedPeriod));
    }
    if (assetsTotal !== undefined) {
      await setSetting('assetsTotal', String(parseFloat(assetsTotal) || 0));
    }
    if (liabilitiesTotal !== undefined) {
      await setSetting('liabilitiesTotal', String(parseFloat(liabilitiesTotal) || 0));
    }
    if (netWorthConfigured !== undefined) {
      await setSetting('netWorthConfigured', netWorthConfigured ? 'true' : 'false');
    }
    if (driveFolderId !== undefined) {
      await setSetting('driveFolderId', String(driveFolderId));
    }
    if (driveFolderName !== undefined) {
      await setSetting('driveFolderName', String(driveFolderName));
    }
    if (driveFolderUrl !== undefined) {
      await setSetting('driveFolderUrl', String(driveFolderUrl));
    }
    if (goals !== undefined) {
      await setSetting('goals', JSON.stringify(goals));
    }
    if (budgets !== undefined) {
      await setSetting('budgets', JSON.stringify(budgets));
    }
    if (subscriptions !== undefined) {
      await setSetting('subscriptions', JSON.stringify(subscriptions));
    }
    if (recurring !== undefined) {
      await setSetting('recurring', JSON.stringify(recurring));
    }
    if (dismissedPatterns !== undefined) {
      await setSetting('dismissedPatterns', JSON.stringify(dismissedPatterns));
    }
    if (driveResetAt !== undefined) {
      await setSetting('driveResetAt', String(driveResetAt));
    }
    if (freshStart !== undefined) {
      await setSetting('freshStart', freshStart ? 'true' : 'false');
    }

    // Rules can also be updated in preference batch
    if (rules && Array.isArray(rules)) {
      // Clear rules and insert
      await prisma.rule.deleteMany({});
      for (const r of rules) {
        await prisma.rule.create({
          data: {
            whenText: r.whenText,
            thenText: r.thenText,
            enabled: r.enabled ? 1 : 0,
            createdAt: r.createdAt || new Date().toISOString()
          }
        });
      }
    }

    res.status(200).json({ success: true, message: 'Preferences updated successfully' });
  } catch (error: any) {
    console.error('updatePreferences error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * POST /api/documents
 * Multipart upload. Stores file bytes locally (R2 emulator) and saves D1 metadata.
 */
export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded or file exceeds 20 MB size limit' });
      return;
    }

    const file = req.file;
    const fileId = uuidv4();
    const objectKey = `uploads/${fileId}-${file.originalname}`;

    // Move file to R2 emulated directory matching exact key layout
    const finalPath = path.join(UPLOADS_DIR, `${fileId}-${file.originalname}`);
    fs.renameSync(file.path, finalPath);

    // Save document details
    const doc = await prisma.document.create({
      data: {
        id: fileId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        objectKey,
        status: 'stored', // successfully stored
        source: 'upload',
        createdAt: new Date().toISOString()
      }
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error: any) {
    console.error('uploadDocument error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * DELETE /api/state
 * Wipes D1 and R2 emulated folder entirely. Requires explicit confirmation payload.
 */
export const wipeState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'DELETE ALL LEDGERLY DATA') {
      res.status(400).json({ success: false, message: 'Missing or incorrect confirmation string' });
      return;
    }

    // 1. Delete D1 database rows
    await prisma.transaction.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.rule.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.setting.deleteMany({});

    // 2. Wipe emulated R2 files from disk
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      }
    }

    // 3. Re-initialize baseline settings
    const now = new Date().toISOString();
    await setSetting('categories', JSON.stringify(DEFAULT_CATEGORIES));
    await setSetting('accounts', JSON.stringify(DEFAULT_ACCOUNTS));
    await setSetting('selectedPeriod', 'all-time');
    await setSetting('netWorthConfigured', 'false');
    await setSetting('assetsTotal', '0');
    await setSetting('liabilitiesTotal', '0');
    await setSetting('freshStart', 'true');
    await setSetting('driveResetAt', now);
    await setSetting('driveSyncLogs', JSON.stringify({
      lastSyncedAt: now,
      lastStatus: 'wiped',
      importedCount: 0,
      duplicateCount: 0,
      reviewCount: 0,
      errorCount: 0
    }));

    res.status(200).json({
      success: true,
      message: 'All Ledgerly data has been successfully wiped and configurations reset.'
    });
  } catch (error: any) {
    console.error('wipeState error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/drive-sync
 * Returns folder, sync, timezone, and processed file metadata
 */
export const getDriveSyncInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const folderId = await getSetting('driveFolderId', '');
    const folderName = await getSetting('driveFolderName', 'Ledgerly Financial Inbox');
    const folderUrl = await getSetting('driveFolderUrl', '');
    const resetAt = await getSetting('driveResetAt', '');
    const syncLogsJson = await getSetting('driveSyncLogs', '{}');
    const processedIdsJson = await getSetting('processedFileIds', '[]');

    const logs = JSON.parse(syncLogsJson);
    const processedFileIds = JSON.parse(processedIdsJson);

    res.status(200).json({
      success: true,
      data: {
        folderId,
        folderName,
        folderUrl,
        resetAt,
        timezone: 'Asia/Kolkata', // local timezone
        scheduleTime: '08:00',
        cadence: 'daily',
        lastSyncedAt: logs.lastSyncedAt || '',
        lastStatus: logs.lastStatus || 'never',
        importedCount: logs.importedCount || 0,
        duplicateCount: logs.duplicateCount || 0,
        reviewCount: logs.reviewCount || 0,
        errorCount: logs.errorCount || 0,
        processedFileIds: processedFileIds.slice(-5000) // cap to 5,000
      }
    });
  } catch (error: any) {
    console.error('getDriveSyncInfo error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * POST /api/drive-sync
 * Webhook that imports Google Drive transaction rows and decodes/stores file bytes.
 */
export const syncDriveInbox = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactions, files } = req.body;
    
    let importedCount = 0;
    let duplicateCount = 0;
    let reviewCount = 0;
    let errorCount = 0;
    
    const processedIdsJson = await getSetting('processedFileIds', '[]');
    const processedFileIds: string[] = JSON.parse(processedIdsJson);
    const driveResetAt = await getSetting('driveResetAt', '');
    const rules = await prisma.rule.findMany({ where: { enabled: 1 } });

    // 1. Process files
    if (files && Array.isArray(files)) {
      for (const file of files) {
        const { id: fileId, filename, mimeType, modifiedTime, base64Content, status } = file;

        // Skip processed files or ones before reset date
        if (processedFileIds.includes(fileId)) continue;
        if (driveResetAt && modifiedTime && new Date(modifiedTime).getTime() <= new Date(driveResetAt).getTime()) {
          continue;
        }

        try {
          if (base64Content) {
            const buffer = Buffer.from(base64Content, 'base64');
            // Max file size 20 MB validation
            if (buffer.length > 20 * 1024 * 1024) {
              errorCount++;
              continue;
            }
            
            // Write to emulated R2 bucket uploads folder
            const finalPath = path.join(UPLOADS_DIR, `${fileId}-${filename}`);
            fs.writeFileSync(finalPath, buffer);
          }

          const objectKey = `drive-inbox/${fileId}-${filename}`;
          
          // Upsert Document table row
          await prisma.document.upsert({
            where: { objectKey },
            update: { status: status || 'stored' },
            create: {
              id: fileId,
              filename,
              mimeType,
              size: base64Content ? Buffer.from(base64Content, 'base64').length : 0,
              objectKey,
              status: status || 'stored',
              source: 'google-drive',
              createdAt: new Date().toISOString()
            }
          });

          if (status === 'review') reviewCount++;
          processedFileIds.push(fileId);
        } catch (err) {
          console.error(`Failed to sync Drive file ID ${fileId}:`, err);
          errorCount++;
        }
      }
    }

    // 2. Process transactions
    if (transactions && Array.isArray(transactions)) {
      for (const txn of transactions) {
        const { date, merchant, amount, type, account, category, tags, receipt } = txn;

        if (!merchant || !date || typeof amount !== 'number' || amount <= 0) {
          errorCount++;
          continue;
        }

        const activeAccount = account ? String(account).trim() : 'Drive import';
        const fp = generateFingerprint(date, merchant, amount, activeAccount);

        const existing = await prisma.transaction.findUnique({ where: { fingerprint: fp } });
        if (existing) {
          duplicateCount++;
          continue;
        }

        // Tag normalization and addition
        let tagArray: string[] = ['Drive import'];
        if (Array.isArray(tags)) {
          tagArray = tagArray.concat(tags.map(t => String(t).trim()).filter(t => t !== ''));
        }
        tagArray = tagArray.filter((v, i, self) => self.findIndex(t => t.toLowerCase() === v.toLowerCase()) === i);

        // Apply tags to master list
        for (const t of tagArray) {
          await prisma.tag.upsert({
            where: { name: t },
            update: {},
            create: { name: t, createdAt: new Date().toISOString() }
          });
        }

        // Apply rules
        let resolvedCategory = category || 'Needs review';
        const normMerchant = normalizeMerchant(merchant);

        for (const rule of rules) {
          const normWhen = normalizeMerchant(rule.whenText);
          if (normMerchant.includes(normWhen) && normWhen !== '') {
            if (rule.thenText.startsWith('tag:')) {
              const addedTag = rule.thenText.replace('tag:', '').trim();
              if (addedTag && !tagArray.includes(addedTag)) {
                tagArray.push(addedTag);
              }
            } else {
              resolvedCategory = rule.thenText;
            }
          }
        }

        // Insert Transaction
        await prisma.transaction.create({
          data: {
            date,
            merchant: merchant.trim(),
            category: resolvedCategory,
            amount,
            type,
            account: activeAccount,
            tags: JSON.stringify(tagArray),
            receipt: receipt ? 1 : 0,
            source: 'google-drive',
            fingerprint: fp,
            createdAt: new Date().toISOString()
          }
        });
        importedCount++;
      }
    }

    // Save updated synced file list and logs
    const now = new Date().toISOString();
    await setSetting('processedFileIds', JSON.stringify(processedFileIds.slice(-5000)));
    await setSetting('driveSyncLogs', JSON.stringify({
      lastSyncedAt: now,
      lastStatus: errorCount > 0 ? 'partial' : 'complete',
      importedCount,
      duplicateCount,
      reviewCount,
      errorCount
    }));

    res.status(200).json({
      success: true,
      data: {
        status: errorCount > 0 ? 'partial' : 'complete',
        lastSyncedAt: now,
        importedCount,
        duplicateCount,
        reviewCount,
        errorCount
      }
    });
  } catch (error: any) {
    console.error('syncDriveInbox error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};
