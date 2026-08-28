import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getReportMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalTransactions = await prisma.transaction.count();
    const successfulTransactions = await prisma.transaction.count({ where: { status: 'SUCCESS' } });
    const successRate = totalTransactions > 0 ? Number(((successfulTransactions / totalTransactions) * 100).toFixed(2)) : 100;

    const invoices = await prisma.invoice.aggregate({
      _count: { id: true },
      _sum: { totalAmount: true, paidAmount: true }
    });

    const totalInvoiced = invoices._sum.totalAmount || 0;
    const paidInvoiced = invoices._sum.paidAmount || 0;
    const collectionRate = totalInvoiced > 0 ? Number(((paidInvoiced / totalInvoiced) * 100).toFixed(2)) : 0;

    const exceptions = await prisma.exception.count();
    const resolvedExceptions = await prisma.exception.count({ where: { status: 'RESOLVED' } });
    const unresolvedExceptions = exceptions - resolvedExceptions;

    res.status(200).json({
      success: true,
      data: {
        totalTransactions,
        successRate,
        totalInvoiced,
        paidInvoiced,
        collectionRate,
        exceptionsCount: exceptions,
        unresolvedExceptions
      }
    });
  } catch (error) {
    console.error('Failed to get report metrics:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getReportCharts = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Transaction Volume (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const txs = await prisma.transaction.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      orderBy: { createdAt: 'asc' }
    });

    const monthlyTxMap: Record<string, { amount: number; count: number }> = {};
    txs.forEach(tx => {
      const date = new Date(tx.createdAt);
      const monthStr = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear().toString().slice(-2);
      if (!monthlyTxMap[monthStr]) {
        monthlyTxMap[monthStr] = { amount: 0, count: 0 };
      }
      monthlyTxMap[monthStr].amount += tx.amount;
      monthlyTxMap[monthStr].count += 1;
    });

    const transactionVolumeChart = Object.keys(monthlyTxMap).map(month => ({
      name: month,
      Volume: Number(monthlyTxMap[month].amount.toFixed(2)),
      Transactions: monthlyTxMap[month].count
    }));

    // 2. Settlement comparison (actual vs expected)
    const settlements = await prisma.settlement.findMany({
      take: 12,
      orderBy: { settlementDate: 'asc' }
    });

    const settlementComparisonChart = settlements.map(s => {
      const date = new Date(s.settlementDate);
      return {
        name: date.toLocaleString('default', { month: 'short' }) + ' ' + date.getDate(),
        Expected: s.expectedAmount,
        Settled: s.settledAmount,
        Difference: s.expectedAmount - s.settledAmount
      };
    });

    // 3. Exception breakdown
    const amountMismatchCount = await prisma.exception.count({ where: { type: 'AMOUNT_MISMATCH' } });
    const missingRecordCount = await prisma.exception.count({ where: { type: 'MISSING_RECORD' } });
    const duplicateCount = await prisma.exception.count({ where: { type: 'DUPLICATE' } });
    const unknownCount = await prisma.exception.count({ where: { type: 'UNKNOWN' } });

    const exceptionBreakdownChart = [
      { name: 'Amount Mismatch', value: amountMismatchCount },
      { name: 'Missing Records', value: missingRecordCount },
      { name: 'Duplicate Charges', value: duplicateCount },
      { name: 'Other Issues', value: unknownCount }
    ].filter(item => item.value > 0);

    // 4. Reconciliation match rates over time
    const runs = await prisma.reconciliationRun.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    const reconciliationRateChart = runs.map((run, idx) => ({
      name: `Run #${idx + 1}`,
      'Match Rate (%)': run.matchRate,
      Records: run.recordsProcessed
    }));

    res.status(200).json({
      success: true,
      data: {
        transactionVolumeChart,
        settlementComparisonChart,
        exceptionBreakdownChart,
        reconciliationRateChart
      }
    });
  } catch (error) {
    console.error('Failed to get report charts:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
