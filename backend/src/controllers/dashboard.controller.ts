import { Request, Response } from 'express';
import { ExceptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    // 1. Get overall metrics across all runs (or maybe we just sum up everything)
    const runsResult = await prisma.reconciliationRun.aggregate({
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

    // 2. Get Open Exceptions count
    const openExceptionsCount = await prisma.exception.count({
      where: {
        status: ExceptionStatus.OPEN
      }
    });

    // 3. Exception breakdown by severity (Open)
    const exceptionsBySeverity = await prisma.exception.groupBy({
      by: ['severity'],
      where: { status: ExceptionStatus.OPEN },
      _count: { id: true },
    });

    const severityBreakdown = exceptionsBySeverity.reduce((acc: any, curr) => {
      acc[curr.severity] = curr._count.id;
      return acc;
    }, { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });

    // 4. Exception breakdown by status
    const exceptionsByStatus = await prisma.exception.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusBreakdown = exceptionsByStatus.reduce((acc: any, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, { OPEN: 0, UNDER_REVIEW: 0, RESOLVED: 0 });

    // 5. Recent Reconciliation Runs
    const recentRuns = await prisma.reconciliationRun.findMany({
      take: 5,
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
      }
    });

    // 6. Exceptions Requiring Attention (Open, sorted by severity and amount)
    const exceptionsAttention = await prisma.exception.findMany({
      where: { status: ExceptionStatus.OPEN },
      take: 5,
      orderBy: [
        { severity: 'asc' }, // Will need correct ordering if it's enum
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

    // Calculations
    const recordsProcessed = runsResult._sum.recordsProcessed || 0;
    const matchedRecords = runsResult._sum.matchedRecords || 0;
    const matchRate = recordsProcessed > 0 
      ? (matchedRecords / recordsProcessed) * 100 
      : 0;
    
    // Throughput calculation (records / sec)
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
        matchRate: run.recordsProcessed > 0 ? (run.matchedRecords / run.recordsProcessed) * 100 : 0
      })),
      exceptionsAttention,
      aiInsights: null // Placeholder for future AI integration
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
