import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      userId, 
      entityType, 
      startDate, 
      endDate 
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (action) where.action = action as string;
    if (userId) where.userId = userId as string;
    if (entityType) where.entityType = entityType as string;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    // Fetch lists for filter dropdowns
    const distinctActions = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action']
    });

    const distinctEntityTypes = await prisma.auditLog.findMany({
      where: { entityType: { not: null } },
      select: { entityType: true },
      distinct: ['entityType']
    });

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: logs,
      filters: {
        actions: distinctActions.map(a => a.action),
        entityTypes: distinctEntityTypes.map(e => e.entityType)
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    res.status(500).json({ success: false, message: 'Internal server error while loading audit logs.' });
  }
};
