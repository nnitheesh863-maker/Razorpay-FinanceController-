import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';

export const getSettlements = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 25,
      status,
      search,
      sortBy = 'settlementDate',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) where.status = status as string;

    if (search) {
      where.OR = [
        { id: { contains: search as string, mode: 'insensitive' } },
        { gatewayReference: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [settlements, total] = await prisma.$transaction([
      prisma.settlement.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        include: {
          _count: { select: { transactions: true } }
        }
      }),
      prisma.settlement.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    // Add difference reporting (expected - actual) in the response array
    const dataWithDifference = settlements.map(settlement => {
      const difference = settlement.expectedAmount - settlement.settledAmount;
      return {
        ...settlement,
        difference: Number(difference.toFixed(2))
      };
    });

    res.status(200).json({
      success: true,
      data: dataWithDifference,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Failed to get settlements:', error);
    res.status(500).json({ success: false, message: 'Internal server error while loading settlements.' });
  }
};

export const getSettlementById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: {
        transactions: {
          include: {
            payment: true
          }
        }
      }
    });

    if (!settlement) {
      res.status(404).json({ success: false, message: 'Settlement record not found.' });
      return;
    }

    const difference = settlement.expectedAmount - settlement.settledAmount;

    res.status(200).json({
      success: true,
      data: {
        ...settlement,
        difference: Number(difference.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Failed to get settlement details:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const createSettlement = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      settlementDate,
      expectedAmount,
      settledAmount,
      fees = 0,
      currency = 'INR',
      gatewayReference,
      status = 'SETTLED',
      transactionIds = []
    } = req.body;

    if (!settlementDate || expectedAmount === undefined || settledAmount === undefined) {
      res.status(400).json({ success: false, message: 'Settlement Date, Expected Amount, and Settled Amount are required.' });
      return;
    }

    // Check uniqueness of gateway reference
    if (gatewayReference) {
      const existing = await prisma.settlement.findUnique({ where: { gatewayReference } });
      if (existing) {
        res.status(400).json({ success: false, message: `Settlement gateway reference '${gatewayReference}' already exists.` });
        return;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.create({
        data: {
          settlementDate: new Date(settlementDate),
          expectedAmount: Number(expectedAmount),
          settledAmount: Number(settledAmount),
          fees: Number(fees),
          currency,
          gatewayReference: gatewayReference || null,
          status
        }
      });

      // Link transactions if specified
      if (transactionIds.length > 0) {
        await tx.transaction.updateMany({
          where: { id: { in: transactionIds } },
          data: { settlementId: settlement.id }
        });
      }

      return settlement;
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'SETTLEMENT_CREATE',
      { settlementId: result.id, gatewayReference, settledAmount }
    );

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Failed to create settlement:', error);
    res.status(500).json({ success: false, message: 'Internal server error while creating settlement record.' });
  }
};

export const updateSettlement = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    const existing = await prisma.settlement.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Settlement record not found.' });
      return;
    }

    const updateData: any = {};
    if (data.settlementDate) updateData.settlementDate = new Date(data.settlementDate);
    if (data.expectedAmount !== undefined) updateData.expectedAmount = Number(data.expectedAmount);
    if (data.settledAmount !== undefined) updateData.settledAmount = Number(data.settledAmount);
    if (data.fees !== undefined) updateData.fees = Number(data.fees);
    if (data.currency) updateData.currency = data.currency;
    if (data.gatewayReference !== undefined) updateData.gatewayReference = data.gatewayReference;
    if (data.status) updateData.status = data.status;

    const settlement = await prisma.settlement.update({
      where: { id },
      data: updateData
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'SETTLEMENT_UPDATE',
      { settlementId: id }
    );

    res.status(200).json({
      success: true,
      data: settlement
    });
  } catch (error) {
    console.error('Failed to edit settlement:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const linkTransactionsToSettlement = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { transactionIds } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds)) {
      res.status(400).json({ success: false, message: 'An array of transactionIds is required.' });
      return;
    }

    const existing = await prisma.settlement.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Settlement record not found.' });
      return;
    }

    await prisma.transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: { settlementId: id }
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'SETTLEMENT_LINK_TRANSACTIONS',
      { settlementId: id, count: transactionIds.length }
    );

    res.status(200).json({
      success: true,
      message: `${transactionIds.length} transactions linked to settlement successfully.`
    });
  } catch (error) {
    console.error('Failed to link transactions to settlement:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
