import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { RunStatus, MatchStatus, MatchType, ExceptionStatus, ExceptionSeverity, ExceptionType } from '@prisma/client';

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
  
  try {
    const { source = 'Payments', target = 'Settlements', startDate, endDate } = req.body;

    // 1. Create running job
    const run = await prisma.reconciliationRun.create({
      data: {
        source,
        target,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: RunStatus.RUNNING
      }
    });

    // Date filters for queries
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    // 2. Query source records (Payments)
    const payments = await prisma.payment.findMany({
      where: {
        ...dateFilter,
        status: 'CAPTURED'
      }
    });

    // 3. Query target records (Settlements)
    const settlements = await prisma.settlement.findMany({
      where: dateFilter,
      include: {
        transactions: true
      }
    });

    let recordsProcessed = 0;
    let matchedRecords = 0;
    let exceptionsFound = 0;
    let reconciledAmount = 0;
    let unmatchedAmount = 0;
    let pendingAmount = 0;

    const matchedPaymentIds = new Set<string>();
    const matchedSettlementIds = new Set<string>();

    const reconciliationRecordsToCreate: any[] = [];
    const exceptionsToCreate: any[] = [];

    // --- RULE A: Match Payments with Settlements ---
    for (const payment of payments) {
      recordsProcessed++;

      // Try matching by:
      // 1. payment.gatewayPaymentId === settlement.gatewayReference
      // 2. or settlement contains a linked transaction matching payment.gatewayPaymentId
      let matchingSettlement = settlements.find(set => 
        (payment.gatewayPaymentId && set.gatewayReference && payment.gatewayPaymentId === set.gatewayReference) ||
        set.transactions.some(tx => tx.paymentId === payment.id || (payment.gatewayPaymentId && tx.reference === payment.gatewayPaymentId))
      );

      if (matchingSettlement) {
        matchedPaymentIds.add(payment.id);
        matchedSettlementIds.add(matchingSettlement.id);

        const expected = payment.amount;
        const actual = matchingSettlement.settledAmount;
        const diff = expected - actual;

        // Account for Gateway Fee or TDS deductions
        const isMatched = Math.abs(diff) === 0 || Math.abs(diff - matchingSettlement.fees) < 0.01;

        if (isMatched) {
          matchedRecords++;
          reconciledAmount += expected;
          
          reconciliationRecordsToCreate.push({
            runId: run.id,
            sourceRecordId: payment.id,
            sourceType: 'Payment',
            targetRecordId: matchingSettlement.id,
            targetType: 'Settlement',
            sourceAmount: expected,
            targetAmount: actual,
            difference: diff,
            matchStatus: MatchStatus.MATCHED,
            matchType: MatchType.EXACT,
            confidence: 1.0,
            notes: `Successfully reconciled. Reference match: ${payment.gatewayPaymentId || payment.id}`
          });
        } else {
          // Amount Mismatch Exception
          exceptionsFound++;
          unmatchedAmount += Math.abs(diff);

          reconciliationRecordsToCreate.push({
            runId: run.id,
            sourceRecordId: payment.id,
            sourceType: 'Payment',
            targetRecordId: matchingSettlement.id,
            targetType: 'Settlement',
            sourceAmount: expected,
            targetAmount: actual,
            difference: diff,
            matchStatus: MatchStatus.EXCEPTION,
            matchType: MatchType.PARTIAL,
            confidence: 0.7,
            notes: `Discrepancy: Amount Mismatch. Expected ₹${expected}, Settled ₹${actual}. Diff ₹${diff}`
          });
        }
      } else {
        // Missing Settlement Exception (Payment captured, but no settlement payout)
        exceptionsFound++;
        unmatchedAmount += payment.amount;

        reconciliationRecordsToCreate.push({
          runId: run.id,
          sourceRecordId: payment.id,
          sourceType: 'Payment',
          targetRecordId: null,
          targetType: 'Settlement',
          sourceAmount: payment.amount,
          targetAmount: 0,
          difference: payment.amount,
          matchStatus: MatchStatus.EXCEPTION,
          matchType: MatchType.NONE,
          confidence: 0,
          notes: `Exception: Missing corresponding settlement record for Payment ${payment.gatewayPaymentId || payment.id}`
        });
      }
    }

    // --- RULE B: Unmatched Settlements (Settlement logged, but no Payment captured) ---
    for (const settlement of settlements) {
      if (!matchedSettlementIds.has(settlement.id)) {
        recordsProcessed++;
        exceptionsFound++;
        pendingAmount += settlement.settledAmount;

        reconciliationRecordsToCreate.push({
          runId: run.id,
          sourceRecordId: null,
          sourceType: 'Payment',
          targetRecordId: settlement.id,
          targetType: 'Settlement',
          sourceAmount: 0,
          targetAmount: settlement.settledAmount,
          difference: -settlement.settledAmount,
          matchStatus: MatchStatus.EXCEPTION,
          matchType: MatchType.NONE,
          confidence: 0,
          notes: `Exception: Missing captured Payment for Settlement payout ${settlement.gatewayReference || settlement.id}`
        });
      }
    }

    // 4. Save reconciliation records and exceptions in transactions
    await prisma.$transaction(async (tx) => {
      for (const recData of reconciliationRecordsToCreate) {
        const createdRecord = await tx.reconciliationRecord.create({
          data: recData
        });

        // Create associated Exception if status is EXCEPTION
        if (recData.matchStatus === MatchStatus.EXCEPTION) {
          let exType: ExceptionType = ExceptionType.UNKNOWN;
          let exDesc = recData.notes;
          let severity: ExceptionSeverity = ExceptionSeverity.MEDIUM;

          if (recData.matchType === MatchType.PARTIAL) {
            exType = ExceptionType.AMOUNT_MISMATCH;
            severity = ExceptionSeverity.HIGH;
          } else if (recData.matchType === MatchType.NONE && recData.sourceRecordId) {
            exType = ExceptionType.MISSING_RECORD;
            exDesc = `Settlement payout missing for Payment Reference ${recData.sourceRecordId}`;
          } else if (recData.matchType === MatchType.NONE && recData.targetRecordId) {
            exType = ExceptionType.MISSING_RECORD;
            exDesc = `Captured Payment record missing for Settlement Reference ${recData.targetRecordId}`;
          }

          await tx.exception.create({
            data: {
              description: exDesc,
              type: exType,
              severity,
              status: ExceptionStatus.OPEN,
              difference: recData.difference,
              recordId: createdRecord.id,
              paymentId: recData.sourceRecordId,
              settlementId: recData.targetRecordId
            }
          });
        }
      }
    });

    const durationMs = Date.now() - startTime;
    const matchRate = recordsProcessed > 0 ? Number(((matchedRecords / recordsProcessed) * 100).toFixed(2)) : 100;

    // 5. Update Reconciliation Run with completed stats
    const completedRun = await prisma.reconciliationRun.update({
      where: { id: run.id },
      data: {
        recordsProcessed,
        matchedRecords,
        exceptionsFound,
        unresolvedExceptions: exceptionsFound,
        matchRate,
        durationMs,
        status: RunStatus.COMPLETED,
        reconciledAmount,
        unmatchedAmount,
        pendingAmount
      }
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'RECONCILIATION_RUN',
      { runId: run.id, matchRate, exceptionsFound }
    );

    res.status(200).json({
      success: true,
      data: completedRun
    });
  } catch (error: any) {
    console.error('Failed to run reconciliation process:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while executing reconciliation engine.',
      code: 'RECONCILIATION_RUN_FAILED'
    });
  }
};
