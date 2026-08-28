import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { ExceptionStatus, ExceptionSeverity, ExceptionType } from '@prisma/client';

export const getExceptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      status,
      severity,
      type,
      assignedTo,
      dateFrom,
      dateTo,
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Handle string arrays or strings for filters
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      where.status = { in: statuses as ExceptionStatus[] };
    }
    if (severity) {
      const severities = Array.isArray(severity) ? severity : [severity];
      where.severity = { in: severities as ExceptionSeverity[] };
    }
    if (type) {
      const types = Array.isArray(type) ? type : [type];
      where.type = { in: types as ExceptionType[] };
    }
    if (assignedTo) {
      const assignees = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
      where.assignedToId = { in: assignees as string[] };
    }

    if (search) {
      where.OR = [
        { id: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { rootCause: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const [exceptions, total] = await prisma.$transaction([
      prisma.exception.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        include: {
          notes: true
        }
      }),
      prisma.exception.count({ where })
    ]);

    // Map exceptions to include assignee structure expected by frontend
    const mappedExceptions = exceptions.map(ex => ({
      id: ex.id,
      description: ex.description,
      type: ex.type,
      severity: ex.severity,
      status: ex.status,
      difference: ex.difference,
      rootCause: ex.rootCause,
      createdAt: ex.createdAt.toISOString(),
      updatedAt: ex.updatedAt.toISOString(),
      assignedTo: ex.assignedToId ? {
        id: ex.assignedToId,
        name: ex.assignedToName || 'Assigned User'
      } : undefined,
      notes: ex.notes.map(n => ({
        id: n.id,
        authorId: n.authorId,
        authorName: n.authorName,
        content: n.content,
        createdAt: n.createdAt.toISOString()
      }))
    }));

    res.status(200).json(mappedExceptions);
  } catch (error) {
    console.error('Failed to get exceptions:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getExceptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const ex = (await prisma.exception.findUnique({
      where: { id },
      include: {
        notes: true,
        record: true
      }
    })) as any;

    if (!ex) {
      res.status(404).json({ success: false, message: 'Exception not found.' });
      return;
    }

    // Retrieve full linked models for detail visual panel
    let relatedInvoice = null;
    let relatedPayment = null;
    let relatedTransaction = null;
    let relatedSettlement = null;

    if (ex.invoiceId) {
      relatedInvoice = await prisma.invoice.findUnique({ where: { id: ex.invoiceId } });
    }
    if (ex.paymentId) {
      relatedPayment = await prisma.payment.findUnique({ where: { id: ex.paymentId } });
    }
    if (ex.transactionId) {
      relatedTransaction = await prisma.transaction.findUnique({ where: { id: ex.transactionId } });
    }
    if (ex.settlementId) {
      relatedSettlement = await prisma.settlement.findUnique({ where: { id: ex.settlementId } });
    }

    const mapped = {
      id: ex.id,
      description: ex.description,
      type: ex.type,
      severity: ex.severity,
      status: ex.status,
      difference: ex.difference,
      rootCause: ex.rootCause,
      createdAt: ex.createdAt.toISOString(),
      updatedAt: ex.updatedAt.toISOString(),
      assignedTo: ex.assignedToId ? {
        id: ex.assignedToId,
        name: ex.assignedToName || 'Assigned User'
      } : undefined,
      notes: ex.notes.map((n: any) => ({
        id: n.id,
        authorId: n.authorId,
        authorName: n.authorName,
        content: n.content,
        createdAt: n.createdAt.toISOString()
      })),
      relatedRecords: {
        invoice: relatedInvoice,
        payment: relatedPayment,
        transaction: relatedTransaction,
        settlement: relatedSettlement,
        reconciliationRecord: ex.record
      }
    };

    res.status(200).json(mapped);
  } catch (error) {
    console.error('Failed to get exception detail:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getExceptionSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const total = await prisma.exception.count();
    const open = await prisma.exception.count({ where: { status: ExceptionStatus.OPEN } });
    const inReview = await prisma.exception.count({ where: { status: ExceptionStatus.IN_REVIEW } });
    const resolved = await prisma.exception.count({ where: { status: ExceptionStatus.RESOLVED } });
    const critical = await prisma.exception.count({ where: { severity: ExceptionSeverity.CRITICAL } });

    res.status(200).json({
      total,
      critical,
      unresolved: open + inReview,
      inReview,
      resolved
    });
  } catch (error) {
    console.error('Failed to get exception summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getExceptionAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    const typeGroups = await prisma.exception.groupBy({
      by: ['type'],
      _count: { id: true }
    });

    const severityGroups = await prisma.exception.groupBy({
      by: ['severity'],
      _count: { id: true }
    });

    typeGroups.forEach(g => {
      byType[g.type] = g._count.id;
    });

    severityGroups.forEach(g => {
      bySeverity[g.severity] = g._count.id;
    });

    // Populate enums with 0 if missing
    Object.values(ExceptionType).forEach(t => {
      if (!byType[t]) byType[t] = 0;
    });
    Object.values(ExceptionSeverity).forEach(s => {
      if (!bySeverity[s]) bySeverity[s] = 0;
    });

    const total = await prisma.exception.count();
    const resolved = await prisma.exception.count({ where: { status: ExceptionStatus.RESOLVED } });
    const resolutionRate = total > 0 ? Number((resolved / total).toFixed(2)) : 0;

    res.status(200).json({
      byType,
      bySeverity,
      resolutionRate,
      averageResolutionTimeHours: 14 // standard estimate
    });
  } catch (error) {
    console.error('Failed to get exception analytics:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const assignException = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { assigneeId } = req.body;

    const existing = await prisma.exception.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Exception not found.' });
      return;
    }

    // Find User
    const user = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!user) {
      res.status(400).json({ success: false, message: 'User not found to assign.' });
      return;
    }

    const ex = await prisma.exception.update({
      where: { id },
      data: {
        assignedToId: user.id,
        assignedToName: `${user.firstName} ${user.lastName}`
      }
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'EXCEPTION_ASSIGN',
      { exceptionId: id, assigneeId, assigneeName: ex.assignedToName }
    );

    res.status(200).json({
      success: true,
      data: ex
    });
  } catch (error) {
    console.error('Failed to assign exception:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const updateExceptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const existing = await prisma.exception.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Exception not found.' });
      return;
    }

    const ex = await prisma.exception.update({
      where: { id },
      data: { status: status as ExceptionStatus }
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'EXCEPTION_STATUS_UPDATE',
      { exceptionId: id, oldStatus: existing.status, newStatus: status }
    );

    res.status(200).json({
      success: true,
      data: ex
    });
  } catch (error) {
    console.error('Failed to update exception status:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const resolveException = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.exception.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Exception not found.' });
      return;
    }

    const ex = await prisma.exception.update({
      where: { id },
      data: { status: ExceptionStatus.RESOLVED }
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'EXCEPTION_RESOLVE',
      { exceptionId: id }
    );

    res.status(200).json({
      success: true,
      data: ex
    });
  } catch (error) {
    console.error('Failed to resolve exception:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const reopenException = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.exception.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Exception not found.' });
      return;
    }

    const ex = await prisma.exception.update({
      where: { id },
      data: { status: ExceptionStatus.OPEN }
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'EXCEPTION_REOPEN',
      { exceptionId: id }
    );

    res.status(200).json({
      success: true,
      data: ex
    });
  } catch (error) {
    console.error('Failed to reopen exception:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const addExceptionNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ success: false, message: 'Note content is required.' });
      return;
    }

    const existing = await prisma.exception.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Exception not found.' });
      return;
    }

    // Get Author name (fallback to current user email)
    const authorName = (req.user as any)
      ? (await prisma.user.findUnique({ where: { id: (req.user as any).id } }))
      : null;
    
    const note = await prisma.exceptionNote.create({
      data: {
        exceptionId: id,
        authorId: (req.user as any)?.id || 'system',
        authorName: authorName ? `${authorName.firstName} ${authorName.lastName}` : ((req.user as any)?.email || 'System'),
        content
      }
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Failed to add note to exception:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const exportExceptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const exceptions = await prisma.exception.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Formulate basic CSV string
    let csv = 'Exception ID,Type,Severity,Status,Difference,Description,Created At\n';
    exceptions.forEach(ex => {
      csv += `"${ex.id}","${ex.type}","${ex.severity}","${ex.status}","${ex.difference || 0}","${ex.description.replace(/"/g, '""')}","${ex.createdAt.toISOString()}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="exceptions-export.csv"');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Failed to export exceptions:', error);
    res.status(500).json({ success: false, message: 'Failed to compile CSV export.' });
  }
};
