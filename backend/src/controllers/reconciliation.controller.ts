import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { RunStatus, MatchStatus, MatchType, ExceptionStatus, ExceptionSeverity, ExceptionType } from '@prisma/client';
import { emitToUser } from '../services/socket.service';
import xlsx from 'xlsx';

export const getReconciliationSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const runsCount = await prisma.reconciliationRun.count();
    const runs = await prisma.reconciliationRun.aggregate({
      _sum: { recordsProcessed: true, matchedRecords: true, exceptionsFound: true, unresolvedExceptions: true }
    });

    const totalRecordsProcessed = runs._sum.recordsProcessed || 0;
    const totalMatched = runs._sum.matchedRecords || 0;
    const totalExceptions = runs._sum.exceptionsFound || 0;
    const unresolvedExceptions = runs._sum.unresolvedExceptions || 0;
    const totalUnmatched = totalRecordsProcessed - totalMatched;
    const matchRate = totalRecordsProcessed > 0 ? Number(((totalMatched / totalRecordsProcessed) * 100).toFixed(2)) : 100;

    res.status(200).json({
      success: true,
      data: {
        totalRecordsProcessed,
        totalMatched,
        totalUnmatched,
        matchRate,
        totalExceptions,
        unresolvedExceptions
      }
    });
  } catch (error) {
    console.error('Failed to get reconciliation summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getReconciliationRuns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 25, status } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as RunStatus;

    const [runs, total] = await prisma.$transaction([
      prisma.reconciliationRun.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.reconciliationRun.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: runs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    console.error('Failed to get reconciliation runs:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getReconciliationRunById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const run = await prisma.reconciliationRun.findUnique({
      where: { id },
      include: {
        records: true
      }
    });

    if (!run) {
      res.status(404).json({ success: false, message: 'Reconciliation run not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: run
    });
  } catch (error) {
    console.error('Failed to get reconciliation run details:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getReconciliationRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 25,
      status,
      matchType,
      runId,
      reviewed,
      differenceExists,
      search
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.matchStatus = status as MatchStatus;
    if (matchType) where.matchType = matchType as MatchType;
    if (runId) where.runId = runId as string;
    if (reviewed !== undefined) where.reviewed = reviewed === 'true';
    if (differenceExists === 'true') {
      where.difference = { not: 0 };
    }

    if (search) {
      where.OR = [
        { id: { contains: search as string, mode: 'insensitive' } },
        { runId: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [records, total] = await prisma.$transaction([
      prisma.reconciliationRecord.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          exceptions: {
            select: {
              id: true,
              type: true,
              severity: true,
              status: true,
              description: true
            }
          }
        }
      }),
      prisma.reconciliationRecord.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    // Map DB reconciliation record to include FinancialRecord details expected by frontend
    const mappedRecords = await Promise.all(records.map(async (record) => {
      let sourceRecord: any = null;
      let targetRecord: any = null;

      if (record.sourceRecordId && record.sourceType === 'Payment') {
        const pay = await prisma.payment.findUnique({ where: { id: record.sourceRecordId } });
        if (pay) {
          sourceRecord = {
            id: pay.id,
            type: 'Payment',
            reference: pay.gatewayPaymentId || pay.id,
            date: pay.paymentDate.toISOString(),
            amount: pay.amount,
            status: pay.status
          };
        }
      }

      if (record.targetRecordId && record.targetType === 'Settlement') {
        const set = await prisma.settlement.findUnique({ where: { id: record.targetRecordId } });
        if (set) {
          targetRecord = {
            id: set.id,
            type: 'Settlement',
            reference: set.gatewayReference || set.id,
            date: set.settlementDate.toISOString(),
            amount: set.settledAmount,
            status: set.status
          };
        }
      }

      return {
        id: record.id,
        runId: record.runId,
        sourceRecord,
        targetRecord,
        sourceAmount: record.sourceAmount,
        targetAmount: record.targetAmount,
        difference: record.difference,
        matchStatus: record.matchStatus,
        matchType: record.matchType,
        confidence: record.confidence,
        exception: record.exceptions[0] || null,
        reviewed: record.reviewed,
        notes: record.notes,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };
    }));

    res.status(200).json({
      success: true,
      data: mappedRecords,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    console.error('Failed to get reconciliation records:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getReconciliationRecordById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const record = await prisma.reconciliationRecord.findUnique({
      where: { id },
      include: {
        exceptions: true
      }
    });

    if (!record) {
      res.status(404).json({ success: false, message: 'Reconciliation record not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Failed to get reconciliation record detail:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const executeReconciliation = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const userId = req.user?.id || 'anonymous';
  
  try {
    const { 
      reconcileType = 'FULL_FLOW', // FULL_FLOW, BANK_INVOICE, INVOICE_PAYMENT, PAYMENT_SETTLEMENT, SETTLEMENT_BANK
      startDate, 
      endDate 
    } = req.body;

    // 1. Create running job
    const run = await prisma.reconciliationRun.create({
      data: {
        source: reconcileType,
        target: 'Multi-Source',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: RunStatus.RUNNING,
        matchRate: 0,
        recordsProcessed: 0,
        matchedRecords: 0,
        exceptionsFound: 0,
        unresolvedExceptions: 0,
        reconciledAmount: 0,
        unmatchedAmount: 0,
        pendingAmount: 0
      }
    });

    emitToUser(userId, 'reconciliation.progress', {
      runId: run.id,
      statusText: 'Reading records',
      percent: 10,
      processed: 0,
      total: 100,
      matches: 0,
      exceptions: 0,
      throughput: 0,
      completed: false
    });

    // Date filters for queries
    const dateFilter: any = { userId };
    if (startDate || endDate) {
      dateFilter.transactionDate = {};
      if (startDate) dateFilter.transactionDate.gte = new Date(startDate);
      if (endDate) dateFilter.transactionDate.lte = new Date(endDate);
    }

    // Query all normalized FinancialRecords for the user
    const records = await prisma.financialRecord.findMany({
      where: dateFilter
    });

    emitToUser(userId, 'reconciliation.progress', {
      runId: run.id,
      statusText: 'Matching transactions',
      percent: 30,
      processed: Math.floor(records.length * 0.3),
      total: records.length,
      matches: 0,
      exceptions: 0,
      throughput: 0,
      completed: false
    });

    const invoices = records.filter(r => r.recordType === 'INVOICE');
    const payments = records.filter(r => r.recordType === 'PAYMENT');
    const settlements = records.filter(r => r.recordType === 'SETTLEMENT');
    const bankTxns = records.filter(r => r.recordType === 'BANK_TRANSACTION');

    const totalRecords = records.length;
    const matchedRecordIds = new Set<string>();
    const chains: any[] = [];

    emitToUser(userId, 'reconciliation.progress', {
      runId: run.id,
      statusText: 'Checking references',
      percent: 50,
      processed: Math.floor(records.length * 0.5),
      total: records.length,
      matches: 0,
      exceptions: 0,
      throughput: 0,
      completed: false
    });

    // Helper map lookup tables
    const invoiceMap = new Map<string, any>(invoices.map(r => [r.externalId.toLowerCase(), r]));
    
    const paymentMap = new Map<string, any>(payments.map(r => [r.externalId.toLowerCase(), r]));
    const paymentByInvoiceRef = new Map<string, any>();
    payments.forEach(r => {
      if (r.reference) paymentByInvoiceRef.set(r.reference.toLowerCase(), r);
    });

    const settlementMap = new Map<string, any>(settlements.map(r => [r.externalId.toLowerCase(), r]));
    const settlementByPaymentRef = new Map<string, any>();
    settlements.forEach(r => {
      if (r.reference) settlementByPaymentRef.set(r.reference.toLowerCase(), r);
    });

    const bankByUTR = new Map<string, any>();
    bankTxns.forEach(r => {
      if (r.utr) bankByUTR.set(r.utr.toLowerCase(), r);
      if (r.reference) bankByUTR.set(r.reference.toLowerCase(), r);
    });

    // Helper functions and mappings for multi-strategy and suffix fallbacks
    const getSuffix = (idStr: string) => {
      const m = idStr.match(/\d+$/);
      return m ? m[0] : '';
    };

    const invoiceBySuffix = new Map<string, any>();
    invoices.forEach(r => {
      const s = getSuffix(r.externalId);
      if (s) invoiceBySuffix.set(s, r);
    });

    const paymentBySuffix = new Map<string, any>();
    payments.forEach(r => {
      const s = getSuffix(r.externalId);
      if (s) paymentBySuffix.set(s, r);
    });

    const settlementBySuffix = new Map<string, any>();
    settlements.forEach(r => {
      const s = getSuffix(r.externalId);
      if (s) settlementBySuffix.set(s, r);
    });

    const bankBySuffix = new Map<string, any>();
    bankTxns.forEach(r => {
      const s = getSuffix(r.externalId);
      if (s) bankBySuffix.set(s, r);
    });

    const paymentByExternalId = new Map<string, any>(payments.map(r => [r.externalId.toLowerCase(), r]));
    const settlementByExternalId = new Map<string, any>(settlements.map(r => [r.externalId.toLowerCase(), r]));
    const bankByExternalId = new Map<string, any>(bankTxns.map(r => [r.externalId.toLowerCase(), r]));

    emitToUser(userId, 'reconciliation.progress', {
      runId: run.id,
      statusText: 'Checking amounts',
      percent: 70,
      processed: Math.floor(records.length * 0.7),
      total: records.length,
      matches: 0,
      exceptions: 0,
      throughput: 0,
      completed: false
    });

    if (reconcileType === 'FULL_FLOW') {
      // 1. Match Invoices
      invoices.forEach(invoice => {
        const invKey = invoice.externalId.toLowerCase();
        const suffix = getSuffix(invoice.externalId);
        
        let payment = paymentByInvoiceRef.get(invKey) || paymentByExternalId.get(invKey);
        if (!payment && suffix) {
          payment = paymentBySuffix.get(suffix);
        }

        let settlement = null;
        let bank = null;

        if (payment) {
          matchedRecordIds.add(payment.id);
          const payKey = payment.externalId.toLowerCase();
          const paySuffix = getSuffix(payment.externalId);
          
          settlement = settlementByPaymentRef.get(payKey) || settlementByExternalId.get(payKey);
          if (!settlement && paySuffix) {
            settlement = settlementBySuffix.get(paySuffix);
          }
          
          if (settlement) {
            matchedRecordIds.add(settlement.id);
            const setKey = (settlement.utr || settlement.externalId).toLowerCase();
            const setSuffix = getSuffix(settlement.externalId);
            
            bank = bankByUTR.get(setKey) || bankByExternalId.get(setKey);
            if (!bank && setSuffix) {
              bank = bankBySuffix.get(setSuffix);
            }
            if (bank) matchedRecordIds.add(bank.id);
          }
        }
        chains.push({ invoice, payment, settlement, bank });
      });

      // 2. Unmatched Payments
      payments.forEach(payment => {
        if (matchedRecordIds.has(payment.id)) return;
        const payKey = payment.externalId.toLowerCase();
        const paySuffix = getSuffix(payment.externalId);
        
        let settlement = settlementByPaymentRef.get(payKey) || settlementByExternalId.get(payKey);
        if (!settlement && paySuffix) {
          settlement = settlementBySuffix.get(paySuffix);
        }
        
        let bank = null;

        if (settlement) {
          matchedRecordIds.add(settlement.id);
          const setKey = (settlement.utr || settlement.externalId).toLowerCase();
          const setSuffix = getSuffix(settlement.externalId);
          
          bank = bankByUTR.get(setKey) || bankByExternalId.get(setKey);
          if (!bank && setSuffix) {
            bank = bankBySuffix.get(setSuffix);
          }
          if (bank) matchedRecordIds.add(bank.id);
        }
        chains.push({ invoice: null, payment, settlement, bank });
      });

      // 3. Unmatched Settlements
      settlements.forEach(settlement => {
        if (matchedRecordIds.has(settlement.id)) return;
        const setKey = (settlement.utr || settlement.externalId).toLowerCase();
        const setSuffix = getSuffix(settlement.externalId);
        
        let bank = bankByUTR.get(setKey) || bankByExternalId.get(setKey);
        if (!bank && setSuffix) {
          bank = bankBySuffix.get(setSuffix);
        }
        if (bank) matchedRecordIds.add(bank.id);
        chains.push({ invoice: null, payment: null, settlement, bank });
      });

      // 4. Unmatched Bank Statements
      bankTxns.forEach(bank => {
        if (matchedRecordIds.has(bank.id)) return;
        chains.push({ invoice: null, payment: null, settlement: null, bank });
      });

    } else if (reconcileType === 'BANK_INVOICE') {
      invoices.forEach(invoice => {
        const key = invoice.externalId.toLowerCase();
        const suffix = getSuffix(invoice.externalId);
        
        let bank = bankByUTR.get(key) || bankByExternalId.get(key);
        if (!bank && suffix) {
          bank = bankBySuffix.get(suffix);
        }
        if (bank) matchedRecordIds.add(bank.id);
        chains.push({ invoice, payment: null, settlement: null, bank });
      });
      bankTxns.forEach(bank => {
        if (matchedRecordIds.has(bank.id)) return;
        chains.push({ invoice: null, payment: null, settlement: null, bank });
      });
    } else if (reconcileType === 'INVOICE_PAYMENT') {
      invoices.forEach(invoice => {
        const key = invoice.externalId.toLowerCase();
        const suffix = getSuffix(invoice.externalId);
        
        let payment = paymentByInvoiceRef.get(key) || paymentByExternalId.get(key);
        if (!payment && suffix) {
          payment = paymentBySuffix.get(suffix);
        }
        if (payment) matchedRecordIds.add(payment.id);
        chains.push({ invoice, payment, settlement: null, bank: null });
      });
      payments.forEach(payment => {
        if (matchedRecordIds.has(payment.id)) return;
        chains.push({ invoice: null, payment, settlement: null, bank: null });
      });
    } else if (reconcileType === 'PAYMENT_SETTLEMENT') {
      payments.forEach(payment => {
        const key = payment.externalId.toLowerCase();
        const suffix = getSuffix(payment.externalId);
        
        let settlement = settlementByPaymentRef.get(key) || settlementByExternalId.get(key);
        if (!settlement && suffix) {
          settlement = settlementBySuffix.get(suffix);
        }
        if (settlement) matchedRecordIds.add(settlement.id);
        chains.push({ invoice: null, payment, settlement, bank: null });
      });
      settlements.forEach(settlement => {
        if (matchedRecordIds.has(settlement.id)) return;
        chains.push({ invoice: null, payment: null, settlement, bank: null });
      });
    } else if (reconcileType === 'SETTLEMENT_BANK') {
      settlements.forEach(settlement => {
        const key = (settlement.utr || settlement.externalId).toLowerCase();
        const suffix = getSuffix(settlement.externalId);
        
        let bank = bankByUTR.get(key) || bankByExternalId.get(key);
        if (!bank && suffix) {
          bank = bankBySuffix.get(suffix);
        }
        if (bank) matchedRecordIds.add(bank.id);
        chains.push({ invoice: null, payment: null, settlement, bank });
      });
      bankTxns.forEach(bank => {
        if (matchedRecordIds.has(bank.id)) return;
        chains.push({ invoice: null, payment: null, settlement: null, bank });
      });
    }

    emitToUser(userId, 'reconciliation.progress', {
      runId: run.id,
      statusText: 'Checking dates',
      percent: 80,
      processed: Math.floor(records.length * 0.8),
      total: records.length,
      matches: 0,
      exceptions: 0,
      throughput: 0,
      completed: false
    });

    emitToUser(userId, 'reconciliation.progress', {
      runId: run.id,
      statusText: 'Finding exceptions',
      percent: 90,
      processed: Math.floor(records.length * 0.9),
      total: records.length,
      matches: 0,
      exceptions: 0,
      throughput: 0,
      completed: false
    });

    // 5. Build reconciliation chains and calculate statistics
    let matchedRecordsCount = 0;
    let exceptionsFound = 0;
    let unresolvedExceptions = 0;
    let reconciledAmount = 0;
    let unmatchedAmount = 0;
    let pendingAmount = 0;

    const reconciliationRecordsToCreate = chains.map(chain => {
      const { invoice, payment, settlement, bank } = chain;
      let chainStatus = 'UNRESOLVED';
      let matchStatus = 'UNMATCHED';
      let difference = 0;
      let notes = '';

      const invoiceAmt = invoice?.amount || 0;
      const paymentAmt = payment?.amount || 0;
      const settlementAmt = settlement?.amount || 0;
      const bankAmt = bank?.amount || 0;

      // Deterministic rules check
      if (reconcileType === 'FULL_FLOW') {
        if (invoice && payment && settlement && bank) {
          const diff = settlementAmt - paymentAmt;
          if (Math.abs(diff) > 50.0) {
            chainStatus = 'AMOUNT_MISMATCH';
            difference = diff;
            notes = `Amount mismatch: Invoice is ₹${invoiceAmt}, payment is ₹${paymentAmt}, settlement is ₹${settlementAmt}.`;
            unmatchedAmount += Math.abs(diff);
            exceptionsFound++;
          } else {
            chainStatus = 'FULLY_RECONCILED';
            matchStatus = 'MATCHED';
            matchedRecordsCount++;
            reconciledAmount += invoiceAmt;
          }
        } else if (invoice && !payment) {
          chainStatus = 'PAYMENT_MISSING';
          difference = -invoiceAmt;
          notes = `Payment missing for Invoice ID: ${invoice.externalId}`;
          pendingAmount += invoiceAmt;
          exceptionsFound++;
          unresolvedExceptions++;
        } else if (payment && !settlement) {
          chainStatus = 'SETTLEMENT_MISSING';
          difference = -paymentAmt;
          notes = `Settlement missing for Payment: ${payment.externalId}`;
          pendingAmount += paymentAmt;
          exceptionsFound++;
          unresolvedExceptions++;
        } else if (settlement && !bank) {
          chainStatus = 'BANK_CREDIT_MISSING';
          difference = -settlementAmt;
          notes = `Bank statement credit missing for Settlement UTR: ${settlement.utr || 'N/A'}`;
          pendingAmount += settlementAmt;
          exceptionsFound++;
          unresolvedExceptions++;
        } else {
          chainStatus = 'UNRESOLVED';
          difference = -(invoiceAmt || paymentAmt || settlementAmt || bankAmt);
          notes = 'Incomplete transactions chain flow.';
          pendingAmount += Math.abs(difference);
          exceptionsFound++;
          unresolvedExceptions++;
        }
      } else {
        // Two-source matching rule
        const first = invoice || payment || settlement;
        const second = bank || settlement || payment;

        if (first && second) {
          const firstAmt = first.amount;
          const secondAmt = second.amount;
          const diff = secondAmt - firstAmt;
          if (Math.abs(diff) > 0.01) {
            chainStatus = 'AMOUNT_MISMATCH';
            difference = diff;
            notes = `Amount mismatch: Source amount is ₹${firstAmt}, target amount is ₹${secondAmt}.`;
            unmatchedAmount += Math.abs(diff);
            exceptionsFound++;
          } else {
            chainStatus = 'FULLY_RECONCILED';
            matchStatus = 'MATCHED';
            matchedRecordsCount++;
            reconciledAmount += firstAmt;
          }
        } else {
          chainStatus = 'UNRESOLVED';
          difference = -(invoiceAmt || paymentAmt || settlementAmt || bankAmt);
          notes = 'Missing matching records counterpart.';
          pendingAmount += Math.abs(difference);
          exceptionsFound++;
          unresolvedExceptions++;
        }
      }

      // Check dates timing difference (severity checks)
      let severity = 'LOW';
      if (chainStatus !== 'FULLY_RECONCILED') {
        severity = Math.abs(difference) > 50000 ? 'CRITICAL' : (Math.abs(difference) > 10000 ? 'HIGH' : 'MEDIUM');
      }

      return {
        runId: run.id,
        invoiceRecordId: invoice?.id || null,
        paymentRecordId: payment?.id || null,
        settlementRecordId: settlement?.id || null,
        bankRecordId: bank?.id || null,
        sourceAmount: invoiceAmt || paymentAmt || settlementAmt || bankAmt,
        targetAmount: bankAmt || settlementAmt || paymentAmt || 0,
        difference,
        matchStatus: matchStatus as any,
        matchType: (chainStatus === 'FULLY_RECONCILED' ? 'EXACT' : 'NONE') as any,
        confidence: chainStatus === 'FULLY_RECONCILED' ? 1.0 : 0.4,
        chainStatus,
        chainSeverity: severity,
        notes
      };
    });

    // Write all records in transaction
    await prisma.$transaction(async (tx) => {
      // Bulk insert reconciliation records
      if (reconciliationRecordsToCreate.length > 0) {
        await tx.reconciliationRecord.createMany({
          data: reconciliationRecordsToCreate
        });
      }

      // Query inserted record IDs to associate Exceptions
      const inserted = await tx.reconciliationRecord.findMany({
        where: { runId: run.id }
      });

      const exceptionsToCreate: any[] = [];
      const mainExceptionsToCreate: any[] = [];

      inserted.forEach((rec, idx) => {
        const sourceData = reconciliationRecordsToCreate[idx];
        if (sourceData && sourceData.matchStatus === 'UNMATCHED') {
          // Determine ExceptionType
          let exType = 'UNKNOWN';
          if (sourceData.chainStatus === 'AMOUNT_MISMATCH') exType = 'AMOUNT_MISMATCH';
          else if (sourceData.chainStatus === 'DUPLICATE') exType = 'DUPLICATE';
          else if (sourceData.chainStatus === 'DATE_MISMATCH') exType = 'DATE_MISMATCH';
          else if (sourceData.chainStatus === 'REFERENCE_MISMATCH') exType = 'REFERENCE_MISMATCH';
          else if (sourceData.chainStatus?.includes('MISSING')) exType = 'MISSING_RECORD';
          else exType = 'UNKNOWN';

          // Determine ExceptionSeverity
          let exSev = 'MEDIUM';
          if (sourceData.chainSeverity === 'CRITICAL') exSev = 'CRITICAL';
          else if (sourceData.chainSeverity === 'HIGH') exSev = 'HIGH';
          else if (sourceData.chainSeverity === 'LOW') exSev = 'LOW';

          const finId = sourceData.invoiceRecordId || sourceData.paymentRecordId || sourceData.settlementRecordId || sourceData.bankRecordId;
          if (finId) {
            exceptionsToCreate.push({
              runId: run.id,
              recordId: finId,
              description: sourceData.notes || 'Reconciliation discrepancy.',
              type: sourceData.chainStatus || 'UNKNOWN',
              severity: sourceData.chainSeverity || 'MEDIUM',
              status: 'OPEN',
              amount: Math.abs(sourceData.difference || 0)
            });
          }

          mainExceptionsToCreate.push({
            description: sourceData.notes,
            type: exType as any,
            severity: exSev as any,
            status: 'OPEN',
            difference: sourceData.difference,
            recordId: rec.id,
            invoiceId: sourceData.invoiceRecordId,
            paymentId: sourceData.paymentRecordId,
            settlementId: sourceData.settlementRecordId
          });
        }
      });

      if (exceptionsToCreate.length > 0) {
        await tx.reconciliationException.createMany({
          data: exceptionsToCreate
        });
      }

      if (mainExceptionsToCreate.length > 0) {
        await tx.exception.createMany({
          data: mainExceptionsToCreate
        });
      }
    }, {
      timeout: 45000
    });

    const durationMs = Date.now() - startTime;
    const matchRate = totalRecords > 0 ? Number(((matchedRecordsCount / chains.length) * 100).toFixed(2)) : 100;

    // 6. Update Reconciliation Run stats
    const completedRun = await prisma.reconciliationRun.update({
      where: { id: run.id },
      data: {
        recordsProcessed: chains.length,
        matchedRecords: matchedRecordsCount,
        exceptionsFound,
        unresolvedExceptions,
        matchRate,
        durationMs,
        status: RunStatus.COMPLETED,
        reconciledAmount,
        unmatchedAmount,
        pendingAmount
      }
    });

    emitToUser(userId, 'reconciliation.progress', {
      runId: run.id,
      statusText: 'Complete',
      percent: 100,
      processed: chains.length,
      total: chains.length,
      matches: matchedRecordsCount,
      exceptions: exceptionsFound,
      throughput: Math.floor(chains.length / (durationMs / 1000 || 1)),
      completed: true
    });

    await logAudit(
      userId,
      req.user?.email || undefined,
      'RECONCILIATION_RUN',
      `Reconciled ${reconcileType} flow. Match rate: ${matchRate}%, Exceptions: ${exceptionsFound}`,
      undefined,
      'ReconciliationRun',
      run.id,
      null,
      { reconcileType, matchRate, exceptionsFound }
    );

    res.status(200).json({
      success: true,
      data: completedRun
    });

  } catch (error: any) {
    console.error('Reconciliation Execution Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during reconciliation execution.'
    });
  }
};

// Mode 1 helper: Auto-detect headers based on standard keywords
const detectHeaders = (row: any, isBank: boolean) => {
  if (!row || typeof row !== 'object') return {};
  const keys = Object.keys(row);
  const result: any = {};
  
  if (isBank) {
    result.amount = keys.find(k => /amount|value|sum|total/i.test(k));
    if (!result.amount) {
      result.credit = keys.find(k => /credit|deposit|inward/i.test(k));
      result.debit = keys.find(k => /debit|withdrawal|outward/i.test(k));
    }
    result.date = keys.find(k => /date|time|booking/i.test(k)) || keys.find(k => /dt/i.test(k));
    result.reference = keys.find(k => /utr|ref|id|txn|transaction/i.test(k));
    result.description = keys.find(k => /desc|narrat|particulars/i.test(k));
  } else {
    result.amount = keys.find(k => /amount|total|sum|val/i.test(k));
    result.date = keys.find(k => /date|issue|created/i.test(k));
    result.reference = keys.find(k => /invoice|id|number|ref/i.test(k));
    result.customer = keys.find(k => /customer|client|name/i.test(k));
  }
  
  return result;
};

// Helpers to parse values
const parseNumber = (val: any) => {
  if (val === null || val === undefined || val === '') return 0;
  return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
};

const parseDateValue = (value: any): Date => {
  if (value === null || value === undefined || value === '') return new Date(NaN);
  const num = Number(value);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const msInDay = 24 * 60 * 60 * 1000;
    return new Date(Math.round((num - 25569) * msInDay));
  }
  return new Date(value);
};

// Mode 1: Compare two files (Bank.csv vs Invoice.csv) and return exact differences
export const compareFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as any;
    const bankFile = files?.bankFile?.[0];
    const invoiceFile = files?.invoiceFile?.[0];

    if (!bankFile || !invoiceFile) {
      res.status(400).json({ success: false, message: 'Both bankFile and invoiceFile are required.' });
      return;
    }

    // Parse files
    let bankRows: any[] = [];
    let invoiceRows: any[] = [];

    try {
      const bankWorkbook = xlsx.read(bankFile.buffer, { type: 'buffer' });
      const bankSheetName = bankWorkbook.SheetNames[0];
      bankRows = xlsx.utils.sheet_to_json(bankWorkbook.Sheets[bankSheetName], { defval: "" });

      const invoiceWorkbook = xlsx.read(invoiceFile.buffer, { type: 'buffer' });
      const invoiceSheetName = invoiceWorkbook.SheetNames[0];
      invoiceRows = xlsx.utils.sheet_to_json(invoiceWorkbook.Sheets[invoiceSheetName], { defval: "" });
    } catch (err: any) {
      res.status(400).json({ success: false, message: `Failed to parse files: ${err.message}` });
      return;
    }

    if (bankRows.length === 0 || invoiceRows.length === 0) {
      res.status(400).json({ success: false, message: 'Uploaded files are empty.' });
      return;
    }

    // Detect headers
    const bankMapping = detectHeaders(bankRows[0], true);
    const invoiceMapping = detectHeaders(invoiceRows[0], false);

    // Normalize bank rows
    const normalizedBank = bankRows.map((row, idx) => {
      let amount = 0;
      if (bankMapping.amount) {
        amount = parseNumber(row[bankMapping.amount]);
      } else {
        const credit = bankMapping.credit ? parseNumber(row[bankMapping.credit]) : 0;
        const debit = bankMapping.debit ? parseNumber(row[bankMapping.debit]) : 0;
        amount = credit !== 0 ? credit : -debit;
      }
      
      const rawRef = bankMapping.reference ? String(row[bankMapping.reference] || '') : '';
      let ref = rawRef.trim();
      const description = bankMapping.description ? String(row[bankMapping.description] || '') : '';
      if (!ref && description) {
        const match = description.match(/(INV-\d+|pay_\w+|setl_\w+)/i);
        if (match) ref = match[0];
      }

      return {
        id: `bank_${idx}`,
        amount: Math.abs(amount),
        isCredit: amount >= 0,
        date: parseDateValue(row[bankMapping.date]),
        reference: ref,
        description,
        rawData: row
      };
    });

    // Normalize invoice rows
    const normalizedInvoices = invoiceRows.map((row, idx) => {
      const amount = invoiceMapping.amount ? parseNumber(row[invoiceMapping.amount]) : 0;
      const ref = invoiceMapping.reference ? String(row[invoiceMapping.reference] || '').trim() : '';
      return {
        id: `invoice_${idx}`,
        amount,
        date: parseDateValue(row[invoiceMapping.date]),
        reference: ref,
        customerName: invoiceMapping.customer ? String(row[invoiceMapping.customer] || '') : 'Unknown',
        rawData: row,
        matched: false
      };
    });

    // Run Comparison
    const mismatches: any[] = [];
    let matchedCount = 0;

    normalizedBank.forEach(bank => {
      // Find invoice by reference
      let matchedInvoice = bank.reference
        ? normalizedInvoices.find(inv => !inv.matched && inv.reference.toLowerCase() === bank.reference.toLowerCase())
        : null;

      // Fuzzy match fallback
      let isFuzzy = false;
      if (!matchedInvoice) {
        matchedInvoice = normalizedInvoices.find(inv => {
          if (inv.matched) return false;
          const sameAmount = Math.abs(inv.amount - bank.amount) < 0.01;
          const diffDays = Math.abs((inv.date.getTime() - bank.date.getTime()) / (1000 * 60 * 60 * 24));
          return sameAmount && diffDays <= 3;
        });
        if (matchedInvoice) isFuzzy = true;
      }

      if (matchedInvoice) {
        matchedInvoice.matched = true;
        
        const amtDiff = bank.amount - matchedInvoice.amount;
        const hasAmtDiff = Math.abs(amtDiff) > 0.01;
        const dateDiffDays = Math.abs((bank.date.getTime() - matchedInvoice.date.getTime()) / (1000 * 60 * 60 * 24));
        const hasDateDiff = dateDiffDays > 7;

        if (!hasAmtDiff && !isFuzzy) {
          matchedCount++;
        } else {
          matchedCount++;
          let diffType = 'AMOUNT_MISMATCH';
          let desc = `Amount mismatch: Bank says ₹${bank.amount.toLocaleString('en-IN')}, Invoice says ₹${matchedInvoice.amount.toLocaleString('en-IN')}. Diff: ₹${amtDiff.toLocaleString('en-IN')}.`;
          
          if (isFuzzy) {
            diffType = 'REFERENCE_MISMATCH';
            desc = `Reference mismatch: Row matched by amount (₹${bank.amount.toLocaleString('en-IN')}) and date, but references differ (Bank: ${bank.reference || 'None'}, Invoice: ${matchedInvoice.reference}).`;
          } else if (hasDateDiff) {
            diffType = 'DATE_MISMATCH';
            desc = `Date discrepancy: Dates differ by ${Math.round(dateDiffDays)} days (Bank: ${bank.date.toLocaleDateString()}, Invoice: ${matchedInvoice.date.toLocaleDateString()}).`;
          }

          mismatches.push({
            type: diffType,
            reference: matchedInvoice.reference || bank.reference || 'N/A',
            bankAmount: bank.amount,
            invoiceAmount: matchedInvoice.amount,
            difference: amtDiff,
            bankDate: isNaN(bank.date.getTime()) ? 'N/A' : bank.date.toISOString().split('T')[0],
            invoiceDate: isNaN(matchedInvoice.date.getTime()) ? 'N/A' : matchedInvoice.date.toISOString().split('T')[0],
            description: desc,
            customerName: matchedInvoice.customerName,
            // For REFERENCE/DATE mismatch, use the actual transaction amount as the financial impact indicator
            // since the monetary difference is 0 (amounts matched, only metadata differs)
            severity: (() => {
              const impactAmount = Math.abs(amtDiff) > 0 ? Math.abs(amtDiff) : bank.amount;
              if (impactAmount > 50000) return 'CRITICAL';
              if (impactAmount > 20000) return 'HIGH';
              if (impactAmount > 5000)  return 'MEDIUM';
              return 'LOW';
            })(),
            status: 'OPEN'
          });
        }
      } else {
        mismatches.push({
          type: 'MISSING_IN_INVOICE',
          reference: bank.reference || 'N/A',
          bankAmount: bank.amount,
          invoiceAmount: 0,
          difference: bank.amount,
          bankDate: isNaN(bank.date.getTime()) ? 'N/A' : bank.date.toISOString().split('T')[0],
          invoiceDate: 'N/A',
          description: `Bank transaction for ₹${bank.amount.toLocaleString('en-IN')} has no matching Invoice record.`,
          customerName: 'N/A',
          severity: bank.amount > 50000 ? 'CRITICAL' : (bank.amount > 20000 ? 'HIGH' : (bank.amount > 5000 ? 'MEDIUM' : 'LOW')),
          status: 'OPEN'
        });
      }
    });

    normalizedInvoices.forEach(inv => {
      if (!inv.matched) {
        mismatches.push({
          type: 'MISSING_IN_BANK',
          reference: inv.reference || 'N/A',
          bankAmount: 0,
          invoiceAmount: inv.amount,
          difference: -inv.amount,
          bankDate: 'N/A',
          invoiceDate: isNaN(inv.date.getTime()) ? 'N/A' : inv.date.toISOString().split('T')[0],
          description: `Invoice ${inv.reference} for ₹${inv.amount.toLocaleString('en-IN')} (Customer: ${inv.customerName}) has no matching Bank transaction.`,
          customerName: inv.customerName,
          severity: inv.amount > 50000 ? 'CRITICAL' : (inv.amount > 20000 ? 'HIGH' : (inv.amount > 5000 ? 'MEDIUM' : 'LOW')),
          status: 'OPEN'
        });
      }
    });

    const totalBankRecords = normalizedBank.length;
    const totalInvoiceRecords = normalizedInvoices.length;
    const totalDifferences = mismatches.length;
    const matchRate = totalBankRecords > 0 
      ? Number((((totalBankRecords - mismatches.filter(m => m.type === 'MISSING_IN_INVOICE').length) / totalBankRecords) * 100).toFixed(2)) 
      : 100;

    res.status(200).json({
      success: true,
      stats: {
        totalBankRecords,
        totalInvoiceRecords,
        matchedCount,
        totalDifferences,
        matchRate
      },
      mismatches
    });

  } catch (error: any) {
    console.error('File Comparison Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while comparing files.',
      code: 'FILE_COMPARISON_FAILED'
    });
  }
};

// Mode 2 Background matching process
export const reconcileMultiSourceBatch = async (
  runId: string,
  userId: string,
  filesData: {
    invoiceFile?: { buffer: Buffer; name: string };
    paymentFile?: { buffer: Buffer; name: string };
    settlementFile?: { buffer: Buffer; name: string };
    bankFile?: { buffer: Buffer; name: string };
  }
) => {
  const startTime = Date.now();
  console.log(`Starting background batch reconciliation for Run ID: ${runId}`);

  try {
    let totalRecords = 0;
    const importBatchIds: string[] = [];

    // Helper to parse and save raw data into FinancialRecords
    const parseAndSaveSource = async (fileInfo: any, recordType: string, categoryName: string) => {
      if (!fileInfo) return [];

      emitToUser(userId, 'reconciliation.progress', {
        runId,
        statusText: `Parsing ${categoryName} file...`,
        percent: 5
      });

      const workbook = xlsx.read(fileInfo.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

      if (rows.length === 0) return [];

      let dataSource = await prisma.dataSource.findFirst({
        where: { userId, name: categoryName }
      });
      if (!dataSource) {
        dataSource = await prisma.dataSource.create({
          data: { userId, name: categoryName, type: recordType, status: 'ACTIVE' }
        });
      }

      const importBatch = await prisma.importBatch.create({
        data: {
          dataSourceId: dataSource.id,
          fileName: fileInfo.name,
          fileType: fileInfo.name.endsWith('.xlsx') ? 'XLSX' : 'CSV',
          totalRecords: rows.length,
          validRecords: rows.length,
          invalidRecords: 0,
          status: 'NORMALIZED'
        }
      });

      importBatchIds.push(importBatch.id);

      const mapping = detectHeaders(rows[0], recordType === 'BANK_TRANSACTION');

      const recordsToInsert = rows.map((row: any, idx: number) => {
        let externalId = '';
        let amount = 0;
        let reference = '';
        let utr: string | null = null;
        let dateVal = new Date();
        let customer = 'Unknown';
        let description = '';
        let fees = 0;

        if (recordType === 'INVOICE') {
          const invRef = mapping.reference && row[mapping.reference] ? String(row[mapping.reference]).trim() : '';
          externalId = invRef || `inv_${idx}_${Date.now()}`;
          amount = parseNumber(row[mapping.amount]);
          reference = externalId;
          dateVal = parseDateValue(row[mapping.date]);
          customer = mapping.customer ? String(row[mapping.customer] || 'Unknown').trim() : 'Unknown';
        } else if (recordType === 'PAYMENT') {
          const payId = mapping.reference && row[mapping.reference] ? String(row[mapping.reference]).trim() : '';
          externalId = payId || `pay_${idx}_${Date.now()}`;
          amount = parseNumber(row[mapping.amount]);
          dateVal = parseDateValue(row[mapping.date]);
          reference = String(row['invoice_id'] || row['reference'] || '').trim();
          customer = mapping.customer ? String(row[mapping.customer] || 'Unknown').trim() : 'Unknown';
        } else if (recordType === 'SETTLEMENT') {
          const setId = mapping.reference && row[mapping.reference] ? String(row[mapping.reference]).trim() : '';
          externalId = setId || `setl_${idx}_${Date.now()}`;
          amount = parseNumber(row[mapping.amount] || row['settled_amount'] || row['amount']);
          dateVal = parseDateValue(row[mapping.date]);
          utr = String(row['utr'] || row['settlement_id'] || '').trim();
          reference = String(row['payment_id'] || row['reference'] || '').trim();
          fees = parseNumber(row['fees'] || row['fee'] || 0);
        } else if (recordType === 'BANK_TRANSACTION') {
          const bankRef = mapping.reference && row[mapping.reference] ? String(row[mapping.reference]).trim() : '';
          externalId = bankRef || `bank_${idx}_${Date.now()}`;
          dateVal = parseDateValue(row[mapping.date]);
          amount = parseNumber(row[mapping.amount]);
          utr = String(row['utr'] || row['reference'] || '').trim();
          reference = utr;
          description = mapping.description ? String(row[mapping.description] || '').trim() : '';
        }

        return {
          userId,
          sourceType: recordType,
          sourceRecordId: `${recordType.toLowerCase()}_${idx}`,
          externalId,
          recordType: recordType as any,
          amount: Math.abs(amount),
          currency: 'INR',
          transactionDate: dateVal,
          description,
          reference,
          counterparty: customer,
          utr,
          importBatchId: importBatch.id,
          status: 'NORMALIZED',
          metadata: JSON.stringify({ fees, originalRow: row })
        };
      });

      await prisma.financialRecord.createMany({
        data: recordsToInsert,
        skipDuplicates: true
      });

      return prisma.financialRecord.findMany({
        where: { importBatchId: importBatch.id }
      });
    };

    const invoiceRecords = await parseAndSaveSource(filesData.invoiceFile, 'INVOICE', 'Invoices Batch');
    const paymentRecords = await parseAndSaveSource(filesData.paymentFile, 'PAYMENT', 'Payments Batch');
    const settlementRecords = await parseAndSaveSource(filesData.settlementFile, 'SETTLEMENT', 'Razorpay Settlements Batch');
    const bankRecords = await parseAndSaveSource(filesData.bankFile, 'BANK_TRANSACTION', 'Bank Statements Batch');

    totalRecords = invoiceRecords.length + paymentRecords.length + settlementRecords.length + bankRecords.length;

    emitToUser(userId, 'reconciliation.progress', {
      runId,
      statusText: `Matching financial records...`,
      percent: 40,
      processed: 0,
      total: totalRecords
    });

    const invoiceMap = new Map<string, any>();
    const paymentByInvoiceRef = new Map<string, any>();
    const paymentMap = new Map<string, any>();
    const settlementByPaymentRef = new Map<string, any>();
    const settlementMap = new Map<string, any>();
    const bankByUTR = new Map<string, any>();

    invoiceRecords.forEach(r => invoiceMap.set(r.externalId.toLowerCase(), r));
    paymentRecords.forEach(r => {
      paymentMap.set(r.externalId.toLowerCase(), r);
      if (r.reference) {
        paymentByInvoiceRef.set(r.reference.toLowerCase(), r);
      }
    });
    settlementRecords.forEach(r => {
      settlementMap.set(r.externalId.toLowerCase(), r);
      if (r.reference) {
        settlementByPaymentRef.set(r.reference.toLowerCase(), r);
      }
    });
    bankRecords.forEach(r => {
      if (r.utr) bankByUTR.set(r.utr.toLowerCase(), r);
      if (r.reference) bankByUTR.set(r.reference.toLowerCase(), r);
    });

    const matchedRecords = new Set<string>();
    const chains: any[] = [];

    // Step A: Invoices
    invoiceRecords.forEach(invoice => {
      const invKey = invoice.externalId.toLowerCase();
      const payment = paymentByInvoiceRef.get(invKey);
      let settlement = null;
      let bank = null;

      if (payment) {
        matchedRecords.add(payment.id);
        const payKey = payment.externalId.toLowerCase();
        settlement = settlementByPaymentRef.get(payKey);
        
        if (settlement) {
          matchedRecords.add(settlement.id);
          const setKey = (settlement.utr || settlement.externalId).toLowerCase();
          bank = bankByUTR.get(setKey);
          if (bank) matchedRecords.add(bank.id);
        }
      }

      chains.push({ invoice, payment, settlement, bank });
    });

    // Step B: Unmatched Payments
    paymentRecords.forEach(payment => {
      if (matchedRecords.has(payment.id)) return;
      
      const payKey = payment.externalId.toLowerCase();
      let settlement = settlementByPaymentRef.get(payKey);
      let bank = null;

      if (settlement) {
        matchedRecords.add(settlement.id);
        const setKey = (settlement.utr || settlement.externalId).toLowerCase();
        bank = bankByUTR.get(setKey);
        if (bank) matchedRecords.add(bank.id);
      }

      chains.push({ invoice: null, payment, settlement, bank });
    });

    // Step C: Unmatched Settlements
    settlementRecords.forEach(settlement => {
      if (matchedRecords.has(settlement.id)) return;

      const setKey = (settlement.utr || settlement.externalId).toLowerCase();
      const bank = bankByUTR.get(setKey);
      if (bank) matchedRecords.add(bank.id);

      chains.push({ invoice: null, payment: null, settlement, bank });
    });

    // Step D: Unmatched Bank
    bankRecords.forEach(bank => {
      if (matchedRecords.has(bank.id)) return;
      chains.push({ invoice: null, payment: null, settlement: null, bank });
    });

    let fullyReconciled = 0;
    let exceptionsFound = 0;
    let unresolvedExceptions = 0;
    let reconciledAmount = 0;
    let exceptionValue = 0;
    let unresolvedValue = 0;

    const recordsToCreate = chains.map((chain, index) => {
      const { invoice, payment, settlement, bank } = chain;
      
      let chainStatus = 'UNRESOLVED';
      let matchStatus = 'UNMATCHED';
      let difference = 0;
      let notes = '';

      const invoiceAmt = invoice?.amount || 0;
      const paymentAmt = payment?.amount || 0;
      const settlementAmt = settlement?.amount || 0;
      const bankAmt = bank?.amount || 0;

      if (invoice && payment && settlement && bank) {
        const hasAmtDiff = Math.abs(invoiceAmt - paymentAmt) > 0.01 || Math.abs(paymentAmt - settlementAmt) > 50.0;
        if (hasAmtDiff) {
          chainStatus = 'AMOUNT_MISMATCH';
          difference = settlementAmt - paymentAmt;
          notes = `Amount mismatch: Invoice is ₹${invoiceAmt.toLocaleString('en-IN')}, payment is ₹${paymentAmt.toLocaleString('en-IN')}, settlement is ₹${settlementAmt.toLocaleString('en-IN')}.`;
          exceptionValue += Math.abs(difference);
          exceptionsFound++;
        } else {
          chainStatus = 'FULLY_RECONCILED';
          matchStatus = 'MATCHED';
          fullyReconciled++;
          reconciledAmount += invoiceAmt;
        }
      } else if (invoice && !payment) {
        chainStatus = 'PAYMENT_MISSING';
        difference = -invoiceAmt;
        notes = `Payment missing for Invoice ${invoice.externalId}.`;
        unresolvedValue += invoiceAmt;
        unresolvedExceptions++;
      } else if (payment && !settlement) {
        chainStatus = 'SETTLEMENT_MISSING';
        difference = -paymentAmt;
        notes = `Settlement missing for Payment ID ${payment.externalId}.`;
        unresolvedValue += paymentAmt;
        unresolvedExceptions++;
      } else if (settlement && !bank) {
        chainStatus = 'BANK_CREDIT_MISSING';
        difference = -settlementAmt;
        notes = `Bank transaction credit missing for Settlement UTR ${settlement.utr || 'N/A'}.`;
        unresolvedValue += settlementAmt;
        unresolvedExceptions++;
      } else {
        chainStatus = 'UNRESOLVED';
        difference = -(invoiceAmt || paymentAmt || settlementAmt || bankAmt);
        notes = `Incomplete transaction logs chain.`;
        unresolvedValue += Math.abs(difference);
        unresolvedExceptions++;
      }

      if (chainStatus === 'FULLY_RECONCILED' && invoice && bank) {
        const dateDiffDays = Math.abs((bank.transactionDate.getTime() - invoice.transactionDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dateDiffDays > 10) {
          chainStatus = 'TIMING_DIFFERENCE';
          notes = `Timing difference: bank credit completed ${Math.round(dateDiffDays)} days after invoice creation.`;
        }
      }

      let chainSeverity = 'LOW';
      if (Math.abs(difference) > 50000) chainSeverity = 'CRITICAL';
      else if (Math.abs(difference) > 10000) chainSeverity = 'HIGH';
      else if (Math.abs(difference) > 1000) chainSeverity = 'MEDIUM';

      return {
        runId,
        sourceRecordId: invoice?.id || payment?.id || null,
        sourceType: invoice ? 'Invoice' : (payment ? 'Payment' : null),
        targetRecordId: settlement?.id || null,
        targetType: settlement ? 'Settlement' : null,
        sourceAmount: invoiceAmt || paymentAmt,
        targetAmount: settlementAmt,
        difference,
        bankRecordId: bank?.id || null,
        bankAmount: bankAmt,
        bankDifference: bankAmt - settlementAmt,
        matchStatus: matchStatus as any,
        matchType: (matchStatus === 'MATCHED' ? 'EXACT' : 'NONE') as any,
        confidence: matchStatus === 'MATCHED' ? 1.0 : 0.5,
        notes,
        invoiceRecordId: invoice?.id || null,
        paymentRecordId: payment?.id || null,
        settlementRecordId: settlement?.id || null,
        chainStatus,
        chainSeverity
      };
    });

    emitToUser(userId, 'reconciliation.progress', {
      runId,
      statusText: `Saving reconciliation chains to database...`,
      percent: 80,
      processed: totalRecords / 2,
      total: totalRecords
    });

    const chunkSize = 5000;
    for (let i = 0; i < recordsToCreate.length; i += chunkSize) {
      const chunk = recordsToCreate.slice(i, i + chunkSize);
      await prisma.reconciliationRecord.createMany({
        data: chunk
      });
      
      const percent = 80 + Math.round((i / recordsToCreate.length) * 18);
      emitToUser(userId, 'reconciliation.progress', {
        runId,
        statusText: `Ingesting matches... ${i + chunk.length}/${recordsToCreate.length}`,
        percent,
        processed: i + chunk.length,
        total: recordsToCreate.length,
        matches: fullyReconciled,
        exceptions: exceptionsFound + unresolvedExceptions,
        throughput: Math.round((i + chunk.length) / ((Date.now() - startTime) / 1000))
      });
    }

    const badChains = recordsToCreate.filter(c => c.chainStatus !== 'FULLY_RECONCILED');
    if (badChains.length > 0) {
      const insertedRecords = await prisma.reconciliationRecord.findMany({
        where: { runId },
        select: { 
          id: true, 
          invoiceRecordId: true, 
          paymentRecordId: true, 
          settlementRecordId: true,
          bankRecordId: true,
          notes: true, 
          chainSeverity: true, 
          difference: true, 
          chainStatus: true 
        }
      });

      const exceptionsToCreate: any[] = [];
      insertedRecords
        .filter(r => r.chainStatus !== 'FULLY_RECONCILED')
        .forEach(r => {
          const finId = r.invoiceRecordId || r.paymentRecordId || r.settlementRecordId || r.bankRecordId;
          if (finId) {
            exceptionsToCreate.push({
              runId,
              recordId: finId,
              type: r.chainStatus || 'UNRESOLVED',
              severity: r.chainSeverity || 'MEDIUM',
              amount: Math.abs(r.difference),
              description: r.notes || 'Exception flagged during analysis.',
              status: 'OPEN'
            });
          }
        });

      if (exceptionsToCreate.length > 0) {
        await prisma.reconciliationException.createMany({
          data: exceptionsToCreate
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const matchRate = chains.length > 0 ? Number(((fullyReconciled / chains.length) * 100).toFixed(2)) : 100;

    await prisma.reconciliationRun.update({
      where: { id: runId },
      data: {
        status: RunStatus.COMPLETED,
        totalRecords: chains.length,
        recordsProcessed: totalRecords,
        matchedRecords: fullyReconciled,
        exceptionsFound: exceptionsFound + unresolvedExceptions,
        matchRate,
        reconciledAmount,
        unmatchedAmount: exceptionValue,
        pendingAmount: unresolvedValue,
        durationMs,
        completedAt: new Date()
      }
    });

    await logAudit(
      userId,
      undefined,
      'BATCH_RECONCILIATION_COMPLETED',
      `Completed multi-source batch run. Match rate: ${matchRate}%. Exceptions: ${exceptionsFound + unresolvedExceptions}.`,
      'ReconciliationRun',
      runId,
      undefined,
      { totalRecords, matchRate }
    );

    emitToUser(userId, 'reconciliation.progress', {
      runId,
      statusText: 'Reconciliation Completed!',
      percent: 100,
      processed: chains.length,
      total: chains.length,
      matches: fullyReconciled,
      exceptions: exceptionsFound + unresolvedExceptions,
      completed: true
    });

    emitToUser(userId, 'reconciliation.completed', {
      runId,
      matchRate,
      exceptionsFound: exceptionsFound + unresolvedExceptions
    });

    console.log(`Reconciliation engine run successful for Run: ${runId}`);
  } catch (err: any) {
    console.error(`Reconciliation engine run failed for Run: ${runId}`, err);
    await prisma.reconciliationRun.update({
      where: { id: runId },
      data: {
        status: RunStatus.FAILED,
        durationMs: Date.now() - startTime
      }
    });
  }
};

// Retrieve paginated chains for multi-source Control Center
export const getBatchChains = async (req: Request, res: Response): Promise<void> => {
  try {
    const runId = req.params.runId as string;
    const { page = 1, limit = 25, status, search, severity } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { runId };
    
    if (status && status !== 'All') {
      if (status === 'Reconciled') {
        where.chainStatus = 'FULLY_RECONCILED';
      } else if (status === 'Exceptions') {
        where.chainStatus = { notIn: ['FULLY_RECONCILED', 'UNRESOLVED'] };
      } else if (status === 'Missing') {
        where.chainStatus = { in: ['PAYMENT_MISSING', 'SETTLEMENT_MISSING', 'BANK_CREDIT_MISSING'] };
      } else if (status === 'Unresolved') {
        where.chainStatus = 'UNRESOLVED';
      } else {
        where.chainStatus = status as string;
      }
    }

    if (severity) {
      where.chainSeverity = severity as string;
    }

    if (search) {
      const searchStr = String(search).toLowerCase();
      where.OR = [
        { notes: { contains: searchStr, mode: 'insensitive' } },
        { invoiceRecordId: { contains: searchStr, mode: 'insensitive' } },
        { paymentRecordId: { contains: searchStr, mode: 'insensitive' } },
        { settlementRecordId: { contains: searchStr, mode: 'insensitive' } },
        { bankRecordId: { contains: searchStr, mode: 'insensitive' } }
      ];
    }

    const [records, total] = await prisma.$transaction([
      prisma.reconciliationRecord.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'asc' }
      }),
      prisma.reconciliationRecord.count({ where })
    ]);

    const financialRecordIds = new Set<string>();
    records.forEach(rec => {
      if (rec.invoiceRecordId) financialRecordIds.add(rec.invoiceRecordId);
      if (rec.paymentRecordId) financialRecordIds.add(rec.paymentRecordId);
      if (rec.settlementRecordId) financialRecordIds.add(rec.settlementRecordId);
      if (rec.bankRecordId) financialRecordIds.add(rec.bankRecordId);
    });

    const [financialRecords, exceptions] = await prisma.$transaction([
      prisma.financialRecord.findMany({
        where: {
          id: { in: Array.from(financialRecordIds) }
        }
      }),
      prisma.reconciliationException.findMany({
        where: { runId }
      })
    ]);

    const frMap = new Map(financialRecords.map(r => [r.id, r]));
    const exceptionMap = new Map(exceptions.map(e => [e.recordId, e]));

    const chains = records.map(rec => {
      const invoice = rec.invoiceRecordId ? frMap.get(rec.invoiceRecordId) : null;
      const payment = rec.paymentRecordId ? frMap.get(rec.paymentRecordId) : null;
      const settlement = rec.settlementRecordId ? frMap.get(rec.settlementRecordId) : null;
      const bank = rec.bankRecordId ? frMap.get(rec.bankRecordId) : null;
      
      const exception = (rec.invoiceRecordId && exceptionMap.get(rec.invoiceRecordId)) ||
                        (rec.paymentRecordId && exceptionMap.get(rec.paymentRecordId)) ||
                        (rec.settlementRecordId && exceptionMap.get(rec.settlementRecordId)) ||
                        (rec.bankRecordId && exceptionMap.get(rec.bankRecordId)) || null;

      return {
        id: rec.id,
        invoice,
        payment,
        settlement,
        bank,
        difference: rec.difference,
        status: rec.chainStatus,
        severity: rec.chainSeverity,
        confidence: rec.confidence || 0.5,
        notes: rec.notes,
        exceptionId: exception ? exception.id : null
      };
    });

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: chains,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Failed to get batch chains:', error);
    res.status(500).json({ success: false, message: 'Internal server error fetching transaction chains.' });
  }
};
