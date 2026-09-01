import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export const getAdminDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Core Top Metrics
    const totalUsers = await prisma.user.count();
    const totalRuns = await prisma.reconciliationRun.count();
    const totalRecords = await prisma.financialRecord.count();
    const openExceptions = await prisma.exception.count({ where: { status: 'OPEN' } });
    
    // Derived overall match rate
    const allRuns = await prisma.reconciliationRun.findMany({ select: { matchRate: true } });
    const overallMatchRate = allRuns.length > 0 
      ? (allRuns.reduce((sum, r) => sum + r.matchRate, 0) / allRuns.length).toFixed(1)
      : "0.0";

    // 1. KPI Metrics
    const metrics = {
      users: totalUsers,
      runs: totalRuns,
      recordsAnalyzed: totalRecords,
      matchRate: `${overallMatchRate}%`,
      openExceptions: openExceptions,
      exceptionsValue: "₹4.82 L" // Mock value
    };

    // 2. Reconciliation Health (Trend)
    const reconciliationHealth = {
      matchRate: `${overallMatchRate}%`,
      target: "95%",
      progress: parseFloat(overallMatchRate) || 0,
      trend: [82, 85, 91, 89, 94.2] // Last 5 runs mock data
    };

    // 3. AI Performance
    const aiPerformance = {
      suggestions: 1240,
      humanConfirmed: 1151,
      humanRejected: 89,
      accuracy: "92.8%",
      autoResolution: "74.2%",
      avgConfidence: "91.3%"
    };

    // 4. Exception Overview
    const exceptionOverview = {
      critical: 12,
      high: 48,
      medium: 127,
      low: 155,
      total: 342,
      affectedValue: "₹4.82 L"
    };

    // 5. Razorpay Status
    const razorpayStatus = {
      status: "Connected",
      lastSync: "01 Sep 2026, 11:05 PM",
      payments: 12842,
      settlements: 184,
      matched: 11940,
      exceptions: 902,
      apiHealth: "99.8%"
    };

    // 6. Who Analyzed What?
    const allRecentRuns = await prisma.reconciliationRun.findMany({
      where: { userId: { not: '' } }
    });

    const userStatsMap: Record<string, { runs: number, records: number, matchRateSum: number }> = {};
    
    allRecentRuns.forEach(run => {
      if (!userStatsMap[run.userId]) {
        userStatsMap[run.userId] = { runs: 0, records: 0, matchRateSum: 0 };
      }
      userStatsMap[run.userId].runs += 1;
      userStatsMap[run.userId].records += run.totalRecords;
      userStatsMap[run.userId].matchRateSum += run.matchRate;
    });

    const whoAnalyzedWhatRaw = await Promise.all(
      Object.keys(userStatsMap).map(async (userId) => {
        let name = 'System';
        try {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user && user.name) name = user.name.split(' ')[0];
        } catch (e) { }
        
        const stats = userStatsMap[userId];
        const avgRate = (stats.matchRateSum / stats.runs).toFixed(1);
        return {
          userName: name,
          runs: stats.runs,
          records: stats.records,
          matchRate: `${avgRate}%`
        };
      })
    );

    const whoAnalyzedWhat = whoAnalyzedWhatRaw.sort((a, b) => b.runs - a.runs);

    // 7. Recent Reconciliation Runs
    const recentRunsData = await prisma.reconciliationRun.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    const recentRuns = await Promise.all(
      recentRunsData.map(async (run) => {
        let user = null;
        if (run.userId && run.userId.trim() !== '') {
          try {
            user = await prisma.user.findUnique({ where: { id: run.userId } });
          } catch (e) {
            // Ignore invalid UUID errors
          }
        }
        return {
          id: `#${run.id.substring(0,4)}`,
          userName: user && user.name ? user.name.split(' ')[0] : 'System',
          records: run.totalRecords,
          matched: run.matchedRecords,
          exceptions: run.exceptions,
          matchRate: `${run.matchRate}%`
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        metrics,
        reconciliationHealth,
        aiPerformance,
        exceptionOverview,
        razorpayStatus,
        whoAnalyzedWhat,
        recentRuns
      }
    });
  } catch (error) {
    console.error('Failed to get admin dashboard metrics:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
