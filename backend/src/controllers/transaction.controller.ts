import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 25, 
      status, 
      search,
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

    if (search) {
      const searchTerm = search as string;
      where.OR = [
        { id: { contains: searchTerm, mode: 'insensitive' } },
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

export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id: id as string },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.status(200).json({ data: transaction });
  } catch (error) {
    console.error('Error fetching transaction by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTransactionSummary = async (req: Request, res: Response) => {
  try {
    const [totalTransactions, totalAmountResult, statusGroup] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.groupBy({
        by: ['status'],
        _count: { id: true }
      })
    ]);

    const statusCounts = statusGroup.reduce((acc: any, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {});

    res.status(200).json({
      data: {
        totalTransactions,
        totalAmount: totalAmountResult._sum.amount || 0,
        statusBreakdown: statusCounts,
      }
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
