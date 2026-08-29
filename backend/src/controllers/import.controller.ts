import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import xlsx from 'xlsx';
import { emitToUser } from '../services/socket.service';
import { logAudit } from '../lib/audit';

const parseDateValue = (value: any): Date => {
  if (value === null || value === undefined) {
    return new Date(NaN);
  }
  const num = Number(value);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const msInDay = 24 * 60 * 60 * 1000;
    return new Date(Math.round((num - 25569) * msInDay));
  }
  return new Date(value);
};

// 1. Upload File & Create Raw Records
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const category = req.body.category || 'Bank Transactions';

    if (!file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    if (file.size === 0) {
      res.status(400).json({ error: 'Uploaded file is empty.' });
      return;
    }

    const buffer = file.buffer;
    let parsedData: any[] = [];
    let fileType = '';

    // Magic number signature checks
    // ZIP/XLSX: starts with PK\x03\x04 [0x50, 0x4B, 0x03, 0x04]
    if (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
      fileType = 'XLSX';
      try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        parsedData = xlsx.utils.sheet_to_json(sheet, { defval: "" });
      } catch (err: any) {
        res.status(400).json({ error: `Invalid XLSX file format: ${err.message}` });
        return;
      }
    } else {
      // Decode content text
      const content = buffer.toString('utf-8').trim();
      
      // JSON starts with { or [
      if (content.startsWith('{') || content.startsWith('[')) {
        fileType = 'JSON';
        try {
          const parsed = JSON.parse(content);
          parsedData = Array.isArray(parsed) ? parsed : [parsed];
        } catch (err: any) {
          res.status(400).json({ error: 'Invalid JSON file format.' });
          return;
        }
      } else {
        // Fallback: try parsing as CSV via sheetjs
        fileType = 'CSV';
        try {
          const workbook = xlsx.read(buffer, { type: 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          parsedData = xlsx.utils.sheet_to_json(sheet, { defval: "" });
        } catch (err: any) {
          res.status(400).json({ error: 'Invalid CSV file format.' });
          return;
        }
      }
    }

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      res.status(400).json({ error: 'Uploaded file contains no rows or invalid format.' });
      return;
    }

    // Get or create DataSource for authenticated user
    const userId = req.user?.id || 'anonymous';
    let dataSource = await prisma.dataSource.findFirst({
      where: { userId, name: category }
    });

    if (!dataSource) {
      dataSource = await prisma.dataSource.create({
        data: {
          userId,
          name: category,
          type: category,
          status: 'ACTIVE'
        }
      });
    }

    // Count valid vs invalid
    let validRecordsCount = 0;
    let invalidRecordsCount = 0;

    const rawRecordsData = parsedData.map((row, idx) => {
      const isValid = row && typeof row === 'object' && Object.keys(row).length > 0;
      if (isValid) validRecordsCount++;
      else invalidRecordsCount++;

      return {
        rowNumber: idx + 1,
        rawData: row as any,
        status: isValid ? 'VALID' : 'INVALID',
        errorMessage: isValid ? null : 'Row is empty or invalid'
      };
    });

    // Create ImportBatch
    const batch = await prisma.importBatch.create({
      data: {
        dataSourceId: dataSource.id,
        fileName: file.originalname,
        fileType,
        totalRecords: parsedData.length,
        validRecords: validRecordsCount,
        invalidRecords: invalidRecordsCount,
        status: invalidRecordsCount === 0 ? 'SUCCESS' : (validRecordsCount > 0 ? 'PARTIAL' : 'FAILED'),
        records: {
          create: rawRecordsData
        }
      },
      include: {
        dataSource: true
      }
    });

    emitToUser(userId, 'record.imported', {
      fileName: batch.fileName,
      totalRecords: batch.totalRecords,
      status: batch.status
    });

    await logAudit(
      userId,
      req.user?.email || undefined,
      'DATA_IMPORT',
      `Imported raw file: ${batch.fileName} with ${batch.totalRecords} records.`,
      undefined,
      'ImportBatch',
      batch.id
    );

    res.status(201).json({
      success: true,
      batch: {
        id: batch.id,
        fileName: batch.fileName,
        fileType: batch.fileType,
        totalRecords: batch.totalRecords,
        validRecords: batch.validRecords,
        invalidRecords: batch.invalidRecords,
        status: batch.status,
        category: batch.dataSource.name,
        createdAt: batch.createdAt
      }
    });
  } catch (error: any) {
    console.error('Upload file import failed:', error);
    res.status(500).json({ error: error.message || 'Internal server error during import.' });
  }
};

// 2. Get All Imports
export const getImports = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'anonymous';
    const batches = await prisma.importBatch.findMany({
      where: {
        dataSource: {
          userId
        }
      },
      include: {
        dataSource: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      imports: batches.map(b => ({
        id: b.id,
        fileName: b.fileName,
        fileType: b.fileType,
        totalRecords: b.totalRecords,
        validRecords: b.validRecords,
        invalidRecords: b.invalidRecords,
        status: b.status,
        category: b.dataSource.name,
        createdAt: b.createdAt
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error fetching imports.' });
  }
};

// 3. Get Import by ID
export const getImportById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const batch = await prisma.importBatch.findUnique({
      where: { id },
      include: {
        dataSource: true
      }
    });

    if (!batch) {
      res.status(404).json({ error: 'Import batch not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      import: {
        id: batch.id,
        fileName: batch.fileName,
        fileType: batch.fileType,
        totalRecords: batch.totalRecords,
        validRecords: batch.validRecords,
        invalidRecords: batch.invalidRecords,
        status: batch.status,
        category: batch.dataSource.name,
        createdAt: batch.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error fetching import details.' });
  }
};

// 4. Get Import Preview (First 50 records)
export const getImportPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const records = await prisma.rawRecord.findMany({
      where: { importBatchId: id },
      orderBy: { rowNumber: 'asc' },
      take: 50
    });

    res.status(200).json({
      success: true,
      records: records.map(r => ({
        id: r.id,
        rowNumber: r.rowNumber,
        rawData: r.rawData,
        status: r.status,
        errorMessage: r.errorMessage,
        createdAt: r.createdAt
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error fetching import preview.' });
  }
};

// 5. Normalize RawRecords of an ImportBatch into FinancialRecords
export const normalizeImportBatch = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const id = req.params.id as string;
    const { mapping, recordType, importAsNew } = req.body;
    const userId = req.user?.id || 'anonymous';

    if (!mapping || !recordType) {
      res.status(400).json({ error: 'Missing mapping configurations or recordType.' });
      return;
    }

    const validTypes = ['BANK_TRANSACTION', 'INVOICE', 'PAYMENT', 'SETTLEMENT'];
    if (!validTypes.includes(recordType)) {
      res.status(400).json({ error: `Invalid recordType: ${recordType}. Must be one of ${validTypes.join(', ')}` });
      return;
    }

    const batch = await prisma.importBatch.findUnique({
      where: { id },
      include: { dataSource: true }
    });

    if (!batch) {
      res.status(404).json({ error: 'Import batch not found.' });
      return;
    }

    const rawRecords = await prisma.rawRecord.findMany({
      where: { importBatchId: id },
      orderBy: { rowNumber: 'asc' }
    });

    let processed = 0;
    let normalized = 0;
    let duplicates = 0;
    let invalid = 0;

    const seenExternalIds = new Set<string>();
    const recordsToInsert: any[] = [];
    const rawUpdates: any[] = [];
    const errorDetails: { rowNumber: number; error: string }[] = [];

    // Query existing DB external IDs to avoid db collisions
    const existingRecords = await prisma.financialRecord.findMany({
      where: { userId, recordType: recordType as any },
      select: { externalId: true }
    });
    const dbExternalIds = new Set(existingRecords.map(r => r.externalId));

    for (const record of rawRecords) {
      processed++;
      const rawData = record.rawData as Record<string, any>;

      if (!rawData || typeof rawData !== 'object' || Object.keys(rawData).length === 0) {
        invalid++;
        errorDetails.push({ rowNumber: record.rowNumber, error: 'Empty or malformed row' });
        rawUpdates.push({ id: record.id, status: 'INVALID', errorMessage: 'Row is empty or malformed' });
        continue;
      }

      // 1. Map values dynamically based on recordType
      let externalId = '';
      let dateVal: any = null;
      let amountVal = 0;
      let currencyVal = 'INR';
      let descriptionVal = '';
      let referenceVal = '';
      let counterpartyVal = '';
      let utrVal: string | null = null;
      let creditVal = 0;
      let debitVal = 0;
      let statusVal = 'PENDING';

      try {
        if (recordType === 'INVOICE') {
          externalId = String(rawData[mapping.invoice_id] || '').trim();
          dateVal = rawData[mapping.invoice_date];
          amountVal = parseFloat(String(rawData[mapping.invoice_amount] || '').replace(/[^0-9.-]/g, ''));
          currencyVal = String(rawData[mapping.currency] || 'INR').trim();
          statusVal = String(rawData[mapping.status] || 'ISSUED').trim();
          referenceVal = String(rawData[mapping.reference] || '').trim();
          counterpartyVal = String(rawData[mapping.customer_name] || '').trim();
        } else if (recordType === 'PAYMENT') {
          externalId = String(rawData[mapping.payment_id] || '').trim();
          dateVal = rawData[mapping.payment_date];
          amountVal = parseFloat(String(rawData[mapping.amount] || '').replace(/[^0-9.-]/g, ''));
          currencyVal = String(rawData[mapping.currency] || 'INR').trim();
          statusVal = String(rawData[mapping.status] || 'CAPTURED').trim();
          counterpartyVal = String(rawData[mapping.customer_name] || '').trim();
          referenceVal = String(rawData[mapping.gateway_reference] || rawData[mapping.invoice_id] || '').trim();
        } else if (recordType === 'SETTLEMENT') {
          externalId = String(rawData[mapping.settlement_id] || '').trim();
          dateVal = rawData[mapping.settlement_date];
          amountVal = parseFloat(String(rawData[mapping.settled_amount] || '').replace(/[^0-9.-]/g, ''));
          currencyVal = String(rawData[mapping.currency] || 'INR').trim();
          statusVal = String(rawData[mapping.status] || 'PROCESSED').trim();
          utrVal = String(rawData[mapping.utr] || '').trim();
          referenceVal = String(rawData[mapping.payment_id] || '').trim();
        } else if (recordType === 'BANK_TRANSACTION') {
          externalId = String(rawData[mapping.bank_transaction_id] || '').trim();
          dateVal = rawData[mapping.transaction_date];
          currencyVal = String(rawData[mapping.currency] || 'INR').trim();
          descriptionVal = String(rawData[mapping.description] || '').trim();
          utrVal = String(rawData[mapping.utr] || '').trim();
          referenceVal = String(rawData[mapping.reference] || '').trim();

          creditVal = mapping.credit && rawData[mapping.credit] ? parseFloat(String(rawData[mapping.credit]).replace(/[^0-9.-]/g, '')) || 0 : 0;
          debitVal = mapping.debit && rawData[mapping.debit] ? parseFloat(String(rawData[mapping.debit]).replace(/[^0-9.-]/g, '')) || 0 : 0;

          amountVal = creditVal !== 0 ? creditVal : -debitVal;
          statusVal = 'NORMALIZED';
        }
      } catch (err: any) {
        invalid++;
        errorDetails.push({ rowNumber: record.rowNumber, error: `Value mapping error: ${err.message}` });
        rawUpdates.push({ id: record.id, status: 'INVALID', errorMessage: `Value mapping error: ${err.message}` });
        continue;
      }

      // 2. Perform Validations
      if (!externalId) {
        invalid++;
        errorDetails.push({ rowNumber: record.rowNumber, error: 'Missing primary identifier ID' });
        rawUpdates.push({ id: record.id, status: 'INVALID', errorMessage: 'Missing primary identifier ID' });
        continue;
      }

      const parsedDate = parseDateValue(dateVal);
      if (isNaN(parsedDate.getTime())) {
        invalid++;
        errorDetails.push({ rowNumber: record.rowNumber, error: `Invalid date format: "${dateVal}"` });
        rawUpdates.push({ id: record.id, status: 'INVALID', errorMessage: `Invalid date format: "${dateVal}"` });
        continue;
      }

      if (isNaN(amountVal) || (recordType !== 'BANK_TRANSACTION' && amountVal <= 0)) {
        invalid++;
        errorDetails.push({ rowNumber: record.rowNumber, error: `Invalid numeric amount: "${amountVal}"` });
        rawUpdates.push({ id: record.id, status: 'INVALID', errorMessage: `Invalid numeric amount: "${amountVal}"` });
        continue;
      }

      // 3. Deduplication checks
      let finalExternalId = externalId;
      if (seenExternalIds.has(externalId)) {
        duplicates++;
        if (importAsNew) {
          finalExternalId = `${externalId}-DUP-FILE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        } else {
          rawUpdates.push({ id: record.id, status: 'DUPLICATE', errorMessage: 'Duplicate row found in same file' });
          continue;
        }
      }
      seenExternalIds.add(finalExternalId);

      if (dbExternalIds.has(finalExternalId)) {
        duplicates++;
        if (importAsNew) {
          finalExternalId = `${finalExternalId}-DUP-DB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        } else {
          rawUpdates.push({ id: record.id, status: 'DUPLICATE', errorMessage: 'Duplicate record already stored in ledger' });
          continue;
        }
      }

      // 4. Staging insertion item
      recordsToInsert.push({
        userId,
        sourceType: batch.dataSource.type,
        sourceRecordId: record.id,
        externalId: finalExternalId,
        recordType: recordType as any,
        amount: amountVal,
        currency: currencyVal,
        transactionDate: parsedDate,
        description: descriptionVal || null,
        reference: referenceVal || null,
        counterparty: counterpartyVal || null,
        utr: utrVal || null,
        creditAmount: creditVal,
        debitAmount: debitVal,
        status: 'NORMALIZED',
        metadata: rawData,
        mappingConfig: mapping,
        importBatchId: batch.id
      });

      rawUpdates.push({ id: record.id, status: 'NORMALIZED', errorMessage: null });
      normalized++;
    }

    // 5. Database Batch Transaction Execution
    const durationMs = Date.now() - startTime;
    await prisma.$transaction(async (tx) => {
      if (recordsToInsert.length > 0) {
        await tx.financialRecord.createMany({
          data: recordsToInsert
        });
      }

      // Default all raw records in this batch to NORMALIZED in a single query
      await tx.rawRecord.updateMany({
        where: { importBatchId: batch.id },
        data: { status: 'NORMALIZED', errorMessage: null }
      });

      // Update only the rare non-normalized (duplicate or invalid) raw records individually
      const anomalyUpdates = rawUpdates.filter(update => update.status !== 'NORMALIZED');
      for (const update of anomalyUpdates) {
        await tx.rawRecord.update({
          where: { id: update.id },
          data: { status: update.status, errorMessage: update.errorMessage }
        });
      }

      await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          status: invalid === 0 ? 'NORMALIZED' : (normalized > 0 ? 'PARTIAL' : 'FAILED'),
          validRecords: normalized,
          invalidRecords: invalid,
          duplicateCount: duplicates,
          completedAt: new Date(),
          processingTime: Number((durationMs / 1000).toFixed(2)),
          createdBy: userId
        }
      });
    }, {
      timeout: 45000
    });

    emitToUser(userId, 'cash.updated', { cashChange: true });
    emitToUser(userId, 'record.imported', {
      fileName: batch.fileName,
      totalRecords: batch.totalRecords,
      status: 'NORMALIZED'
    });

    await logAudit(
      userId,
      req.user?.email || undefined,
      'DATA_NORMALIZATION',
      `Normalized Data Center 2.0 batch: ${batch.fileName}. Validated: ${normalized}, Duplicates: ${duplicates}, Errors: ${invalid}.`,
      undefined,
      'ImportBatch',
      batch.id,
      null,
      { recordType, normalized, duplicates, invalid }
    );

    res.status(200).json({
      success: true,
      processed,
      normalized,
      duplicates,
      invalid,
      processingTime: Number((durationMs / 1000).toFixed(2)),
      errorDetails
    });
  } catch (error: any) {
    console.error('Normalization error:', error);
    res.status(500).json({ error: error.message || 'Internal server error during normalization.' });
  }
};

export const getImportStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'anonymous';

    const [
      totalRecords,
      invoices,
      payments,
      settlements,
      bankTransactions,
      failedImports,
      lastImport
    ] = await prisma.$transaction([
      prisma.financialRecord.count({ where: { userId } }),
      prisma.financialRecord.count({ where: { userId, recordType: 'INVOICE' } }),
      prisma.financialRecord.count({ where: { userId, recordType: 'PAYMENT' } }),
      prisma.financialRecord.count({ where: { userId, recordType: 'SETTLEMENT' } }),
      prisma.financialRecord.count({ where: { userId, recordType: 'BANK_TRANSACTION' } }),
      prisma.importBatch.count({ where: { dataSource: { userId }, status: 'FAILED' } }),
      prisma.importBatch.findFirst({
        where: { dataSource: { userId } },
        orderBy: { createdAt: 'desc' },
        include: { dataSource: true }
      })
    ]);

    const readyForRecon = await prisma.financialRecord.count({
      where: { userId, status: 'NORMALIZED' }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalRecords,
        invoices,
        payments,
        settlements,
        bankTransactions,
        failedImports,
        readyForRecon,
        lastImport: lastImport ? {
          fileName: lastImport.fileName,
          category: lastImport.dataSource.name,
          createdAt: lastImport.createdAt,
          status: lastImport.status
        } : null
      }
    });
  } catch (error: any) {
    console.error('Failed to get import stats:', error);
    res.status(500).json({ error: error.message || 'Internal server error fetching ingestion statistics.' });
  }
};

// 7. Multi-Source Batch Upload & Analysis trigger
export const uploadBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as any;
    const invoiceFile = files?.invoiceFile?.[0];
    const paymentFile = files?.paymentFile?.[0];
    const settlementFile = files?.settlementFile?.[0];
    const bankFile = files?.bankFile?.[0];

    if (!invoiceFile && !paymentFile && !settlementFile && !bankFile) {
      res.status(400).json({ error: 'At least one file must be uploaded for batch analysis.' });
      return;
    }

    const userId = req.user?.id || 'anonymous';
    
    // Generate unique Batch ID
    const todayStr = new Date().toISOString().split('T')[0];
    const randomNum = Math.floor(100 + Math.random() * 900);
    const batchId = `BATCH-${todayStr}-${randomNum}`;

    // Create ReconciliationRun
    const run = await prisma.reconciliationRun.create({
      data: {
        id: batchId,
        userId,
        source: 'Multi-Source',
        target: 'Control Center',
        status: 'RUNNING',
        totalRecords: 0,
        recordsProcessed: 0,
        matchedRecords: 0,
        exceptionsFound: 0,
        matchRate: 0,
        durationMs: 0
      }
    });

    emitToUser(userId, 'reconciliation.started', { runId: run.id });

    // Prepare buffers for background parsing
    const filesData = {
      invoiceFile: invoiceFile ? { buffer: invoiceFile.buffer, name: invoiceFile.originalname } : null,
      paymentFile: paymentFile ? { buffer: paymentFile.buffer, name: paymentFile.originalname } : null,
      settlementFile: settlementFile ? { buffer: settlementFile.buffer, name: settlementFile.originalname } : null,
      bankFile: bankFile ? { buffer: bankFile.buffer, name: bankFile.originalname } : null
    };

    // Lazily require reconciliation controller to avoid circular imports
    const { reconcileMultiSourceBatch } = require('./reconciliation.controller');
    
    // Run background task
    reconcileMultiSourceBatch(run.id, userId, filesData).catch((err: any) => {
      console.error('Background batch reconciliation failed:', err);
    });

    res.status(200).json({
      success: true,
      batchId: run.id,
      run
    });
  } catch (error: any) {
    console.error('Batch upload error:', error);
    res.status(500).json({ error: error.message || 'Internal server error starting batch analysis.' });
  }
};
