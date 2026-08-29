import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ExceptionStatus, ExceptionSeverity, RunStatus } from '@prisma/client';

export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    // Parse optional date range filters
    let dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate as string);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate as string);
    }

    // 1. Fetch Invoices metrics
    const invoiceAgg = await prisma.invoice.aggregate({
      where: dateFilter,
      _count: { id: true },
      _sum: { totalAmount: true, paidAmount: true, balanceDue: true }
    });

    const totalInvoices = invoiceAgg._count.id || 0;
    const totalInvoiced = invoiceAgg._sum.totalAmount || 0;
    const outstandingInvoiced = invoiceAgg._sum.balanceDue || 0;
    const paidInvoiced = invoiceAgg._sum.paidAmount || 0;

    // 2. Fetch Payments metrics
    const paymentAgg = await prisma.payment.aggregate({
      where: {
        ...dateFilter,
        status: 'CAPTURED'
      },
      _count: { id: true },
      _sum: { amount: true }
    });

    const totalPayments = await prisma.payment.count({ where: dateFilter });
    const successfulPaymentsCount = paymentAgg._count.id || 0;
    const paymentVolume = paymentAgg._sum.amount || 0;

    // 3. Fetch Transactions metrics
    const txAgg = await prisma.transaction.aggregate({
      where: dateFilter,
      _count: { id: true },
      _sum: { amount: true }
    });

    const totalTransactions = txAgg._count.id || 0;
    const totalTransactionVolume = txAgg._sum.amount || 0;

    // 4. Fetch Settlements metrics
    const settlementAgg = await prisma.settlement.aggregate({
      where: dateFilter,
      _count: { id: true },
      _sum: { expectedAmount: true, settledAmount: true, fees: true }
    });

    const totalSettlements = settlementAgg._count.id || 0;
    const settlementExpected = settlementAgg._sum.expectedAmount || 0;
    const settlementActual = settlementAgg._sum.settledAmount || 0;
    const settlementFees = settlementAgg._sum.fees || 0;
    const pendingSettlements = settlementExpected - settlementActual;

    // 5. Reconciliation metrics from the latest COMPLETED run
    const latestRun = await prisma.reconciliationRun.findFirst({
      where: { status: RunStatus.COMPLETED },
      orderBy: { createdAt: 'desc' }
    });

    const recordsProcessed = latestRun ? latestRun.recordsProcessed : 0;

    // Query ReconciliationRecord.matchStatus directly — this is the authoritative source.
    // Using latestRun.matchedRecords caused double-counting because it includes partial matches.
    const fullyMatchedCount = latestRun
      ? await prisma.reconciliationRecord.count({
          where: { runId: latestRun.id, matchStatus: 'MATCHED' }
        })
      : 0;

    const partiallyMatchedCount = latestRun
      ? await prisma.reconciliationRecord.count({
          where: { runId: latestRun.id, matchStatus: 'PARTIAL_MATCH' }
        })
      : 0;

    const unmatchedCount = latestRun
      ? await prisma.reconciliationRecord.count({
          where: { runId: latestRun.id, matchStatus: 'UNMATCHED' }
        })
      : 0;

    // Use only fully-matched records in the match rate calculation
    const matchedRecords = fullyMatchedCount;
    const comparableRecords = recordsProcessed > 0 ? recordsProcessed : (fullyMatchedCount + partiallyMatchedCount + unmatchedCount);
    const matchRate = comparableRecords > 0
      ? Number(((fullyMatchedCount / comparableRecords) * 100).toFixed(2))
      : 0;

    const openExceptionsCount = latestRun
      ? await prisma.exception.count({
          where: { status: ExceptionStatus.OPEN, record: { runId: latestRun.id } }
        })
      : 0;


    // 6. Exception breakdowns
    const openEx = await prisma.exception.count({ where: { status: ExceptionStatus.OPEN } });
    const reviewEx = await prisma.exception.count({ where: { status: ExceptionStatus.IN_REVIEW } });
    const resolvedEx = await prisma.exception.count({ where: { status: ExceptionStatus.RESOLVED } });

    const criticalEx = await prisma.exception.count({ where: { severity: ExceptionSeverity.CRITICAL } });
    const highEx = await prisma.exception.count({ where: { severity: ExceptionSeverity.HIGH } });
    const mediumEx = await prisma.exception.count({ where: { severity: ExceptionSeverity.MEDIUM } });
    const lowEx = await prisma.exception.count({ where: { severity: ExceptionSeverity.LOW } });

    // 7. Recent Items lists
    const recentRuns = await prisma.reconciliationRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const exceptionsAttention = await prisma.exception.findMany({
      where: { status: ExceptionStatus.OPEN },
      orderBy: { severity: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        difference: true,
        severity: true,
        status: true,
        createdAt: true
      }
    });

    const recentTransactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        description: true,
        createdAt: true
      }
    });

    // 8. Generate chart datasets (group by date)
    // Group transactions by date for volume chart (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const chartTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    });

    const txGroupMap: Record<string, { amount: number; count: number }> = {};
    chartTransactions.forEach(tx => {
      const dateStr = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!txGroupMap[dateStr]) {
        txGroupMap[dateStr] = { amount: 0, count: 0 };
      }
      txGroupMap[dateStr].amount += tx.amount;
      txGroupMap[dateStr].count += 1;
    });

    const transactionVolumeChart = Object.keys(txGroupMap).map(date => ({
      date,
      amount: Number(txGroupMap[date].amount.toFixed(2)),
      count: txGroupMap[date].count
    }));

    // Group settlements for performance chart (expected vs settled)
    const chartSettlements = await prisma.settlement.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    });

    const settlementPerformanceChart = chartSettlements.map(set => ({
      date: new Date(set.settlementDate).toISOString().split('T')[0],
      expected: set.expectedAmount,
      settled: set.settledAmount,
      difference: set.expectedAmount - set.settledAmount
    }));

    // 9. AI Controller cached/recent insights
    const aiInsightRecord = await prisma.aIAnalysis.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    let aiInsights = null;
    if (aiInsightRecord) {
      try {
        const parsed = JSON.parse(aiInsightRecord.response);
        aiInsights = parsed.summary || parsed;
      } catch {
        aiInsights = aiInsightRecord.response;
      }
    } else {
      // Default initial insight if no query has run
      aiInsights = openExceptionsCount > 0 
        ? `${openExceptionsCount} open exceptions require controller review. Run reconciliation or open AI Agent to analyze mismatch patterns.`
        : "Reconciliation health is stable. 100% matching achieved on the latest run.";
    }

    res.status(200).json({
      success: true,
      metrics: {
        recordsProcessed,
        matchedRecords,
        partiallyMatched: partiallyMatchedCount,
        unmatched: unmatchedCount,
        matchRate,
        openExceptions: openExceptionsCount,
        throughput: recordsProcessed,
        totalDurationMs: latestRun ? latestRun.durationMs : 0,
        totalTransactionVolume,
        totalTransactions,
        successfulPayments: successfulPaymentsCount,
        pendingSettlements,
        reconciliationMatchRate: matchRate,
        totalInvoices,
        totalInvoiced,
        outstandingInvoiced,
        totalPayments,
        paymentVolume
      },
      financialSummary: {
        reconciledAmount: paidInvoiced,
        unmatchedAmount: outstandingInvoiced,
        pendingAmount: pendingSettlements
      },
      exceptions: {
        summary: {
          OPEN: openEx,
          UNDER_REVIEW: reviewEx,
          RESOLVED: resolvedEx
        },
        severityBreakdown: {
          CRITICAL: criticalEx,
          HIGH: highEx,
          MEDIUM: mediumEx,
          LOW: lowEx
        }
      },
      recentRuns: recentRuns.map(run => ({
        id: run.id,
        createdAt: run.createdAt.toISOString(),
        source: run.source,
        recordsProcessed: run.recordsProcessed,
        matchedRecords: run.matchedRecords,
        exceptionsFound: run.exceptionsFound,
        durationMs: run.durationMs,
        status: run.status,
        matchRate: run.matchRate,
        reconciledAmount: run.reconciledAmount,
        unmatchedAmount: run.unmatchedAmount,
        pendingAmount: run.pendingAmount
      })),
      exceptionsAttention: exceptionsAttention.map(ex => ({
        id: ex.id,
        type: ex.type,
        amount: ex.difference || 0,
        severity: ex.severity,
        status: ex.status,
        createdAt: ex.createdAt.toISOString()
      })),
      aiInsights,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        description: tx.description || 'Corporate Transaction',
        createdAt: tx.createdAt.toISOString()
      })),
      transactionVolumeChart,
      settlementPerformanceChart
    });
  } catch (error: any) {
    console.error('Failed to retrieve dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while loading financial controller statistics.',
      code: 'DASHBOARD_AGGREGATION_FAILED'
    });
  }
};
