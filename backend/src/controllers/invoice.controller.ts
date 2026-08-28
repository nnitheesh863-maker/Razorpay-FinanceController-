import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';

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

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) where.status = status as InvoiceStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus as PaymentStatus;

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
        { customerName: { contains: search as string, mode: 'insensitive' } },
        { referenceNumber: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [invoices, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        include: {
          lineItems: true
        }
      }),
      prisma.invoice.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Failed to get invoices:', error);
    res.status(500).json({ success: false, message: 'Internal server error while loading invoices.' });
  }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        payments: true,
        transactions: true
      }
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Failed to get invoice detail:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getInvoiceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const agg = await prisma.invoice.aggregate({
      _count: { id: true },
      _sum: { totalAmount: true, paidAmount: true, balanceDue: true }
    });

    const statusCounts = await prisma.invoice.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const paymentStatusCounts = await prisma.invoice.groupBy({
      by: ['paymentStatus'],
      _count: { id: true }
    });

    const statusBreakdown: Record<string, number> = {};
    statusCounts.forEach(item => {
      statusBreakdown[item.status] = item._count.id;
    });

    const paymentStatusBreakdown: Record<string, number> = {};
    paymentStatusCounts.forEach(item => {
      paymentStatusBreakdown[item.paymentStatus] = item._count.id;
    });

    res.status(200).json({
      success: true,
      data: {
        totalInvoices: agg._count.id || 0,
        totalInvoiced: agg._sum.totalAmount || 0,
        paid: agg._sum.paidAmount || 0,
        outstanding: agg._sum.balanceDue || 0,
        statusBreakdown,
        paymentStatusBreakdown
      }
    });
  } catch (error) {
    console.error('Failed to get invoice summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      invoiceNumber,
      referenceNumber,
      customerName,
      customerId,
      issueDate,
      dueDate,
      currency = 'INR',
      lineItems = []
    } = req.body;

    if (!invoiceNumber || !customerName || !issueDate || !dueDate || lineItems.length === 0) {
      res.status(400).json({ success: false, message: 'Missing required parameters.' });
      return;
    }

    // Check unique invoice number
    const existing = await prisma.invoice.findUnique({ where: { invoiceNumber } });
    if (existing) {
      res.status(400).json({ success: false, message: `Invoice number '${invoiceNumber}' already exists.` });
      return;
    }

    // Calculate line items and totals server side
    let calculatedSubtotal = 0;
    let calculatedTax = 0;
    let calculatedDiscount = 0;

    const itemsToCreate = lineItems.map((item: any) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const tax = Number(item.tax || 0);
      const discount = Number(item.discount || 0);
      
      const lineSubtotal = quantity * unitPrice;
      calculatedSubtotal += lineSubtotal;
      calculatedTax += tax;
      calculatedDiscount += discount;

      return {
        description: item.description || 'Line Item Description',
        quantity,
        unitPrice,
        tax,
        discount,
        lineTotal: lineSubtotal + tax - discount
      };
    });

    const totalAmount = calculatedSubtotal + calculatedTax - calculatedDiscount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        referenceNumber: referenceNumber || null,
        customerName,
        customerId: customerId || null,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        currency,
        subtotal: calculatedSubtotal,
        tax: calculatedTax,
        discount: calculatedDiscount,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        status: InvoiceStatus.DRAFT,
        paymentStatus: PaymentStatus.UNPAID,
        lineItems: {
          create: itemsToCreate
        }
      },
      include: {
        lineItems: true
      }
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'INVOICE_CREATE',
      { invoiceId: invoice.id, invoiceNumber, totalAmount }
    );

    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Failed to create invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error while creating invoice.' });
  }
};

export const updateInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      referenceNumber,
      customerName,
      customerId,
      issueDate,
      dueDate,
      currency,
      lineItems
    } = req.body;

    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: true }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    if (existing.status === InvoiceStatus.PAID || existing.status === InvoiceStatus.CANCELLED) {
      res.status(400).json({ success: false, message: 'Completed or Cancelled invoices cannot be modified.' });
      return;
    }

    // Determine details
    let dataUpdate: any = {};
    if (referenceNumber !== undefined) dataUpdate.referenceNumber = referenceNumber;
    if (customerName !== undefined) dataUpdate.customerName = customerName;
    if (customerId !== undefined) dataUpdate.customerId = customerId;
    if (issueDate !== undefined) dataUpdate.issueDate = new Date(issueDate);
    if (dueDate !== undefined) dataUpdate.dueDate = new Date(dueDate);
    if (currency !== undefined) dataUpdate.currency = currency;

    if (lineItems && lineItems.length > 0) {
      // Recalculate totals
      let calculatedSubtotal = 0;
      let calculatedTax = 0;
      let calculatedDiscount = 0;

      const itemsToCreate = lineItems.map((item: any) => {
        const quantity = Number(item.quantity || 1);
        const unitPrice = Number(item.unitPrice || 0);
        const tax = Number(item.tax || 0);
        const discount = Number(item.discount || 0);
        
        const lineSubtotal = quantity * unitPrice;
        calculatedSubtotal += lineSubtotal;
        calculatedTax += tax;
        calculatedDiscount += discount;

        return {
          description: item.description || 'Line Item',
          quantity,
          unitPrice,
          tax,
          discount,
          lineTotal: lineSubtotal + tax - discount
        };
      });

      const totalAmount = calculatedSubtotal + calculatedTax - calculatedDiscount;
      
      dataUpdate.subtotal = calculatedSubtotal;
      dataUpdate.tax = calculatedTax;
      dataUpdate.discount = calculatedDiscount;
      dataUpdate.totalAmount = totalAmount;
      dataUpdate.balanceDue = totalAmount - existing.paidAmount;

      // Update in a transaction by dropping previous line items first
      const invoice = await prisma.$transaction(async (tx) => {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
        return tx.invoice.update({
          where: { id },
          data: {
            ...dataUpdate,
            lineItems: {
              create: itemsToCreate
            }
          },
          include: { lineItems: true }
        });
      });

      await logAudit((req.user as any)?.id, (req.user as any)?.email, 'INVOICE_UPDATE', { invoiceId: id, totalAmount });
      res.status(200).json({ success: true, data: invoice });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: dataUpdate,
      include: { lineItems: true }
    });

    await logAudit((req.user as any)?.id, (req.user as any)?.email, 'INVOICE_UPDATE', { invoiceId: id });
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error('Failed to update invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const deleteInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    if (existing.status !== InvoiceStatus.DRAFT) {
      res.status(400).json({ success: false, message: 'Only Draft invoices can be deleted.' });
      return;
    }

    await prisma.invoice.delete({ where: { id } });

    await logAudit((req.user as any)?.id, (req.user as any)?.email, 'INVOICE_DELETE', { invoiceId: id });
    res.status(200).json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const issueInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    if (existing.status !== InvoiceStatus.DRAFT) {
      res.status(400).json({ success: false, message: 'Invoice has already been issued or processed.' });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.ISSUED
      }
    });

    await logAudit((req.user as any)?.id, (req.user as any)?.email, 'INVOICE_ISSUE', { invoiceId: id });

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Failed to issue invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const cancelInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    if (existing.status === InvoiceStatus.PAID) {
      res.status(400).json({ success: false, message: 'Cannot cancel an invoice that is already paid.' });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
        paymentStatus: PaymentStatus.UNPAID // reset
      }
    });

    await logAudit((req.user as any)?.id, (req.user as any)?.email, 'INVOICE_CANCEL', { invoiceId: id });

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Failed to cancel invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
