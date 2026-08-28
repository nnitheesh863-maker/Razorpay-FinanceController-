import { Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';

// Simple CSV helper to parse key value rows
function parseCSV(content: string): any[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(val => val.trim().replace(/^["']|["']$/g, ''));
    if (row.length !== headers.length) continue;

    const obj: any = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    results.push(obj);
  }

  return results;
}

export const previewImport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No file uploaded.' });
      return;
    }

    if (!type || !['invoices', 'payments', 'transactions', 'settlements'].includes(type)) {
      res.status(400).json({ success: false, message: 'Invalid or missing import type.' });
      return;
    }

    const fileContent = fs.readFileSync(file.path, 'utf-8');
    let rawRecords: any[] = [];

    // Parse CSV or JSON
    if (file.originalname.endsWith('.json') || file.mimetype === 'application/json') {
      try {
        rawRecords = JSON.parse(fileContent);
      } catch {
        res.status(400).json({ success: false, message: 'Invalid JSON file format.' });
        return;
      }
    } else {
      rawRecords = parseCSV(fileContent);
    }

    if (!Array.isArray(rawRecords)) {
      res.status(400).json({ success: false, message: 'Uploaded file must contain an array of records.' });
      return;
    }

    const totalCount = rawRecords.length;
    let duplicateCount = 0;
    let invalidCount = 0;
    const parsedRecords: any[] = [];

    // Perform validation and duplicate check
    for (const record of rawRecords) {
      if (type === 'invoices') {
        const number = record.invoiceNumber || record.invoice_number;
        const name = record.customerName || record.customer_name;
        const amount = Number(record.totalAmount || record.total_amount || record.amount);
        
        if (!number || !name || isNaN(amount)) {
          invalidCount++;
          continue;
        }

        const existing = await prisma.invoice.findUnique({ where: { invoiceNumber: number } });
        if (existing) {
          duplicateCount++;
        }

        parsedRecords.push({
          invoiceNumber: number,
          customerName: name,
          totalAmount: amount,
          issueDate: record.issueDate || record.issue_date || new Date().toISOString(),
          dueDate: record.dueDate || record.due_date || new Date().toISOString(),
          currency: record.currency || 'INR',
          referenceNumber: record.referenceNumber || record.reference_number || null,
          status: record.status || 'ISSUED'
        });
      } else if (type === 'payments') {
        const amount = Number(record.amount);
        const method = record.paymentMethod || record.payment_method;
        const gatewayId = record.gatewayPaymentId || record.gateway_payment_id || record.payment_id;

        if (isNaN(amount) || !method || !gatewayId) {
          invalidCount++;
          continue;
        }

        const existing = await prisma.payment.findUnique({ where: { gatewayPaymentId: gatewayId } });
        if (existing) {
          duplicateCount++;
        }

        parsedRecords.push({
          amount,
          paymentMethod: method,
          gatewayPaymentId: gatewayId,
          status: record.status || 'CAPTURED',
          paymentDate: record.paymentDate || record.payment_date || new Date().toISOString(),
          currency: record.currency || 'INR',
          customerName: record.customerName || record.customer_name || null
        });
      } else if (type === 'transactions') {
        const amount = Number(record.amount);
        const txType = record.type;
        const reference = record.reference;

        if (isNaN(amount) || !txType) {
          invalidCount++;
          continue;
        }

        if (reference) {
          const existing = await prisma.transaction.findUnique({ where: { reference } });
          if (existing) {
            duplicateCount++;
          }
        }

        parsedRecords.push({
          amount,
          type: txType,
          status: record.status || 'SUCCESS',
          reference: reference || null,
          paymentMethod: record.paymentMethod || record.payment_method || null,
          description: record.description || null,
          createdAt: record.createdAt || record.created_at || new Date().toISOString()
        });
      } else if (type === 'settlements') {
        const expected = Number(record.expectedAmount || record.expected_amount || record.amount);
        const settled = Number(record.settledAmount || record.settled_amount || record.amount);
        const ref = record.gatewayReference || record.gateway_reference || record.settlement_id;

        if (isNaN(expected) || isNaN(settled) || !ref) {
          invalidCount++;
          continue;
        }

        const existing = await prisma.settlement.findUnique({ where: { gatewayReference: ref } });
        if (existing) {
          duplicateCount++;
        }

        parsedRecords.push({
          expectedAmount: expected,
          settledAmount: settled,
          fees: Number(record.fees || 0),
          gatewayReference: ref,
          status: record.status || 'SETTLED',
          settlementDate: record.settlementDate || record.settlement_date || new Date().toISOString()
        });
      }
    }

    // Delete temp file after read
    try {
      fs.unlinkSync(file.path);
    } catch {}

    res.status(200).json({
      success: true,
      data: {
        type,
        totalCount,
        validCount: parsedRecords.length,
        duplicateCount,
        invalidCount,
        preview: parsedRecords.slice(0, 10) // Return top 10 items for visual grid table preview
      }
    });
  } catch (error) {
    console.error('Failed to preview import file:', error);
    res.status(500).json({ success: false, message: 'Internal server error while parsing file.' });
  }
};

export const submitImport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, records } = req.body;

    if (!type || !records || !Array.isArray(records) || records.length === 0) {
      res.status(400).json({ success: false, message: 'Valid type and records array are required.' });
      return;
    }

    let importedCount = 0;
    let duplicateCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const record of records) {
        if (type === 'invoices') {
          // Check duplicate
          const existing = await tx.invoice.findUnique({ where: { invoiceNumber: record.invoiceNumber } });
          if (existing) {
            duplicateCount++;
            continue;
          }

          await tx.invoice.create({
            data: {
              invoiceNumber: record.invoiceNumber,
              customerName: record.customerName,
              referenceNumber: record.referenceNumber || null,
              issueDate: new Date(record.issueDate),
              dueDate: new Date(record.dueDate),
              currency: record.currency || 'INR',
              subtotal: record.totalAmount,
              tax: 0,
              discount: 0,
              totalAmount: record.totalAmount,
              paidAmount: record.status === 'PAID' ? record.totalAmount : 0,
              balanceDue: record.status === 'PAID' ? 0 : record.totalAmount,
              status: record.status as InvoiceStatus || InvoiceStatus.ISSUED,
              paymentStatus: record.status === 'PAID' ? PaymentStatus.PAID : PaymentStatus.UNPAID
            }
          });
          importedCount++;
        } else if (type === 'payments') {
          const existing = await tx.payment.findUnique({ where: { gatewayPaymentId: record.gatewayPaymentId } });
          if (existing) {
            duplicateCount++;
            continue;
          }

          await tx.payment.create({
            data: {
              amount: record.amount,
              paymentMethod: record.paymentMethod,
              gatewayPaymentId: record.gatewayPaymentId,
              status: record.status,
              paymentDate: new Date(record.paymentDate),
              currency: record.currency || 'INR',
              customerName: record.customerName || null
            }
          });
          importedCount++;
        } else if (type === 'transactions') {
          if (record.reference) {
            const existing = await tx.transaction.findUnique({ where: { reference: record.reference } });
            if (existing) {
              duplicateCount++;
              continue;
            }
          }

          await tx.transaction.create({
            data: {
              amount: record.amount,
              type: record.type,
              status: record.status,
              reference: record.reference || null,
              paymentMethod: record.paymentMethod || null,
              description: record.description || null,
              createdAt: new Date(record.createdAt)
            }
          });
          importedCount++;
        } else if (type === 'settlements') {
          const existing = await tx.settlement.findUnique({ where: { gatewayReference: record.gatewayReference } });
          if (existing) {
            duplicateCount++;
            continue;
          }

          await tx.settlement.create({
            data: {
              expectedAmount: record.expectedAmount,
              settledAmount: record.settledAmount,
              fees: record.fees || 0,
              gatewayReference: record.gatewayReference,
              status: record.status,
              settlementDate: new Date(record.settlementDate)
            }
          });
          importedCount++;
        }
      }
    });

    await logAudit(
      req.user?.id,
      req.user?.email,
      'DATA_IMPORT',
      { type, count: importedCount, duplicates: duplicateCount }
    );

    res.status(200).json({
      success: true,
      data: {
        type,
        importedCount,
        duplicateCount
      }
    });
  } catch (error) {
    console.error('Failed to submit bulk import:', error);
    res.status(500).json({ success: false, message: 'Internal server error while inserting bulk records.' });
  }
};
