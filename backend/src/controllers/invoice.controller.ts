import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Zod validation schemas
const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  tax: z.number().nonnegative('Tax must be non-negative').default(0),
  discount: z.number().nonnegative('Discount must be non-negative').default(0)
});

const createInvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  referenceNumber: z.string().optional().nullable(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerId: z.string().optional().nullable(),
  issueDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()),
  currency: z.string().min(3).max(3).default('INR'),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required')
});

const updateInvoiceSchema = z.object({
  referenceNumber: z.string().optional().nullable(),
  customerName: z.string().optional(),
  customerId: z.string().optional().nullable(),
  issueDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
  currency: z.string().min(3).max(3).optional(),
  lineItems: z.array(lineItemSchema).optional()
});

const calculateInvoiceTotals = (lineItems: Array<{ description: string; quantity: number; unitPrice: number; tax: number; discount: number }>) => {
  let subtotal = 0;
  let tax = 0;
  let discount = 0;
  
  const processedItems = lineItems.map(item => {
    const qty = item.quantity;
    const price = item.unitPrice;
    const itemTax = item.tax || 0;
    const itemDiscount = item.discount || 0;
    const itemSubtotal = qty * price;
    const lineTotal = itemSubtotal + itemTax - itemDiscount;

    subtotal += itemSubtotal;
    tax += itemTax;
    discount += itemDiscount;

    return {
      description: item.description,
      quantity: qty,
      unitPrice: price,
      tax: itemTax,
      discount: itemDiscount,
      lineTotal
    };
  });

  const totalAmount = subtotal + tax - discount;

  return {
    subtotal,
    tax,
    discount,
    totalAmount,
    processedItems
  };
};

export const getInvoices = async (req: Request, res: Response): Promise<void> => {
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

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: id as string },
      include: {
        lineItems: true,
      }
    });

    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    const payments = await prisma.payment.findMany({
      where: { invoiceId: id as string }
    });

    res.status(200).json({ 
      data: {
        ...invoice,
        payments
      } 
    });
  } catch (error) {
    console.error('Error fetching invoice by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInvoiceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const [totals, statusGroup, paymentStatusGroup] = await Promise.all([
      prisma.invoice.aggregate({
        _count: { id: true },
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceDue: true
        }
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.invoice.groupBy({
        by: ['paymentStatus'],
        _count: { id: true }
      })
    ]);

    const statusCounts = statusGroup.reduce((acc: any, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, { DRAFT: 0, ISSUED: 0, SENT: 0, PAID: 0, PARTIALLY_PAID: 0, OVERDUE: 0, CANCELLED: 0 });

    const paymentStatusCounts = paymentStatusGroup.reduce((acc: any, curr) => {
      acc[curr.paymentStatus] = curr._count.id;
      return acc;
    }, { UNPAID: 0, PARTIALLY_PAID: 0, PAID: 0, OVERDUE: 0 });

    res.status(200).json({
      data: {
        totalInvoices: totals._count.id || 0,
        totalInvoiced: totals._sum.totalAmount || 0,
        paid: totals._sum.paidAmount || 0,
        outstanding: totals._sum.balanceDue || 0,
        statusBreakdown: statusCounts,
        paymentStatusBreakdown: paymentStatusCounts
      }
    });
  } catch (error) {
    console.error('Error fetching invoice summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid data', errors: parsed.error.issues });
      return;
    }

    const { invoiceNumber, lineItems, ...invoiceData } = parsed.data;

    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber) {
      const count = await prisma.invoice.count();
      finalInvoiceNumber = `INV-2026-${String(1000 + count + 1).padStart(6, '0')}`;
    }

    const exists = await prisma.invoice.findUnique({
      where: { invoiceNumber: finalInvoiceNumber }
    });
    if (exists) {
      res.status(400).json({ success: false, message: 'Invoice number already exists.' });
      return;
    }

    const totals = calculateInvoiceTotals(lineItems);

    const result = await prisma.$transaction(async (tx) => {
      return await tx.invoice.create({
        data: {
          ...invoiceData,
          invoiceNumber: finalInvoiceNumber as string,
          subtotal: totals.subtotal,
          tax: totals.tax,
          discount: totals.discount,
          totalAmount: totals.totalAmount,
          balanceDue: totals.totalAmount,
          status: 'DRAFT',
          paymentStatus: 'UNPAID',
          issueDate: new Date(invoiceData.issueDate),
          dueDate: new Date(invoiceData.dueDate),
          lineItems: {
            create: totals.processedItems
          }
        },
        include: {
          lineItems: true
        }
      });
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid data', errors: parsed.error.issues });
      return;
    }

    const existing = await prisma.invoice.findUnique({
      where: { id: id as string }
    });

    if (!existing) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    if (existing.status !== 'DRAFT') {
      res.status(400).json({ success: false, message: 'Only draft invoices can be updated.' });
      return;
    }

    const { lineItems, ...invoiceData } = parsed.data;

    let totals = {
      subtotal: existing.subtotal,
      tax: existing.tax,
      discount: existing.discount,
      totalAmount: existing.totalAmount,
      processedItems: [] as any[]
    };

    if (lineItems) {
      totals = calculateInvoiceTotals(lineItems);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (lineItems) {
        await tx.invoiceLineItem.deleteMany({
          where: { invoiceId: id as string }
        });
      }

      const updatePayload: Prisma.InvoiceUpdateInput = {
        ...invoiceData,
        issueDate: invoiceData.issueDate ? new Date(invoiceData.issueDate) : undefined,
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
        subtotal: lineItems ? totals.subtotal : undefined,
        tax: lineItems ? totals.tax : undefined,
        discount: lineItems ? totals.discount : undefined,
        totalAmount: lineItems ? totals.totalAmount : undefined,
        balanceDue: lineItems ? totals.totalAmount - existing.paidAmount : undefined,
      };

      if (lineItems) {
        updatePayload.lineItems = {
          create: totals.processedItems
        };
      }

      return await tx.invoice.update({
        where: { id: id as string },
        data: updatePayload,
        include: {
          lineItems: true
        }
      });
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.invoice.findUnique({
      where: { id: id as string }
    });

    if (!existing) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    if (existing.status !== 'DRAFT') {
      res.status(400).json({ 
        success: false, 
        message: 'Cannot delete an invoice that has been issued or paid. Use cancellation instead.' 
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId: id as string }
      });
      await tx.invoice.delete({
        where: { id: id as string }
      });
    });

    res.status(200).json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const issueInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.invoice.findUnique({
      where: { id: id as string }
    });

    if (!existing) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    if (existing.status !== 'DRAFT') {
      res.status(400).json({ success: false, message: 'Only draft invoices can be issued.' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id: id as string },
      data: {
        status: 'ISSUED',
        paymentStatus: 'UNPAID'
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error issuing invoice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.invoice.findUnique({
      where: { id: id as string }
    });

    if (!existing) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    if (existing.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Invoice is already cancelled.' });
      return;
    }

    if (existing.paidAmount > 0 && req.user?.role !== 'ADMIN') {
      res.status(403).json({ 
        success: false, 
        message: 'Only Administrators have authorization to cancel an invoice with payment history.' 
      });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id: id as string },
      data: {
        status: 'CANCELLED'
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
