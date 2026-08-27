import 'dotenv/config';
import { Role, RunStatus, ExceptionSeverity, ExceptionStatus, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Clearing existing data...');
  // Clean up in reverse dependency order
  await prisma.exception.deleteMany({});
  await prisma.reconciliationRun.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@razorpay.com',
      password: hashedPassword,
      firstName: 'Aditya',
      lastName: 'Sharma',
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@razorpay.com',
      password: hashedPassword,
      firstName: 'Neha',
      lastName: 'Goel',
      role: Role.FINANCE_MANAGER,
    },
  });

  console.log(`Created users: ${admin.email}, ${manager.email}`);

  console.log('Seeding transactions...');
  const now = new Date();
  const transactionsData = [];
  const statuses = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'];
  const methods = ['CARD', 'UPI', 'NETBANKING', 'WALLET', 'BANK_TRANSFER'];

  for (let i = 0; i < 150; i++) {
    const date = new Date();
    date.setDate(now.getDate() - Math.floor(Math.random() * 30));
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amount = parseFloat((Math.random() * 150000 + 500).toFixed(2));
    const type = status === 'REFUNDED' ? 'REFUND' : 'PAYMENT';
    const paymentMethod = methods[Math.floor(Math.random() * methods.length)];

    transactionsData.push({
      amount,
      currency: 'INR',
      status,
      type,
      reference: `ref_${100000 + i}`,
      paymentMethod,
      description: `Payment ref txn_${100000 + i}`,
      createdAt: date,
      createdBy: admin.id,
    });
  }

  await prisma.transaction.createMany({
    data: transactionsData,
  });

  console.log('Seeding invoices...');
  const invoiceStatuses = [InvoiceStatus.PAID, InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE, InvoiceStatus.SENT];
  const customerNames = ['Acme Corp', 'Delta LLC', 'SuperMart Inc', 'CloudTech Ltd', 'Global Retail'];

  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setDate(now.getDate() - Math.floor(Math.random() * 45));
    const dueDate = new Date(date);
    dueDate.setDate(date.getDate() + 30);

    const subtotal = parseFloat((Math.random() * 50000 + 1000).toFixed(2));
    const tax = parseFloat((subtotal * 0.18).toFixed(2));
    const totalAmount = parseFloat((subtotal + tax).toFixed(2));
    const status = invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)];
    
    let paidAmount = 0;
    let paymentStatus = PaymentStatus.UNPAID;

    if (status === InvoiceStatus.PAID) {
      paidAmount = totalAmount;
      paymentStatus = PaymentStatus.PAID;
    } else if (status === InvoiceStatus.OVERDUE) {
      paymentStatus = PaymentStatus.OVERDUE;
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-${1000 + i}`,
        referenceNumber: `REF-${2000 + i}`,
        customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
        customerId: `CUST-${500 + i}`,
        issueDate: date,
        dueDate: dueDate,
        subtotal,
        tax,
        totalAmount,
        paidAmount,
        balanceDue: totalAmount - paidAmount,
        status,
        paymentStatus,
        createdAt: date,
        lineItems: {
          create: [
            {
              description: 'Software Integration Consulting',
              quantity: 1,
              unitPrice: subtotal,
              tax: tax,
              lineTotal: totalAmount,
            }
          ]
        }
      },
    });

    if (status === InvoiceStatus.PAID) {
      // Create corresponding transaction
      const txn = await prisma.transaction.create({
        data: {
          amount: totalAmount,
          currency: 'INR',
          status: 'SUCCESS',
          type: 'PAYMENT',
          reference: `ref_pay_${10000 + i}`,
          paymentMethod: 'UPI',
          invoiceId: invoice.id,
          description: `Payment transaction for invoice ${invoice.invoiceNumber}`,
          createdAt: date,
          createdBy: admin.id,
        }
      });

      // Create corresponding payment
      const payment = await prisma.payment.create({
        data: {
          amount: totalAmount,
          currency: 'INR',
          paymentMethod: 'UPI',
          paymentGateway: 'RAZORPAY',
          gatewayPaymentId: `pay_${100000 + i}`,
          status: 'CAPTURED',
          customerName: invoice.customerName,
          paymentDate: date,
          invoiceId: invoice.id,
          transactionId: txn.id,
          notes: `Payment for invoice ${invoice.invoiceNumber}`,
          createdAt: date,
          createdBy: admin.id,
        }
      });

      // Update the transaction to point to this payment
      await prisma.transaction.update({
        where: { id: txn.id },
        data: { paymentId: payment.id }
      });
    }
  }

  console.log('Seeding reconciliation runs and exceptions...');
  const gateways = ['HDFC Gateway', 'ICICI Gateway', 'Axis Gateway', 'Razorpay Standard'];
  
  for (let i = 0; i < 15; i++) {
    const runDate = new Date();
    runDate.setDate(now.getDate() - (14 - i) * 2); // Spread runs over the last 30 days
    runDate.setHours(10, 0, 0, 0);

    const recordsProcessed = Math.floor(Math.random() * 200) + 100;
    const matchRate = 0.82 + Math.random() * 0.15; // 82% to 97% match rate
    const matchedRecords = Math.floor(recordsProcessed * matchRate);
    const exceptionsFound = recordsProcessed - matchedRecords;

    const reconciledAmount = parseFloat((recordsProcessed * 12500 * matchRate).toFixed(2));
    const unmatchedAmount = parseFloat((exceptionsFound * 12500 * 0.8).toFixed(2));
    const pendingAmount = parseFloat((exceptionsFound * 12500 * 0.2).toFixed(2));

    const run = await prisma.reconciliationRun.create({
      data: {
        source: gateways[Math.floor(Math.random() * gateways.length)],
        recordsProcessed,
        matchedRecords,
        exceptionsFound,
        durationMs: Math.floor(Math.random() * 3000) + 1500,
        status: RunStatus.COMPLETED,
        reconciledAmount,
        unmatchedAmount,
        pendingAmount,
        createdAt: runDate,
      },
    });

    if (exceptionsFound > 0) {
      const exceptionTypes = ['AMOUNT_MISMATCH', 'MISSING_RECORD', 'DUPLICATE'];
      const severities = [ExceptionSeverity.CRITICAL, ExceptionSeverity.HIGH, ExceptionSeverity.MEDIUM, ExceptionSeverity.LOW];
      const exceptionStatuses = [ExceptionStatus.OPEN, ExceptionStatus.UNDER_REVIEW, ExceptionStatus.RESOLVED];

      const numExceptions = Math.min(exceptionsFound, Math.floor(Math.random() * 3) + 1);
      for (let e = 0; e < numExceptions; e++) {
        const type = exceptionTypes[Math.floor(Math.random() * exceptionTypes.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const status = i > 10 
          ? exceptionStatuses[Math.floor(Math.random() * 2)] 
          : exceptionStatuses[2]; 

        await prisma.exception.create({
          data: {
            type,
            amount: parseFloat((Math.random() * 5000 + 100).toFixed(2)),
            severity,
            status,
            description: `${type.replace('_', ' ')} detected during run on ${gateways[Math.floor(Math.random() * gateways.length)]}.`,
            reconciliationRunId: run.id,
            createdAt: runDate,
          },
        });
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
