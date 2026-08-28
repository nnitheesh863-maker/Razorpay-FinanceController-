import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';

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

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const where: any = {};

    if (status) where.status = status as string;
    if (type) where.type = type as string;
    if (paymentMethod) where.paymentMethod = paymentMethod as string;

    if (search) {
      where.OR = [
        { id: { contains: search as string, mode: 'insensitive' } },
        { reference: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    // Execute query with pagination
    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Failed to get transactions:', error);
    res.status(500).json({ success: false, message: 'Internal server error while retrieving transactions.' });
  }
};

export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        invoice: true,
        payment: true
      }
    });

    if (!transaction) {
      res.status(404).json({ success: false, message: 'Transaction record not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Failed to get transaction detail:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getTransactionSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    // Aggregates
    const agg = await prisma.transaction.aggregate({
      where,
      _count: { id: true },
      _sum: { amount: true }
    });

    const statusCounts = await prisma.transaction.groupBy({
      by: ['status'],
      where,
      _count: { id: true }
    });

    const statusBreakdown: Record<string, number> = {};
    let successfulCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    statusCounts.forEach(item => {
      statusBreakdown[item.status] = item._count.id;
      if (item.status === 'SUCCESS' || item.status === 'CAPTURED') successfulCount += item._count.id;
      else if (item.status === 'PENDING') pendingCount += item._count.id;
      else if (item.status === 'FAILED') failedCount += item._count.id;
    });

    res.status(200).json({
      success: true,
      data: {
        totalTransactions: agg._count.id || 0,
        totalVolume: agg._sum.amount || 0,
        successfulCount,
        pendingCount,
        failedCount,
        statusBreakdown
      }
    });
  } catch (error) {
    console.error('Failed to get transaction summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      amount, 
      currency = 'INR', 
      status = 'SUCCESS', // default to SUCCESS for manual user additions
      type, 
      reference, 
      paymentMethod, 
      invoiceId, 
      paymentId, 
      description,
      // Ledgerly properties
      merchant,
      account,
      category,
      tags,
      receipt,
      date
    } = req.body;

    if (!amount || !type) {
      res.status(400).json({ success: false, message: 'Amount and Type are required fields.' });
      return;
    }

    // If reference is provided, check uniqueness
    if (reference) {
      const existing = await prisma.transaction.findUnique({ where: { reference } });
      if (existing) {
        res.status(400).json({ success: false, message: `Transaction reference '${reference}' already exists.` });
        return;
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: Number(amount),
        currency,
        status,
        type,
        reference: reference || null,
        paymentMethod: paymentMethod || account || null,
        invoiceId: invoiceId || null,
        paymentId: paymentId || null,
        description: description || merchant || null,
        createdBy: (req.user as any)?.id
      }
    });

    // Save extra metadata to Setting table
    try {
      const metadataSetting = await prisma.setting.findUnique({ where: { key: 'transaction_metadata' } });
      const metadata = metadataSetting ? JSON.parse(metadataSetting.value) : {};
      
      metadata[transaction.id] = {
        category: category || 'Needs review',
        tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
        receipt: Number(receipt) || 0,
        merchant: merchant || description || 'Unknown Merchant',
        account: account || paymentMethod || 'Main Checking',
        date: date || new Date().toISOString().split('T')[0]
      };

      await prisma.setting.upsert({
        where: { key: 'transaction_metadata' },
        update: { value: JSON.stringify(metadata) },
        create: { key: 'transaction_metadata', value: JSON.stringify(metadata) }
      });
    } catch (metaErr) {
      console.error('Failed to save transaction metadata:', metaErr);
    }

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'TRANSACTION_CREATE',
      { transactionId: transaction.id, reference, amount }
    );

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error: any) {
    console.error('Failed to create transaction:', error);
    res.status(500).json({ success: false, message: 'Internal server error while generating transaction.' });
  }
};

export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Transaction record not found.' });
      return;
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        status: data.status,
        type: data.type,
        reference: data.reference,
        paymentMethod: data.paymentMethod || data.account,
        invoiceId: data.invoiceId,
        paymentId: data.paymentId,
        description: data.description || data.merchant
      }
    });

    // Update metadata if category, tags, merchant or account are updated
    if (data.category !== undefined || data.tags !== undefined || data.merchant !== undefined || data.account !== undefined) {
      try {
        const metadataSetting = await prisma.setting.findUnique({ where: { key: 'transaction_metadata' } });
        const metadata = metadataSetting ? JSON.parse(metadataSetting.value) : {};
        
        metadata[id] = {
          ...(metadata[id] || {}),
          category: data.category !== undefined ? data.category : (metadata[id]?.category || 'Needs review'),
          tags: data.tags !== undefined ? (typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags) : (metadata[id]?.tags || []),
          merchant: data.merchant !== undefined ? data.merchant : (metadata[id]?.merchant || transaction.description || 'Unknown Merchant'),
          account: data.account !== undefined ? data.account : (metadata[id]?.account || transaction.paymentMethod || 'Main Checking')
        };

        await prisma.setting.upsert({
          where: { key: 'transaction_metadata' },
          update: { value: JSON.stringify(metadata) },
          create: { key: 'transaction_metadata', value: JSON.stringify(metadata) }
        });
      } catch (metaErr) {
        console.error('Failed to update transaction metadata:', metaErr);
      }
    }

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'TRANSACTION_UPDATE',
      { transactionId: id, updates: data }
    );

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Failed to edit transaction:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Transaction record not found.' });
      return;
    }

    await prisma.transaction.delete({ where: { id } });

    // Clean up metadata
    try {
      const metadataSetting = await prisma.setting.findUnique({ where: { key: 'transaction_metadata' } });
      if (metadataSetting) {
        const metadata = JSON.parse(metadataSetting.value);
        if (metadata[id]) {
          delete metadata[id];
          await prisma.setting.update({
            where: { key: 'transaction_metadata' },
            data: { value: JSON.stringify(metadata) }
          });
        }
      }
    } catch (metaErr) {
      console.error('Failed to delete transaction metadata:', metaErr);
    }

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'TRANSACTION_DELETE',
      { transactionId: id, reference: existing.reference }
    );

    res.status(200).json({
      success: true,
      message: 'Transaction record deleted successfully.'
    });
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
