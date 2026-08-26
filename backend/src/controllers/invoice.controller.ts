import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 25, 
      status,
      paymentStatus,
      search,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.InvoiceWhereInput = {};

    if (status) {
      where.status = status as any;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus as any;
    }

    if (search) {
      const searchTerm = search as string;
      where.OR = [
        { invoiceNumber: { contains: searchTerm, mode: 'insensitive' } },
        { customerName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc',
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.status(200).json({
      data: invoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: id as string },
      include: {
        lineItems: true,
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.status(200).json({ data: invoice });
  } catch (error) {
    console.error('Error fetching invoice by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInvoiceSummary = async (req: Request, res: Response) => {
  try {
    const [totalInvoices, totalAmountResult, statusGroup] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.aggregate({
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.invoice.groupBy({
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
        totalInvoices,
        totalInvoiced: totalAmountResult._sum.totalAmount || 0,
        paid: 0, // Placeholder
        pending: 0, // Placeholder
        overdue: 0, // Placeholder
        statusBreakdown: statusCounts,
      }
    });
  } catch (error) {
    console.error('Error fetching invoice summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
