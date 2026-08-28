import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';

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

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) where.status = status as string;
    if (paymentMethod) where.paymentMethod = paymentMethod as string;

    if (search) {
      where.OR = [
        { id: { contains: search as string, mode: 'insensitive' } },
        { gatewayPaymentId: { contains: search as string, mode: 'insensitive' } },
        { customerName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Failed to get payments:', error);
    res.status(500).json({ success: false, message: 'Internal server error while loading payments.' });
  }
};

export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: true,
        transaction: true
      }
    });

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment record not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Failed to get payment detail:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getPaymentSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const agg = await prisma.payment.aggregate({
      _count: { id: true },
      _sum: { amount: true }
    });

    const capturedCount = await prisma.payment.count({ where: { status: 'CAPTURED' } });
    const pendingCount = await prisma.payment.count({ where: { status: 'PENDING' } });
    const failedCount = await prisma.payment.count({ where: { status: 'FAILED' } });
    const refundedCount = await prisma.payment.count({ where: { status: 'REFUNDED' } });

    const statusCounts = await prisma.payment.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const statusBreakdown: Record<string, number> = {};
    statusCounts.forEach(item => {
      statusBreakdown[item.status] = item._count.id;
    });

    res.status(200).json({
      success: true,
      data: {
        totalPayments: agg._count.id || 0,
        paymentVolume: agg._sum.amount || 0,
        capturedCount,
        pendingCount,
        failedCount,
        refundedCount,
        statusBreakdown
      }
    });
  } catch (error) {
    console.error('Failed to get payment summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      invoiceId,
      amount,
      currency = 'INR',
      paymentMethod,
      paymentGateway = 'RAZORPAY',
      gatewayPaymentId,
      status = 'CAPTURED',
      customerName,
      customerEmail,
      paymentDate = new Date(),
      notes
    } = req.body;

    const paymentAmount = Number(amount);

    if (!invoiceId || !paymentAmount || paymentAmount <= 0 || !paymentMethod) {
      res.status(400).json({ success: false, message: 'Invoice ID, valid Amount, and Payment Method are required.' });
      return;
    }

    // Check unique gateway payment ID if provided
    if (gatewayPaymentId) {
      const existingPayment = await prisma.payment.findUnique({
        where: { gatewayPaymentId }
      });
      if (existingPayment) {
        res.status(400).json({ success: false, message: `Payment gateway ID '${gatewayPaymentId}' already registered.` });
        return;
      }
    }

    // 1. Fetch the invoice and validate
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.VOID) {
      res.status(400).json({ success: false, message: 'Cannot record payment against cancelled or void invoices.' });
      return;
    }

    // Validate overpayment
    if (status === 'CAPTURED' && paymentAmount > invoice.balanceDue) {
      res.status(400).json({
        success: false,
        message: `Payment amount ₹${paymentAmount.toLocaleString()} exceeds outstanding balance of ₹${invoice.balanceDue.toLocaleString()}. Overpayments are not supported.`
      });
      return;
    }

    // 2. Perform DB transaction
    const result = await prisma.$transaction(async (tx) => {
      // A. Create the payment record
      const payment = await tx.payment.create({
        data: {
          amount: paymentAmount,
          currency,
          paymentMethod,
          paymentGateway,
          gatewayPaymentId: gatewayPaymentId || null,
          status,
          customerName: customerName || invoice.customerName,
          customerEmail: customerEmail || null,
          paymentDate: new Date(paymentDate),
          invoiceId,
          notes: notes || null,
          createdBy: (req.user as any)?.id
        }
      });

      // B. Create matching transaction in transaction table
      const txn = await tx.transaction.create({
        data: {
          amount: paymentAmount,
          currency,
          status: status === 'CAPTURED' ? 'SUCCESS' : status,
          type: 'PAYMENT',
          reference: gatewayPaymentId || `PAY-${payment.id}`,
          paymentMethod,
          invoiceId,
          paymentId: payment.id,
          description: notes || `Payment captured for invoice ${invoice.invoiceNumber} via ${paymentMethod}`,
          createdBy: (req.user as any)?.id
        }
      });

      // C. Update payment with transaction reference
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { transactionId: txn.id }
      });

      // D. If status is successful, update invoice balances and status
      if (status === 'CAPTURED') {
        const newPaidAmount = invoice.paidAmount + paymentAmount;
        const newBalanceDue = invoice.totalAmount - newPaidAmount;
        
        let newStatus = invoice.status;
        let newPaymentStatus = invoice.paymentStatus;

        if (newBalanceDue <= 0) {
          newStatus = InvoiceStatus.PAID;
          newPaymentStatus = PaymentStatus.PAID;
        } else {
          newStatus = InvoiceStatus.PARTIALLY_PAID;
          newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaidAmount,
            balanceDue: newBalanceDue,
            status: newStatus,
            paymentStatus: newPaymentStatus
          }
        });
      }

      return updatedPayment;
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'PAYMENT_CREATE',
      { paymentId: result.id, invoiceId, amount: paymentAmount, status }
    );

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Failed to record payment transaction:', error);
    res.status(500).json({ success: false, message: 'Internal server error while logging payment transaction.' });
  }
};

export const refundPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body;

    // Fetch the payment
    const payment = (await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true }
    })) as any;

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment record not found.' });
      return;
    }

    if (payment.status !== 'CAPTURED') {
      res.status(400).json({ success: false, message: 'Only captured payments can be refunded.' });
      return;
    }

    const invoice = payment.invoice;
    if (!invoice) {
      res.status(400).json({ success: false, message: 'No associated invoice found for this payment.' });
      return;
    }

    // Run refund inside db transaction
    const result = await prisma.$transaction(async (tx) => {
      // A. Update Payment status
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: { status: 'REFUNDED' }
      });

      // B. Create refund transaction (negative amount)
      await tx.transaction.create({
        data: {
          amount: -payment.amount, // negative representation
          currency: payment.currency,
          status: 'SUCCESS',
          type: 'REFUND',
          reference: `REF-${payment.gatewayPaymentId || payment.id}`,
          paymentMethod: payment.paymentMethod,
          invoiceId: payment.invoiceId,
          paymentId: payment.id,
          description: notes || `Refund processed for payment ${payment.gatewayPaymentId || payment.id}`,
          createdBy: (req.user as any)?.id
        }
      });

      // C. Revert invoice paid balances
      const newPaidAmount = Math.max(0, invoice.paidAmount - payment.amount);
      const newBalanceDue = invoice.totalAmount - newPaidAmount;
      
      let newStatus = invoice.status;
      let newPaymentStatus = invoice.paymentStatus;

      if (newPaidAmount === 0) {
        newStatus = InvoiceStatus.ISSUED;
        newPaymentStatus = PaymentStatus.UNPAID;
      } else {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
        newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus,
          paymentStatus: newPaymentStatus
        }
      });

      return updatedPayment;
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'PAYMENT_REFUND',
      { paymentId: id, amount: payment.amount, invoiceId: payment.invoiceId }
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Failed to refund payment:', error);
    res.status(500).json({ success: false, message: 'Internal server error during refund process.' });
  }
};
