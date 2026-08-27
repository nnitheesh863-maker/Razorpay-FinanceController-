import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Zod validation schemas
const createTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(3).max(3).default('INR'),
  status: z.enum(['SUCCESS', 'PENDING', 'FAILED', 'CANCELLED']).default('SUCCESS'),
  type: z.enum(['PAYMENT', 'REFUND', 'TRANSFER', 'ADJUSTMENT', 'FEE']),
  reference: z.string().min(1, 'Reference is required'),
  paymentMethod: z.enum(['CARD', 'UPI', 'NETBANKING', 'WALLET', 'BANK_TRANSFER']).optional(),
  invoiceId: z.string().optional().nullable(),
  paymentId: z.string().optional().nullable(),
  description: z.string().optional()
});

const updateTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  currency: z.string().min(3).max(3).optional(),
  status: z.enum(['SUCCESS', 'PENDING', 'FAILED', 'CANCELLED']).optional(),
  type: z.enum(['PAYMENT', 'REFUND', 'TRANSFER', 'ADJUSTMENT', 'FEE']).optional(),
  reference: z.string().optional(),
  paymentMethod: z.enum(['CARD', 'UPI', 'NETBANKING', 'WALLET', 'BANK_TRANSFER']).optional(),
  invoiceId: z.string().optional().nullable(),
  paymentId: z.string().optional().nullable(),
  description: z.string().optional()
});

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 25, 
      status, 
      type,
      paymentMethod,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build the where clause dynamically
    const where: Prisma.TransactionWhereInput = {};

    if (status) {
      where.status = status as string;
    }

    if (type) {
      where.type = type as string;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    if (search) {
      const searchTerm = search as string;
      where.OR = [
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { reference: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc',
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.status(200).json({
      data: transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id: id as string },
    });

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    res.status(200).json({ data: transaction });
  } catch (error) {
    console.error('Error fetching transaction by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTransactionSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const where: Prisma.TransactionWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [totals, statusCounts, typeCounts] = await Promise.all([
      prisma.transaction.aggregate({
        where,
        _count: { id: true },
        _sum: { amount: true }
      }),
      prisma.transaction.groupBy({
        where,
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true }
      }),
      prisma.transaction.groupBy({
        where,
        by: ['type'],
        _count: { id: true }
      })
    ]);

    const statusCountsMap = statusCounts.reduce((acc: any, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, { SUCCESS: 0, PENDING: 0, FAILED: 0, CANCELLED: 0 });

    const successfulVolume = statusCounts.find(c => c.status === 'SUCCESS')?._sum.amount || 0;

    res.status(200).json({
      data: {
        totalTransactions: totals._count.id || 0,
        totalVolume: successfulVolume || 0,
        successfulCount: statusCountsMap.SUCCESS || 0,
        pendingCount: statusCountsMap.PENDING || 0,
        failedCount: statusCountsMap.FAILED || 0,
        statusBreakdown: statusCountsMap
      }
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid transaction parameters', errors: parsed.error.issues });
      return;
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...parsed.data,
        createdBy: req.user?.id
      }
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid transaction parameters', errors: parsed.error.issues });
      return;
    }

    const existing = await prisma.transaction.findUnique({
      where: { id: id as string }
    });

    if (!existing) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    // Business rule: Do not allow modifying crucial financial parameters of successful transactions
    if (existing.status === 'SUCCESS' && (parsed.data.amount !== undefined || parsed.data.currency !== undefined)) {
      res.status(400).json({ 
        success: false, 
        message: 'Cannot update the amount or currency of a successfully completed transaction.' 
      });
      return;
    }

    const updated = await prisma.transaction.update({
      where: { id: id as string },
      data: parsed.data
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findUnique({
      where: { id: id as string }
    });

    if (!existing) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    if (existing.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Transaction is already cancelled.' });
      return;
    }

    // Business rule: Only admin can cancel a successful transaction
    if (existing.status === 'SUCCESS' && req.user?.role !== 'ADMIN') {
      res.status(403).json({ 
        success: false, 
        message: 'Only Administrators have the privilege to cancel a successful transaction.' 
      });
      return;
    }

    const cancelled = await prisma.transaction.update({
      where: { id: id as string },
      data: {
        status: 'CANCELLED'
      }
    });

    res.status(200).json({ success: true, data: cancelled });
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
