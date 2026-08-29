import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

const parseNumber = (val: any) => {
  if (val === null || val === undefined || val === '') return 0;
  return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
};

const parseDateValue = (value: any): Date => {
  if (value === null || value === undefined || value === '') return new Date();
  const num = Number(value);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const msInDay = 24 * 60 * 60 * 1000;
    return new Date(Math.round((num - 25569) * msInDay));
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

async function runAccuracyTest() {
  const dirPath = process.argv[2] || process.cwd();
  console.log(`Searching for test dataset files in: ${dirPath}`);

  const invoiceFile = path.join(dirPath, '01_invoices.csv');
  const paymentFile = path.join(dirPath, '02_payments.csv');
  const settlementFile = path.join(dirPath, '03_razorpay_settlements.csv');
  const bankFile = path.join(dirPath, '04_bank_transactions.csv');
  const expectedFile = path.join(dirPath, '06_expected_outcomes.csv');

  if (!fs.existsSync(invoiceFile) || !fs.existsSync(paymentFile) || !fs.existsSync(settlementFile) || !fs.existsSync(bankFile) || !fs.existsSync(expectedFile)) {
    console.error('Error: Could not find all required CSV files (01_invoices.csv, 02_payments.csv, 03_razorpay_settlements.csv, 04_bank_transactions.csv, 06_expected_outcomes.csv) in the specified folder.');
    console.log('\nUsage: npx ts-node src/scripts/test-accuracy.ts <path_to_directory_with_csvs>');
    process.exit(1);
  }

  console.log('Parsing files...');
  const parseCSV = (file: string) => {
    const workbook = xlsx.readFile(file);
    return xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  };

  const invoices = parseCSV(invoiceFile);
  const payments = parseCSV(paymentFile);
  const settlements = parseCSV(settlementFile);
  const bankTxns = parseCSV(bankFile);
  const expectedOutcomes = parseCSV(expectedFile);

  console.log(`Loaded ${invoices.length} invoices, ${payments.length} payments, ${settlements.length} settlements, ${bankTxns.length} bank transactions.`);
  console.log(`Loaded ${expectedOutcomes.length} expected outcomes.`);

  // Maps for deterministic matching
  const invoiceMap = new Map<string, any>();
  const paymentByInvoiceRef = new Map<string, any>();
  const paymentMap = new Map<string, any>();
  const settlementByPaymentRef = new Map<string, any>();
  const settlementMap = new Map<string, any>();
  const bankByUTR = new Map<string, any>();

  invoices.forEach((r: any, idx) => {
    const id = String(r.invoice_id || r.id || `inv_${idx}`).trim().toLowerCase();
    invoiceMap.set(id, { id, amount: parseNumber(r.invoice_amount || r.amount), date: parseDateValue(r.invoice_date || r.date), raw: r });
  });

  payments.forEach((r: any, idx) => {
    const id = String(r.payment_id || r.id || `pay_${idx}`).trim().toLowerCase();
    const invRef = String(r.invoice_id || r.reference || '').trim().toLowerCase();
    const record = { id, reference: invRef, amount: parseNumber(r.amount), date: parseDateValue(r.payment_date || r.date), raw: r };
    paymentMap.set(id, record);
    if (invRef) paymentByInvoiceRef.set(invRef, record);
  });

  settlements.forEach((r: any, idx) => {
    const id = String(r.settlement_id || r.id || `setl_${idx}`).trim().toLowerCase();
    const payRef = String(r.payment_id || r.reference || '').trim().toLowerCase();
    const utr = String(r.utr || '').trim().toLowerCase();
    const record = { id, reference: payRef, utr, amount: parseNumber(r.settled_amount || r.amount), date: parseDateValue(r.settlement_date || r.date), raw: r };
    settlementMap.set(id, record);
    if (payRef) settlementByPaymentRef.set(payRef, record);
  });

  bankTxns.forEach((r: any, idx) => {
    const id = String(r.bank_transaction_id || r.id || `bank_${idx}`).trim().toLowerCase();
    const utr = String(r.utr || r.reference || '').trim().toLowerCase();
    const record = { id, utr, amount: parseNumber(r.amount), date: parseDateValue(r.transaction_date || r.date), raw: r };
    if (utr) bankByUTR.set(utr, record);
  });

  // Reconcile
  const actualChains = new Map<string, string>(); // key = invoice/payment ID, value = chainStatus

  invoiceMap.forEach((invoice, invId) => {
    const payment = paymentByInvoiceRef.get(invId);
    let settlement = null;
    let bank = null;

    if (payment) {
      const payKey = payment.id;
      settlement = settlementByPaymentRef.get(payKey);
      
      if (settlement) {
        const setKey = settlement.utr || settlement.id;
        bank = bankByUTR.get(setKey);
      }
    }

    let status = 'UNRESOLVED';
    if (invoice && payment && settlement && bank) {
      const diff = Math.abs(payment.amount - settlement.amount);
      if (diff > 50.0) {
        status = 'AMOUNT_MISMATCH';
      } else {
        status = 'FULLY_RECONCILED';
      }
    } else if (invoice && !payment) {
      status = 'PAYMENT_MISSING';
    } else if (payment && !settlement) {
      status = 'SETTLEMENT_MISSING';
    } else if (settlement && !bank) {
      status = 'BANK_CREDIT_MISSING';
    }

    actualChains.set(invId, status);
  });

  // Calculate Precision, Recall, TP, FP, FN, TN
  let tp = 0; // Expected reconciled, actually reconciled
  let fp = 0; // Expected exception, actually reconciled
  let fn = 0; // Expected reconciled, actually exception/missing
  let tn = 0; // Expected exception, actually exception/missing

  expectedOutcomes.forEach((row: any) => {
    const id = String(row.invoice_id || row.id || '').trim().toLowerCase();
    const expectedReconciled = String(row.expected_status || '').trim().toUpperCase() === 'RECONCILED';
    
    const actualStatus = actualChains.get(id) || 'UNRESOLVED';
    const actualReconciled = actualStatus === 'FULLY_RECONCILED';

    if (expectedReconciled && actualReconciled) {
      tp++;
    } else if (!expectedReconciled && actualReconciled) {
      fp++;
    } else if (expectedReconciled && !actualReconciled) {
      fn++;
    } else {
      tn++;
    }
  });

  const precision = tp > 0 ? (tp / (tp + fp)) : 0;
  const recall = tp > 0 ? (tp / (tp + fn)) : 0;
  const matchRate = (tp + fp) / expectedOutcomes.length;

  console.log('\n======================================');
  console.log('BATCH ANALYSIS ACCURACY REPORT');
  console.log('======================================');
  console.log(`True Positives (TP):  ${tp}`);
  console.log(`False Positives (FP): ${fp}`);
  console.log(`False Negatives (FN): ${fn}`);
  console.log(`True Negatives (TN):  ${tn}`);
  console.log('--------------------------------------');
  console.log(`Precision:            ${(precision * 100).toFixed(2)}%`);
  console.log(`Recall:               ${(recall * 100).toFixed(2)}%`);
  console.log(`Match Rate:           ${(matchRate * 100).toFixed(2)}%`);
  console.log(`Exception Rate:       ${(((fp + fn + tn) / expectedOutcomes.length) * 100).toFixed(2)}%`);
  console.log('======================================\n');
}

runAccuracyTest().catch(console.error);
