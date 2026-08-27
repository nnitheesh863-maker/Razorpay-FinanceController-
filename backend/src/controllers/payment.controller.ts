import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const createPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(3).max(3).default('INR'),
  paymentMethod: z.enum(['CARD', 'UPI', 'NETBANKING', 'WALLET', 'BANK_TRANSFER']),
  paymentGateway: z.string().optional().default('RAZORPAY'),
  gatewayPaymentId: z.string().optional(),
  paymentDate: z.string().or(z.date()).optional(),
  notes: z.string().optional()
});

const refundPaymentSchema = z.object({
  notes: z.string().optional()
});

export const getPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 25, 
      status,
      paymentMethod,
      search,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.PaymentWhereInput = {};

    if (status) {
      where.status = status as string;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod as string;
    }

    if (search) {
      const searchTerm = search as string;
      where.OR = [
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { gatewayPaymentId: { contains: searchTerm, mode: 'insensitive' } },
        { customerName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc',
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.status(200).json({
      data: payments,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: id as string }
    });

    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    res.status(200).json({ data: payment });
  } catch (error) {
    console.error('Error fetching payment by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPaymentSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const [totals, statusGroup, methodGroup] = await Promise.all([
      prisma.payment.aggregate({
        _count: { id: true },
        _sum: { amount: true }
      }),
      prisma.payment.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true }
      }),
      prisma.payment.groupBy({
        by: ['paymentMethod'],
        _count: { id: true }
      })
    ]);

    const statusCounts = statusGroup.reduce((acc: any, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, { CAPTURED: 0, PENDING: 0, FAILED: 0, REFUNDED: 0 });

    const capturedVolume = statusGroup.find(c => c.status === 'CAPTURED')?._sum.amount || 0;

    res.status(200).json({
      data: {
        totalPayments: totals._count.id || 0,
        paymentVolume: capturedVolume || 0,
        capturedCount: statusCounts.CAPTURED || 0,
        pendingCount: statusCounts.PENDING || 0,
        failedCount: statusCounts.FAILED || 0,
        refundedCount: statusCounts.REFUNDED || 0,
        statusBreakdown: statusCounts
      }
    });
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid payment parameters', errors: parsed.error.issues });
      return;
    }

    const { invoiceId, amount, currency, paymentMethod, paymentGateway, gatewayPaymentId, paymentDate, notes } = parsed.data;

    // Retrieve Invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      res.status(404).json({ message: 'Linked Invoice not found' });
      return;
    }

    if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Payments cannot be recorded against draft or cancelled invoices.' });
      return;
    }

    // Validate payment amount against balance due
    if (amount > parseFloat(invoice.balanceDue.toFixed(2))) {
      res.status(400).json({ 
        success: false, 
        message: `Payment amount of ₹${amount} exceeds the outstanding invoice balance of ₹${invoice.balanceDue}.`
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          amount,
          currency,
          paymentMethod,
          paymentGateway,
          gatewayPaymentId: gatewayPaymentId || `pay_${Date.now()}`,
          status: 'CAPTURED',
          customerName: invoice.customerName,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          invoiceId,
          notes,
          createdBy: req.user?.id
        }
      });

      // 2. Update Invoice Totals & Status
      const newPaidAmount = parseFloat((invoice.paidAmount + amount).toFixed(2));
      const newBalanceDue = parseFloat((invoice.totalAmount - newPaidAmount).toFixed(2));
      const newStatus = newBalanceDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';
      const newPaymentStatus = newBalanceDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus as any,
          paymentStatus: newPaymentStatus as any
        }
      });

      // 3. Create Corresponding Transaction
      const transaction = await tx.transaction.create({
        data: {
          amount,
          currency,
          status: 'SUCCESS',
          type: 'PAYMENT',
          reference: gatewayPaymentId || payment.gatewayPaymentId,
          paymentMethod,
          invoiceId,
          paymentId: payment.id,
          description: `Payment recorded against invoice ${invoice.invoiceNumber}`,
          createdBy: req.user?.id
        }
      });

      // 4. Update Payment to point to this Transaction
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          transactionId: transaction.id
        }
      });

      return updatedPayment;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refundPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = refundPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid notes', errors: parsed.error.issues });
      return;
    }

    // Retrieve Payment
    const payment = await prisma.payment.findUnique({
      where: { id: id as string }
    });

    if (!payment) {
      res.status(404).json({ message: 'Payment record not found' });
      return;
    }

    if (payment.status !== 'CAPTURED') {
      res.status(400).json({ success: false, message: 'Only captured payments can be refunded.' });
      return;
    }

    if (!payment.invoiceId) {
      res.status(400).json({ success: false, message: 'Only payments linked to invoices can be refunded through this endpoint.' });
      return;
    }

    // Retrieve Invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: payment.invoiceId }
    });

    if (!invoice) {
      res.status(404).json({ message: 'Linked Invoice not found' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Payment status to REFUNDED
      const updatedPayment = await tx.payment.update({
        where: { id: id as string },
        data: {
          status: 'REFUNDED'
        }
      });

      // 2. Adjust Invoice balances
      const newPaidAmount = parseFloat((invoice.paidAmount - payment.amount).toFixed(2));
      const newBalanceDue = parseFloat((invoice.totalAmount - newPaidAmount).toFixed(2));
      const newStatus = newPaidAmount === 0 ? 'ISSUED' : 'PARTIALLY_PAID';
      const newPaymentStatus = newPaidAmount === 0 ? 'UNPAID' : 'PARTIALLY_PAID';

      await tx.invoice.update({
        where: { id: payment.invoiceId as string },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus as any,
          paymentStatus: newPaymentStatus as any
        }
      });

      // 3. Create Corresponding Refund Transaction
      const transaction = await tx.transaction.create({
        data: {
          amount: payment.amount,
          currency: payment.currency,
          status: 'SUCCESS',
          type: 'REFUND',
          reference: `ref_ref_${payment.gatewayPaymentId || payment.id}`,
          paymentMethod: payment.paymentMethod,
          invoiceId: payment.invoiceId,
          paymentId: payment.id,
          description: `Refund processed for payment ${payment.id}`,
          createdBy: req.user?.id
        }
      });

      // 4. Link refund transaction to payment
      return await tx.payment.update({
        where: { id: payment.id },
        data: {
          transactionId: transaction.id
        }
      });
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
