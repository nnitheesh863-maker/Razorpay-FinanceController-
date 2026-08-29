import 'dotenv/config';
import { Role, RunStatus, ExceptionSeverity, ExceptionStatus, InvoiceStatus, PaymentStatus, AuthProvider } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Clearing existing data...');
  await prisma.reconciliationMatch.deleteMany({});
  await prisma.reconciliationException.deleteMany({});
  await prisma.financialRecord.deleteMany({});
  await prisma.rawRecord.deleteMany({});
  await prisma.importBatch.deleteMany({});
  await prisma.dataSource.deleteMany({});
  await prisma.exception.deleteMany({});
  await prisma.reconciliationRecord.deleteMany({});
  await prisma.reconciliationRun.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.settlement.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@razorpay.com',
      passwordHash: hashedPassword,
      name: 'Aditya Sharma',
      authProvider: AuthProvider.EMAIL,
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@razorpay.com',
      passwordHash: hashedPassword,
      name: 'Neha Goel',
      authProvider: AuthProvider.EMAIL,
      role: Role.FINANCE_MANAGER,
    },
  });

  console.log(`Created users: ${admin.email}, ${manager.email}`);

  const now = new Date();

  // Helper to generate dates relative to now
  const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(now.getDate() - days);
    return d;
  };

  console.log('Seeding controlled batch of 90 synthetic records for reconciliation testing...');

  // --- CATEGORY 1: 60 PERFECT MATCH CHAINS ---
  // Invoice -> Payment -> Bank Transaction with matching references, names, and amounts.
  const perfectInvoicesCount = 60;
  const customers = ['Acme Corp', 'Delta LLC', 'SuperMart Inc', 'CloudTech Ltd', 'Global Retail', 'HDFC Bank', 'Infosys', 'Reliance Industries', 'Tata Motors'];
  
  for (let i = 1; i <= perfectInvoicesCount; i++) {
    const custName = customers[i % customers.length];
    const amount = 10000 + i * 500;
    const date = daysAgo(10 + (i % 20));

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-PERF-${1000 + i}`,
        referenceNumber: `REF-PERF-${1000 + i}`,
        customerName: custName,
        customerId: `CUST-PERF-${1000 + i}`,
        issueDate: date,
        dueDate: daysAgo(-20),
        subtotal: amount * 0.85,
        tax: amount * 0.15,
        totalAmount: amount,
        paidAmount: amount,
        balanceDue: 0,
        status: InvoiceStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        createdAt: date,
        lineItems: {
          create: [{
            description: 'Standard Operations SLA',
            quantity: 1,
            unitPrice: amount * 0.85,
            tax: amount * 0.15,
            lineTotal: amount
          }]
        }
      }
    });

    const payment = await prisma.payment.create({
      data: {
        amount,
        currency: 'INR',
        paymentMethod: 'UPI',
        paymentGateway: 'RAZORPAY',
        gatewayPaymentId: `pay_perf_${100000 + i}`,
        status: 'CAPTURED',
        customerName: custName,
        paymentDate: date,
        invoiceId: invoice.id,
        notes: `Auto payment for ${invoice.invoiceNumber}`,
        createdAt: date,
        createdBy: admin.id
      }
    });

    const txn = await prisma.transaction.create({
      data: {
        amount,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'PAYMENT',
        reference: `pay_perf_${100000 + i}`, // Match gateway payment ID
        paymentMethod: 'UPI',
        invoiceId: invoice.id,
        paymentId: payment.id,
        description: `Razorpay capture UPI id pay_perf_${100000 + i}`,
        createdAt: date,
        createdBy: admin.id
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: txn.id }
    });
  }

  // --- CATEGORY 2: 10 FUZZY NAME MATCHES ---
  // Invoices have formal name (e.g. "Tata Technologies Pvt Ltd"), but payments/transactions have abbreviation (e.g. "TATA TECH").
  const fuzzyCustomers = [
    { invoiceName: 'Tata Technologies Pvt Ltd', paymentName: 'TATA TECH', amount: 50000 },
    { invoiceName: 'Acme Global Services Corp', paymentName: 'ACME SVCS', amount: 25000 },
    { invoiceName: 'Reliance Industries Limited', paymentName: 'RELIANCE IND', amount: 120000 },
    { invoiceName: 'Infosys Business Solutions', paymentName: 'INFOSYS BIZ', amount: 45000 },
    { invoiceName: 'Wipro Technologies India', paymentName: 'WIPRO TECH', amount: 35000 },
    { invoiceName: 'Mahindra & Mahindra Ltd', paymentName: 'MAHINDRA', amount: 85000 },
    { invoiceName: 'Aditya Birla Group India', paymentName: 'BIRLA GROUP', amount: 65000 },
    { invoiceName: 'HDFC Securities Corporation', paymentName: 'HDFC SEC', amount: 95000 },
    { invoiceName: 'ICICI Lombard Insurance', paymentName: 'ICICI INS', amount: 75000 },
    { invoiceName: 'Bharti Airtel Telecommunications', paymentName: 'AIRTEL BIZ', amount: 110000 }
  ];

  for (let i = 0; i < fuzzyCustomers.length; i++) {
    const item = fuzzyCustomers[i];
    const date = daysAgo(5);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-FUZZY-${1000 + i}`,
        referenceNumber: `REF-FUZZY-${1000 + i}`,
        customerName: item.invoiceName,
        customerId: `CUST-FUZZY-${1000 + i}`,
        issueDate: date,
        dueDate: daysAgo(-25),
        subtotal: item.amount * 0.85,
        tax: item.amount * 0.15,
        totalAmount: item.amount,
        paidAmount: item.amount,
        balanceDue: 0,
        status: InvoiceStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        createdAt: date,
        lineItems: {
          create: [{
            description: 'Fuzzy Match Consulting',
            quantity: 1,
            unitPrice: item.amount * 0.85,
            tax: item.amount * 0.15,
            lineTotal: item.amount
          }]
        }
      }
    });

    const payment = await prisma.payment.create({
      data: {
        amount: item.amount,
        currency: 'INR',
        paymentMethod: 'CARD',
        paymentGateway: 'RAZORPAY',
        gatewayPaymentId: `pay_fuzzy_${100000 + i}`,
        status: 'CAPTURED',
        customerName: item.paymentName, // Abbreviated name
        paymentDate: date,
        invoiceId: invoice.id,
        notes: `Fuzzy customer deposit for ${invoice.invoiceNumber}`,
        createdAt: date,
        createdBy: admin.id
      }
    });

    const txn = await prisma.transaction.create({
      data: {
        amount: item.amount,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'PAYMENT',
        reference: `pay_fuzzy_${100000 + i}`,
        paymentMethod: 'CARD',
        invoiceId: invoice.id,
        paymentId: payment.id,
        description: `Txn from customer ${item.paymentName}`,
        createdAt: date,
        createdBy: admin.id
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: txn.id }
    });
  }

  // --- CATEGORY 3: 5 PARTIAL MATCHES (AMOUNT MISMATCH EXCEPTIONS) ---
  // Invoices say one amount, but payments say slightly less (e.g. gateway fees subtracted, or human error).
  const partialInvoices = [
    { name: 'Reddy Labs', invoiceAmount: 75000, paymentAmount: 74200, reason: 'Gateway fee deducted' },
    { name: 'Aurobindo Group', invoiceAmount: 30000, paymentAmount: 29500, reason: 'Discrepancy' },
    { name: 'Cipla Solutions', invoiceAmount: 90000, paymentAmount: 88500, reason: 'Underpaid by customer' },
    { name: 'Dr Reddys', invoiceAmount: 40000, paymentAmount: 39200, reason: 'TDS deducted' },
    { name: 'Biocon Industries', invoiceAmount: 60000, paymentAmount: 59000, reason: 'Gateway processing fee' }
  ];

  for (let i = 0; i < partialInvoices.length; i++) {
    const item = partialInvoices[i];
    const date = daysAgo(7);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-PART-${1000 + i}`,
        referenceNumber: `REF-PART-${1000 + i}`,
        customerName: item.name,
        customerId: `CUST-PART-${1000 + i}`,
        issueDate: date,
        dueDate: daysAgo(-23),
        subtotal: item.invoiceAmount * 0.85,
        tax: item.invoiceAmount * 0.15,
        totalAmount: item.invoiceAmount,
        paidAmount: item.paymentAmount, // Paid amount is less
        balanceDue: item.invoiceAmount - item.paymentAmount,
        status: InvoiceStatus.ISSUED,
        paymentStatus: PaymentStatus.PARTIALLY_PAID,
        createdAt: date,
        lineItems: {
          create: [{
            description: 'Partial Operations SLA',
            quantity: 1,
            unitPrice: item.invoiceAmount * 0.85,
            tax: item.invoiceAmount * 0.15,
            lineTotal: item.invoiceAmount
          }]
        }
      }
    });

    const payment = await prisma.payment.create({
      data: {
        amount: item.paymentAmount,
        currency: 'INR',
        paymentMethod: 'NETBANKING',
        paymentGateway: 'RAZORPAY',
        gatewayPaymentId: `pay_part_${100000 + i}`,
        status: 'CAPTURED',
        customerName: item.name,
        paymentDate: date,
        invoiceId: invoice.id,
        notes: `Partial payment: ${item.reason}`,
        createdAt: date,
        createdBy: admin.id
      }
    });

    const txn = await prisma.transaction.create({
      data: {
        amount: item.paymentAmount,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'PAYMENT',
        reference: `pay_part_${100000 + i}`,
        paymentMethod: 'NETBANKING',
        invoiceId: invoice.id,
        paymentId: payment.id,
        description: `Partial payout for ${invoice.invoiceNumber}`,
        createdAt: date,
        createdBy: admin.id
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: txn.id }
    });
  }

  // --- CATEGORY 4: 5 DUPLICATE PAYMENTS (DUPLICATE TRANSACTION EXCEPTIONS) ---
  // Single invoice has two separate payments and transactions logged against it with identical values.
  for (let i = 1; i <= 5; i++) {
    const custName = `DuplicateClient-${i}`;
    const amount = 20000;
    const date = daysAgo(6);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-DUP-${1000 + i}`,
        referenceNumber: `REF-DUP-${1000 + i}`,
        customerName: custName,
        customerId: `CUST-DUP-${1000 + i}`,
        issueDate: date,
        dueDate: daysAgo(-24),
        subtotal: amount * 0.85,
        tax: amount * 0.15,
        totalAmount: amount,
        paidAmount: amount,
        balanceDue: 0,
        status: InvoiceStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        createdAt: date,
        lineItems: {
          create: [{
            description: 'Duplicate Billing Test SLA',
            quantity: 1,
            unitPrice: amount * 0.85,
            tax: amount * 0.15,
            lineTotal: amount
          }]
        }
      }
    });

    // Payment 1
    const p1 = await prisma.payment.create({
      data: {
        amount,
        currency: 'INR',
        paymentMethod: 'UPI',
        paymentGateway: 'RAZORPAY',
        gatewayPaymentId: `pay_dup_a_${100000 + i}`,
        status: 'CAPTURED',
        customerName: custName,
        paymentDate: date,
        invoiceId: invoice.id,
        notes: 'First charge successful',
        createdAt: date,
        createdBy: admin.id
      }
    });

    const t1 = await prisma.transaction.create({
      data: {
        amount,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'PAYMENT',
        reference: `pay_dup_a_${100000 + i}`,
        paymentMethod: 'UPI',
        invoiceId: invoice.id,
        paymentId: p1.id,
        description: `Charge copy A for ${invoice.invoiceNumber}`,
        createdAt: date,
        createdBy: admin.id
      }
    });

    await prisma.payment.update({
      where: { id: p1.id },
      data: { transactionId: t1.id }
    });

    // Payment 2 (The Duplicate!)
    const p2 = await prisma.payment.create({
      data: {
        amount,
        currency: 'INR',
        paymentMethod: 'UPI',
        paymentGateway: 'RAZORPAY',
        gatewayPaymentId: `pay_dup_b_${100000 + i}`,
        status: 'CAPTURED',
        customerName: custName,
        paymentDate: date,
        invoiceId: invoice.id,
        notes: 'Second charge successful - Duplicate risk',
        createdAt: date,
        createdBy: admin.id
      }
    });

    const t2 = await prisma.transaction.create({
      data: {
        amount,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'PAYMENT',
        reference: `pay_dup_b_${100000 + i}`,
        paymentMethod: 'UPI',
        invoiceId: invoice.id,
        paymentId: p2.id,
        description: `Charge copy B for ${invoice.invoiceNumber}`,
        createdAt: date,
        createdBy: admin.id
      }
    });

    await prisma.payment.update({
      where: { id: p2.id },
      data: { transactionId: t2.id }
    });
  }

  // --- CATEGORY 5: 5 UNKNOWN TRANSACTIONS (MISSING INVOICE EXCEPTIONS) ---
  // Transactions logged in the ledger/bank, but no corresponding Invoice or Payment exists.
  for (let i = 1; i <= 5; i++) {
    const date = daysAgo(4);
    await prisma.transaction.create({
      data: {
        amount: 8000 * i,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'PAYMENT',
        reference: `pay_unknown_${100000 + i}`,
        paymentMethod: 'BANK_TRANSFER',
        description: `IMPS transfer from UNKNOWN CLIENT REF #${4000 + i}`,
        createdAt: date,
        createdBy: admin.id
      }
    });
  }

  // --- CATEGORY 6: 5 REFUNDS ---
  // Seeding some refund entries to test out reversal tracking
  for (let i = 1; i <= 5; i++) {
    const date = daysAgo(3);
    await prisma.transaction.create({
      data: {
        amount: -5000,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'REFUND',
        reference: `ref_rev_${200000 + i}`,
        paymentMethod: 'CARD',
        description: `Reversal credit to customer card ref_rev_${200000 + i}`,
        createdAt: date,
        createdBy: admin.id
      }
    });
  }

  // --- CATEGORY 7: THREE-WAY RECONCILIATION SYNTHETIC RECORDS (100 TOTAL) ---
  console.log('Seeding Phase 3: Three-way reconciliation records...');

  // Create default DataSource and ImportBatch for stages
  const bankDataSource = await prisma.dataSource.upsert({
    where: { id: 'ds-synthetic-bank' },
    update: {},
    create: {
      id: 'ds-synthetic-bank',
      userId: admin.id,
      name: 'Bank Payouts Import Seed',
      type: 'BANK_TRANSACTION',
      status: 'ACTIVE'
    }
  });

  const bankImportBatch = await prisma.importBatch.create({
    data: {
      dataSourceId: bankDataSource.id,
      fileName: 'synthetic_bank_payouts_aug2026.xlsx',
      fileType: 'XLSX',
      totalRecords: 100,
      validRecords: 100,
      invalidRecords: 0,
      status: 'NORMALIZED'
    }
  });

  const settlementDataSource = await prisma.dataSource.upsert({
    where: { id: 'ds-synthetic-settlements' },
    update: {},
    create: {
      id: 'ds-synthetic-settlements',
      userId: admin.id,
      name: 'Razorpay API Integration',
      type: 'RAZORPAY',
      status: 'ACTIVE'
    }
  });

  const settlementImportBatch = await prisma.importBatch.create({
    data: {
      dataSourceId: settlementDataSource.id,
      fileName: 'Razorpay API Pull (Test Mode)',
      fileType: 'JSON',
      totalRecords: 100,
      validRecords: 100,
      invalidRecords: 0,
      status: 'NORMALIZED'
    }
  });

  const baseDate = new Date('2026-08-20T10:00:00Z');

  // Helper to generate dates relative to base date
  const shiftDays = (date: Date, days: number): Date => {
    const d = new Date(date);
    d.setDate(date.getDate() + days);
    return d;
  };

  // 1. 70 Clean Three-way Matches
  for (let i = 1; i <= 70; i++) {
    const invoiceNum = `INV-3WAY-CLEAN-${1000 + i}`;
    const utrVal = `UTR-CLEAN-${1000 + i}`;
    const grossAmount = 50000;
    const fees = 1000;
    const tax = 180;
    const expectedSettlement = 48820;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNum,
        referenceNumber: `REF-CLEAN-${1000 + i}`,
        customerName: `CleanClient-${i}`,
        issueDate: baseDate,
        dueDate: shiftDays(baseDate, 30),
        subtotal: 42372.88,
        tax: 7627.12,
        totalAmount: grossAmount,
        paidAmount: grossAmount,
        balanceDue: 0,
        status: InvoiceStatus.PAID,
        paymentStatus: PaymentStatus.PAID
      }
    });

    const payment = await prisma.payment.create({
      data: {
        amount: grossAmount,
        currency: 'INR',
        paymentMethod: 'UPI',
        paymentGateway: 'RAZORPAY',
        gatewayPaymentId: `pay_clean_${1000 + i}`,
        status: 'CAPTURED',
        customerName: `CleanClient-${i}`,
        paymentDate: baseDate,
        invoiceId: invoice.id
      }
    });

    const settlement = await prisma.settlement.create({
      data: {
        settlementDate: shiftDays(baseDate, 1),
        expectedAmount: expectedSettlement,
        settledAmount: expectedSettlement,
        fees: fees + tax,
        currency: 'INR',
        gatewayReference: utrVal,
        status: 'PROCESSED'
      }
    });

    const txn = await prisma.transaction.create({
      data: {
        amount: grossAmount,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'PAYMENT',
        reference: `pay_clean_${1000 + i}`,
        paymentId: payment.id,
        settlementId: settlement.id
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: txn.id }
    });

    // Create raw record stage
    const rawBank = await prisma.rawRecord.create({
      data: {
        importBatchId: bankImportBatch.id,
        rowNumber: i,
        rawData: {
          transaction_id: `BANK-TX-CLEAN-${1000 + i}`,
          date: shiftDays(baseDate, 1).toISOString(),
          description: `RAZORPAY SETTLEMENT ${utrVal}`,
          credit: expectedSettlement,
          debit: 0,
          utr: utrVal
        },
        status: 'NORMALIZED'
      }
    });

    // Create normalized bank transaction record
    await prisma.financialRecord.create({
      data: {
        userId: admin.id,
        sourceType: 'BANK_TRANSACTION',
        sourceRecordId: rawBank.id,
        externalId: `BANK-TX-CLEAN-${1000 + i}`,
        recordType: 'BANK_TRANSACTION',
        amount: expectedSettlement,
        currency: 'INR',
        transactionDate: shiftDays(baseDate, 1),
        description: `RAZORPAY SETTLEMENT ${utrVal}`,
        reference: utrVal,
        utr: utrVal,
        creditAmount: expectedSettlement,
        debitAmount: 0,
        status: 'NORMALIZED',
        importBatchId: bankImportBatch.id
      }
    });
  }

  // 2. 10 Timing Differences (August 28 to August 29)
  for (let i = 1; i <= 10; i++) {
    const invoiceNum = `INV-3WAY-TIME-${1000 + i}`;
    const utrVal = `UTR-TIME-${1000 + i}`;
    const grossAmount = 10000;
    const fees = 200;
    const tax = 36;
    const expectedSettlement = 9764;
    const settlementDate = shiftDays(baseDate, 5);
    const bankReceivedDate = shiftDays(baseDate, 6); // 1 day difference

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNum,
        referenceNumber: `REF-TIME-${1000 + i}`,
        customerName: `TimeClient-${i}`,
        issueDate: baseDate,
        dueDate: shiftDays(baseDate, 30),
        subtotal: 8474.58,
        tax: 1525.42,
        totalAmount: grossAmount,
        paidAmount: grossAmount,
        balanceDue: 0,
        status: InvoiceStatus.PAID,
        paymentStatus: PaymentStatus.PAID
      }
    });

    const payment = await prisma.payment.create({
      data: {
        amount: grossAmount,
        currency: 'INR',
        paymentMethod: 'CARD',
        paymentGateway: 'RAZORPAY',
        gatewayPaymentId: `pay_time_${1000 + i}`,
        status: 'CAPTURED',
        customerName: `TimeClient-${i}`,
        paymentDate: baseDate,
        invoiceId: invoice.id
      }
    });

    const settlement = await prisma.settlement.create({
      data: {
        settlementDate: settlementDate,
        expectedAmount: expectedSettlement,
        settledAmount: expectedSettlement,
        fees: fees + tax,
        currency: 'INR',
        gatewayReference: utrVal,
        status: 'PROCESSED'
      }
    });

    const txn = await prisma.transaction.create({
      data: {
        amount: grossAmount,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'PAYMENT',
        reference: `pay_time_${1000 + i}`,
        paymentId: payment.id,
        settlementId: settlement.id
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: txn.id }
    });

    const rawBank = await prisma.rawRecord.create({
      data: {
        importBatchId: bankImportBatch.id,
        rowNumber: 70 + i,
        rawData: {
          transaction_id: `BANK-TX-TIME-${1000 + i}`,
          date: bankReceivedDate.toISOString(),
          description: `RAZORPAY SETTLEMENT ${utrVal}`,
          credit: expectedSettlement,
          debit: 0,
          utr: utrVal
        },
        status: 'NORMALIZED'
      }
    });

    await prisma.financialRecord.create({
      data: {
        userId: admin.id,
        sourceType: 'BANK_TRANSACTION',
        sourceRecordId: rawBank.id,
        externalId: `BANK-TX-TIME-${1000 + i}`,
        recordType: 'BANK_TRANSACTION',
        amount: expectedSettlement,
        currency: 'INR',
        transactionDate: bankReceivedDate,
        description: `RAZORPAY SETTLEMENT ${utrVal}`,
        reference: utrVal,
        utr: utrVal,
        creditAmount: expectedSettlement,
        debitAmount: 0,
        status: 'NORMALIZED',
        importBatchId: bankImportBatch.id
      }
    });
  }

  // 3. 5 Amount Differences
  for (let i = 1; i <= 5; i++) {
    const invoiceNum = `INV-3WAY-DIFF-${1000 + i}`;
    const utrVal = `UTR-DIFF-${1000 + i}`;
    const grossAmount = 40000;
    const expectedSettlement = 39056; // gross minus fees
    const actualBankReceived = 38936; // Difference of 120

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNum,
        referenceNumber: `REF-DIFF-${1000 + i}`,
        customerName: `DiffClient-${i}`,
        issueDate: baseDate,
        dueDate: shiftDays(baseDate, 30),
        subtotal: 33898.31,
        tax: 6101.69,
        totalAmount: grossAmount,
        paidAmount: grossAmount,
        balanceDue: 0,
        status: InvoiceStatus.PAID,
        paymentStatus: PaymentStatus.PAID
      }
    });

    const payment = await prisma.payment.create({
      data: {
        amount: grossAmount,
        currency: 'INR',
        paymentMethod: 'NETBANKING',
        paymentGateway: 'RAZORPAY',
        gatewayPaymentId: `pay_diff_${1000 + i}`,
        status: 'CAPTURED',
        customerName: `DiffClient-${i}`,
        paymentDate: baseDate,
        invoiceId: invoice.id
      }
    });

    const settlement = await prisma.settlement.create({
      data: {
        settlementDate: shiftDays(baseDate, 2),
        expectedAmount: expectedSettlement,
        settledAmount: expectedSettlement,
        fees: 944,
        currency: 'INR',
        gatewayReference: utrVal,
        status: 'PROCESSED'
      }
    });

    const txn = await prisma.transaction.create({
      data: {
        amount: grossAmount,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'PAYMENT',
        reference: `pay_diff_${1000 + i}`,
        paymentId: payment.id,
        settlementId: settlement.id
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: txn.id }
    });

    const rawBank = await prisma.rawRecord.create({
      data: {
        importBatchId: bankImportBatch.id,
        rowNumber: 80 + i,
        rawData: {
          transaction_id: `BANK-TX-DIFF-${1000 + i}`,
          date: shiftDays(baseDate, 2).toISOString(),
          description: `RAZORPAY SETTLEMENT ${utrVal}`,
          credit: actualBankReceived,
          debit: 0,
          utr: utrVal
        },
        status: 'NORMALIZED'
      }
    });

    await prisma.financialRecord.create({
      data: {
        userId: admin.id,
        sourceType: 'BANK_TRANSACTION',
        sourceRecordId: rawBank.id,
        externalId: `BANK-TX-DIFF-${1000 + i}`,
        recordType: 'BANK_TRANSACTION',
        amount: actualBankReceived,
        currency: 'INR',
        transactionDate: shiftDays(baseDate, 2),
        description: `RAZORPAY SETTLEMENT ${utrVal}`,
        reference: utrVal,
        utr: utrVal,
        creditAmount: actualBankReceived,
        debitAmount: 0,
        status: 'NORMALIZED',
        importBatchId: bankImportBatch.id
      }
    });
  }

  // 4. 5 Unmatched Settlements (Settlement exists, but no Bank Payout)
  for (let i = 1; i <= 5; i++) {
    const utrVal = `UTR-UNMATCHED-SET-${1000 + i}`;
    const expectedSettlement = 15000;

    await prisma.settlement.create({
      data: {
        settlementDate: shiftDays(baseDate, 3),
        expectedAmount: expectedSettlement,
        settledAmount: expectedSettlement,
        fees: 300,
        currency: 'INR',
        gatewayReference: utrVal,
        status: 'PROCESSED'
      }
    });
  }

  // 5. 5 Unmatched Bank Transactions (Bank statement contains credits with no matched Settlement)
  for (let i = 1; i <= 5; i++) {
    const utrVal = `UTR-UNMATCHED-BANK-${1000 + i}`;
    const amountVal = 22000;

    const rawBank = await prisma.rawRecord.create({
      data: {
        importBatchId: bankImportBatch.id,
        rowNumber: 85 + i,
        rawData: {
          transaction_id: `BANK-TX-UNMATCHED-${1000 + i}`,
          date: shiftDays(baseDate, 4).toISOString(),
          description: `MISC BANK DEPOSIT ${utrVal}`,
          credit: amountVal,
          debit: 0,
          utr: utrVal
        },
        status: 'NORMALIZED'
      }
    });

    await prisma.financialRecord.create({
      data: {
        userId: admin.id,
        sourceType: 'BANK_TRANSACTION',
        sourceRecordId: rawBank.id,
        externalId: `BANK-TX-UNMATCHED-${1000 + i}`,
        recordType: 'BANK_TRANSACTION',
        amount: amountVal,
        currency: 'INR',
        transactionDate: shiftDays(baseDate, 4),
        description: `MISC BANK DEPOSIT ${utrVal}`,
        reference: utrVal,
        utr: utrVal,
        creditAmount: amountVal,
        debitAmount: 0,
        status: 'NORMALIZED',
        importBatchId: bankImportBatch.id
      }
    });
  }

  // 6. 5 Ambiguous Records (Amounts close, text references match without UTR codes)
  for (let i = 1; i <= 5; i++) {
    const invoiceNum = `INV-3WAY-AMBIG-${1000 + i}`;
    const expectedSettlement = 48820;
    const actualBankReceived = 48815; // Difference of 5 rupees

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNum,
        referenceNumber: `REF-AMBIG-${1000 + i}`,
        customerName: `AmbigClient-${i}`,
        issueDate: baseDate,
        dueDate: shiftDays(baseDate, 30),
        subtotal: 42372.88,
        tax: 7627.12,
        totalAmount: 50000,
        paidAmount: 50000,
        balanceDue: 0,
        status: InvoiceStatus.PAID,
        paymentStatus: PaymentStatus.PAID
      }
    });

    const payment = await prisma.payment.create({
      data: {
        amount: 50000,
        currency: 'INR',
        paymentMethod: 'UPI',
        paymentGateway: 'RAZORPAY',
        gatewayPaymentId: `pay_ambig_${1000 + i}`,
        status: 'CAPTURED',
        customerName: `AmbigClient-${i}`,
        paymentDate: baseDate,
        invoiceId: invoice.id
      }
    });

    // Payout reference with no explicit UTR field in DB
    const settlement = await prisma.settlement.create({
      data: {
        settlementDate: shiftDays(baseDate, 7),
        expectedAmount: expectedSettlement,
        settledAmount: expectedSettlement,
        fees: 1180,
        currency: 'INR',
        gatewayReference: `REF-GATEWAY-${1000 + i}`,
        status: 'PROCESSED'
      }
    });

    const txn = await prisma.transaction.create({
      data: {
        amount: 50000,
        currency: 'INR',
        status: 'SUCCESS',
        type: 'PAYMENT',
        reference: `pay_ambig_${1000 + i}`,
        paymentId: payment.id,
        settlementId: settlement.id
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: txn.id }
    });

    const rawBank = await prisma.rawRecord.create({
      data: {
        importBatchId: bankImportBatch.id,
        rowNumber: 90 + i,
        rawData: {
          transaction_id: `BANK-TX-AMBIG-${1000 + i}`,
          date: shiftDays(baseDate, 7).toISOString(),
          // Description has reference identifier but UTR is blank
          description: `RAZORPAY PAYOUT REF-GATEWAY-${1000 + i}`,
          credit: actualBankReceived,
          debit: 0,
          utr: ""
        },
        status: 'NORMALIZED'
      }
    });

    await prisma.financialRecord.create({
      data: {
        userId: admin.id,
        sourceType: 'BANK_TRANSACTION',
        sourceRecordId: rawBank.id,
        externalId: `BANK-TX-AMBIG-${1000 + i}`,
        recordType: 'BANK_TRANSACTION',
        amount: actualBankReceived,
        currency: 'INR',
        transactionDate: shiftDays(baseDate, 7),
        description: `RAZORPAY PAYOUT REF-GATEWAY-${1000 + i}`,
        reference: `REF-GATEWAY-${1000 + i}`,
        utr: null, // Empty/unconfigured UTR
        creditAmount: actualBankReceived,
        debitAmount: 0,
        status: 'NORMALIZED',
        importBatchId: bankImportBatch.id
      }
    });
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
