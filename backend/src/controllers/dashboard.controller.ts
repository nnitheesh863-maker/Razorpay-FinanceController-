import { Request, Response } from 'express';
import { ExceptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    // Build the date filter condition for runs and exceptions
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate as string);
      }
    }

    // Build the date filter condition specifically for transactions
    const transactionFilter: any = {};
    if (startDate || endDate) {
      transactionFilter.createdAt = {};
      if (startDate) {
        transactionFilter.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        transactionFilter.createdAt.lte = new Date(endDate as string);
      }
    }

    // 1. Get transactions metrics
    const [txnSum, txnCount, successfulTxnSum, invoiceStats, paymentStats] = await Promise.all([
      prisma.transaction.aggregate({
        where: transactionFilter,
        _sum: { amount: true }
      }),
      prisma.transaction.count({
        where: transactionFilter
      }),
      prisma.transaction.aggregate({
        where: {
          ...transactionFilter,
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      }),
      prisma.invoice.aggregate({
        where: dateFilter,
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceDue: true
        },
        _count: { id: true }
      }),
      prisma.payment.aggregate({
        where: dateFilter,
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    // 2. Get overall metrics across reconciliation runs
    const runsResult = await prisma.reconciliationRun.aggregate({
      where: dateFilter,
      _sum: {
        recordsProcessed: true,
        matchedRecords: true,
        reconciledAmount: true,
        unmatchedAmount: true,
        pendingAmount: true,
        durationMs: true,
      },
      _count: {
        id: true,
      }
    });

    // 3. Get Open Exceptions count
    const openExceptionsCount = await prisma.exception.count({
      where: {
        ...dateFilter,
        status: ExceptionStatus.OPEN
      }
    });

    // 4. Exception breakdown by severity (Open)
    const exceptionsBySeverity = await prisma.exception.groupBy({
      by: ['severity'],
      where: {
        ...dateFilter,
        status: ExceptionStatus.OPEN
      },
      _count: { id: true },
    });

    const severityBreakdown = exceptionsBySeverity.reduce((acc: any, curr) => {
      acc[curr.severity] = curr._count.id;
      return acc;
    }, { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });

    // 5. Exception breakdown by status
    const exceptionsByStatus = await prisma.exception.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: { id: true },
    });

    const statusBreakdown = exceptionsByStatus.reduce((acc: any, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, { OPEN: 0, UNDER_REVIEW: 0, RESOLVED: 0 });

    // 6. Recent Reconciliation Runs
    const recentRuns = await prisma.reconciliationRun.findMany({
      where: dateFilter,
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        source: true,
        recordsProcessed: true,
        matchedRecords: true,
        exceptionsFound: true,
        durationMs: true,
        status: true,
        reconciledAmount: true,
        unmatchedAmount: true,
        pendingAmount: true
      }
    });

    // 7. Exceptions Requiring Attention (Open, sorted by severity and amount)
    const exceptionsAttention = await prisma.exception.findMany({
      where: {
        ...dateFilter,
        status: ExceptionStatus.OPEN
      },
      take: 5,
      orderBy: [
        { severity: 'asc' }, // Orders by severity enum
        { amount: 'desc' },
      ],
      select: {
        id: true,
        type: true,
        amount: true,
        severity: true,
        status: true,
        createdAt: true,
      }
    });

    // 8. Recent Transactions list
    const recentTransactions = await prisma.transaction.findMany({
      where: transactionFilter,
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        description: true,
        createdAt: true
      }
    });

    // 9. Transaction Volume Chart Data (Grouped daily)
    const allPeriodTxns = await prisma.transaction.findMany({
      where: transactionFilter,
      select: {
        amount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const dailyVolumeMap = new Map<string, { amount: number; count: number }>();
    allPeriodTxns.forEach(txn => {
      const dayStr = txn.createdAt.toISOString().slice(0, 10);
      const existing = dailyVolumeMap.get(dayStr) || { amount: 0, count: 0 };
      dailyVolumeMap.set(dayStr, {
        amount: existing.amount + txn.amount,
        count: existing.count + 1
      });
    });

    const transactionVolumeChart = Array.from(dailyVolumeMap.entries()).map(([date, val]) => ({
      date,
      amount: val.amount,
      count: val.count
    }));

    // 10. Settlement Performance Chart Data (Grouped daily)
    const allRuns = await prisma.reconciliationRun.findMany({
      where: dateFilter,
      select: {
        reconciledAmount: true,
        unmatchedAmount: true,
        pendingAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const dailySettlementMap = new Map<string, { expected: number; settled: number; difference: number }>();
    allRuns.forEach(run => {
      const dayStr = run.createdAt.toISOString().slice(0, 10);
      const existing = dailySettlementMap.get(dayStr) || { expected: 0, settled: 0, difference: 0 };
      const settled = run.reconciledAmount;
      const difference = run.unmatchedAmount;
      const expected = settled + difference + run.pendingAmount;

      dailySettlementMap.set(dayStr, {
        expected: existing.expected + expected,
        settled: existing.settled + settled,
        difference: existing.difference + difference
      });
    });

    const settlementPerformanceChart = Array.from(dailySettlementMap.entries()).map(([date, val]) => ({
      date,
      expected: val.expected,
      settled: val.settled,
      difference: val.difference
    }));

    // Calculations
    const recordsProcessed = runsResult._sum.recordsProcessed || 0;
    const matchedRecords = runsResult._sum.matchedRecords || 0;
    const matchRate = recordsProcessed > 0 
      ? (matchedRecords / recordsProcessed) * 100 
      : 100;
    
    const totalDurationSec = (runsResult._sum.durationMs || 0) / 1000;
    const throughput = totalDurationSec > 0 
      ? recordsProcessed / totalDurationSec 
      : 0;

    const response = {
      metrics: {
        recordsProcessed,
        matchedRecords,
        matchRate,
        openExceptions: openExceptionsCount,
        throughput,
        totalDurationMs: runsResult._sum.durationMs || 0,
        totalTransactionVolume: txnSum._sum.amount || 0,
        totalTransactions: txnCount,
        successfulPayments: successfulTxnSum._sum.amount || 0,
        pendingSettlements: runsResult._sum.pendingAmount || 0,
        reconciliationMatchRate: matchRate,
        totalInvoices: invoiceStats._count.id || 0,
        totalInvoiced: invoiceStats._sum.totalAmount || 0,
        outstandingInvoiced: invoiceStats._sum.balanceDue || 0,
        totalPayments: paymentStats._count.id || 0,
        paymentVolume: paymentStats._sum.amount || 0,
      },
      financialSummary: {
        reconciledAmount: runsResult._sum.reconciledAmount || 0,
        unmatchedAmount: runsResult._sum.unmatchedAmount || 0,
        pendingAmount: runsResult._sum.pendingAmount || 0,
      },
      exceptions: {
        summary: statusBreakdown,
        severityBreakdown: severityBreakdown,
      },
      recentRuns: recentRuns.map(run => ({
        ...run,
        matchRate: run.recordsProcessed > 0 ? (run.matchedRecords / run.recordsProcessed) * 100 : 100
      })),
      exceptionsAttention,
      recentTransactions,
      transactionVolumeChart,
      settlementPerformanceChart,
      aiInsights: null // Optional dynamic loading from frontend
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
