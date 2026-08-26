import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const GROQ_API_KEY = process.env.GROQ_API;

// Helper to fetch the system summary as context for the AI
async function getSystemContext() {
  try {
    const [
      runsCount,
      latestRun,
      transactionAgg,
      invoiceAgg,
      exceptionCount,
      criticalExceptions,
      invoicesByStatus,
      transactionsByStatus
    ] = await Promise.all([
      // Total reconciliation runs
      prisma.reconciliationRun.count(),
      // Latest reconciliation run details
      prisma.reconciliationRun.findFirst({
        orderBy: { createdAt: 'desc' },
      }),
      // Transactions count and volume
      prisma.transaction.aggregate({
        _count: { id: true },
        _sum: { amount: true },
      }),
      // Invoices count and balances
      prisma.invoice.aggregate({
        _count: { id: true },
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceDue: true,
        },
      }),
      // Open exceptions
      prisma.exception.count({
        where: { status: 'OPEN' },
      }),
      // Sample critical exceptions
      prisma.exception.findMany({
        where: { status: 'OPEN' },
        take: 3,
        orderBy: { severity: 'asc' }, // usually CRITICAL, HIGH, etc.
      }),
      // Invoices group by status
      prisma.invoice.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { totalAmount: true }
      }),
      // Transactions group by status
      prisma.transaction.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true }
      })
    ]);

    const latestRunInfo = latestRun 
      ? `ID: ${latestRun.id}
Source: ${latestRun.source}
Status: ${latestRun.status}
Processed Records: ${latestRun.recordsProcessed}
Matched Records: ${latestRun.matchedRecords} (Rate: ${latestRun.recordsProcessed > 0 ? ((latestRun.matchedRecords / latestRun.recordsProcessed) * 100).toFixed(2) : 0}%)
Exceptions Found: ${latestRun.exceptionsFound}
Reconciled Amount: INR ${latestRun.reconciledAmount.toLocaleString('en-IN')}
Unmatched Amount: INR ${latestRun.unmatchedAmount.toLocaleString('en-IN')}
Pending Amount: INR ${latestRun.pendingAmount.toLocaleString('en-IN')}`
      : 'No reconciliation runs executed yet.';

    const invoiceStatusStr = invoicesByStatus.map(group => 
      `- ${group.status}: ${group._count.id} invoice(s), Total Volume: INR ${(group._sum.totalAmount || 0).toLocaleString('en-IN')}`
    ).join('\n');

    const transactionStatusStr = transactionsByStatus.map(group => 
      `- ${group.status}: ${group._count.id} transaction(s), Total Volume: INR ${(group._sum.amount || 0).toLocaleString('en-IN')}`
    ).join('\n');

    const exceptionsStr = criticalExceptions.length > 0
      ? criticalExceptions.map(exc => `- Type: ${exc.type}, Amount: INR ${exc.amount.toLocaleString('en-IN')}, Severity: ${exc.severity}, Description: ${exc.description || 'None'}`).join('\n')
      : 'No critical exceptions found.';

    return `SYSTEM STATE DATABASE CONTEXT SUMMARY:
=========================================
1. RECONCILIATION RUNS:
Total Runs Executed: ${runsCount}

LATEST RECONCILIATION RUN DETAILS:
${latestRunInfo}

2. TRANSACTIONS SUMMARY:
Total Count: ${transactionAgg._count.id}
Total Volume Amount: INR ${(transactionAgg._sum.amount || 0).toLocaleString('en-IN')}
Breakdown by Status:
${transactionStatusStr || 'None'}

3. INVOICES SUMMARY:
Total Count: ${invoiceAgg._count.id}
Total Amount Invoiced: INR ${(invoiceAgg._sum.totalAmount || 0).toLocaleString('en-IN')}
Total Paid Amount: INR ${(invoiceAgg._sum.paidAmount || 0).toLocaleString('en-IN')}
Total Balance Due: INR ${(invoiceAgg._sum.balanceDue || 0).toLocaleString('en-IN')}
Breakdown by Status:
${invoiceStatusStr || 'None'}

4. EXCEPTIONS STATUS:
Total Open Exceptions: ${exceptionCount}
Sample Open Exceptions Requiring Attention:
${exceptionsStr}
=========================================`;

  } catch (error) {
    console.error('Failed to query database context: ', error);
    return 'Could not retrieve current system database state context. Answer general financial questions instead.';
  }
}

export const chatWithAgent = async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    if (!GROQ_API_KEY) {
      res.status(200).json({
        success: true,
        data: {
          role: 'assistant',
          content: 'Groq API Key is not configured. Please add `GROQ_API="gsk_..."` to your `backend/.env` file to start chatting!'
        }
      });
      return;
    }

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ message: 'Invalid or missing messages payload' });
      return;
    }

    const context = await getSystemContext();

    const systemPrompt = `You are "Antigravity Finance AI", an advanced financial intelligence chatbot built into the Razorpay Reconciliation and Finance Controller dashboard.

Use the following real-time database summary to answer questions about the system's runs, transactions, invoices, and exceptions:
${context}

Instructions:
1. Answer the user's questions clearly, accurately, and professionally.
2. Rely on the provided database context for any numbers, percentages, counts, or metrics related to this dashboard.
3. If the user asks general financial or accounting questions (such as tax definitions, payment methods, double-entry bookkeeping), answer them using your general financial knowledge accurately.
4. Keep currency formatting in Indian Rupees (INR) using format like 'INR 1,00,000' or '₹1,00,000'.
5. Keep answers friendly, technical, and directly helpful. Make use of bullet points or bold text to improve readability.`;

    const groqPayload = {
      model: 'groq/compound',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.2,
      max_tokens: 1024,
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(groqPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API Error Status:', response.status, 'Body:', errorText);
      
      // Fallback model
      if (response.status === 429 || response.status === 404 || response.status === 400) {
        console.log('Attempting fallback to openai/gpt-oss-120b...');
        const fallbackPayload = {
          ...groqPayload,
          model: 'openai/gpt-oss-120b'
        };
        const fallbackResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify(fallbackPayload)
        });

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          res.status(200).json({
            success: true,
            data: data.choices[0].message
          });
          return;
        }
      }

      res.status(502).json({ message: 'Error communicating with Groq AI API', detail: errorText });
      return;
    }

    const data = await response.json();
    res.status(200).json({
      success: true,
      data: data.choices[0].message
    });

  } catch (error: any) {
    console.error('Error in AI Chat Controller:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
