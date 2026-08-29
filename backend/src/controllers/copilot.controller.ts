import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { queryGroqAI } from '../services/ai.service';
import { logAudit } from '../lib/audit';

// POST /api/copilot/query
export const queryCopilot = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'anonymous';
    const { question, conversationId } = req.body;

    if (!question) {
      res.status(400).json({ error: 'Missing question in query body.' });
      return;
    }

    // 1. Get or Create Copilot Conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.copilotConversation.findFirst({
        where: { id: conversationId, userId }
      });
    }

    if (!conversation) {
      conversation = await prisma.copilotConversation.create({
        data: {
          userId,
          title: question.slice(0, 30) + (question.length > 30 ? '...' : '')
        }
      });
    }

    // Save User message
    await prisma.copilotMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: question
      }
    });

    // 2. Intent Detection & Relevant Database Querying
    const qLower = question.toLowerCase();
    let intent = 'UNKNOWN';
    let contextData: any = {};
    let evidenceChips: string[] = [];
    let relatedRecords: any[] = [];

    // Check 1: Specific Transaction queries (e.g. TXN-0401, pay_xxx, setl_xxx)
    const txMatch = question.match(/(txn|inv|pay|set|dup|db)-[\w-]+/i) || question.match(/(txn|inv|pay|set|dup|db)\d+/i) || question.match(/txn-[\w-]+/i);
    if (txMatch) {
      intent = 'SPECIFIC_TXN';
      const term = txMatch[0].toUpperCase();

      // Find financial record with this externalId
      const finRecord = await prisma.financialRecord.findFirst({
        where: { externalId: { equals: term, mode: 'insensitive' } }
      });

      if (finRecord) {
        // Find reconciliation record referencing this financial record
        const rec = await prisma.reconciliationRecord.findFirst({
          where: {
            OR: [
              { invoiceRecordId: finRecord.id },
              { paymentRecordId: finRecord.id },
              { settlementRecordId: finRecord.id },
              { bankRecordId: finRecord.id }
            ]
          }
        });

        if (rec) {
          // Fetch all 4 layers
          const invoice = rec.invoiceRecordId ? await prisma.financialRecord.findUnique({ where: { id: rec.invoiceRecordId } }) : null;
          const payment = rec.paymentRecordId ? await prisma.financialRecord.findUnique({ where: { id: rec.paymentRecordId } }) : null;
          const settlement = rec.settlementRecordId ? await prisma.financialRecord.findUnique({ where: { id: rec.settlementRecordId } }) : null;
          const bank = rec.bankRecordId ? await prisma.financialRecord.findUnique({ where: { id: rec.bankRecordId } }) : null;

          contextData = {
            transactionId: term,
            difference: rec.difference,
            chainStatus: rec.chainStatus,
            severity: rec.chainSeverity,
            notes: rec.notes,
            invoice: invoice ? { externalId: invoice.externalId, amount: invoice.amount, date: invoice.transactionDate, ref: invoice.reference } : null,
            payment: payment ? { externalId: payment.externalId, amount: payment.amount, date: payment.transactionDate, ref: payment.reference } : null,
            settlement: settlement ? { externalId: settlement.externalId, amount: settlement.amount, date: settlement.transactionDate, ref: settlement.reference, utr: settlement.utr } : null,
            bank: bank ? { externalId: bank.externalId, amount: bank.amount, date: bank.transactionDate, ref: bank.reference } : null
          };

          evidenceChips.push(term);
          evidenceChips.push(`Diff: ₹${Math.abs(rec.difference)}`);
          evidenceChips.push(rec.chainStatus || 'UNRESOLVED');
          relatedRecords.push({ id: rec.id, type: 'RECONCILIATION_RECORD', externalId: term });
        } else {
          contextData = {
            searchedTransaction: {
              externalId: finRecord.externalId,
              amount: finRecord.amount,
              type: finRecord.recordType,
              status: finRecord.status,
              createdAt: finRecord.createdAt
            }
          };
          evidenceChips.push(term);
          evidenceChips.push(`Status: ${finRecord.status}`);
          relatedRecords.push({ id: finRecord.id, type: finRecord.recordType, externalId: finRecord.externalId });
        }
      } else {
        contextData = {
          message: `Transaction ${term} was not found in the database. Verify the ID.`
        };
      }

    } else if (qLower.includes('largest exception') || qLower.includes('biggest discrepancy') || qLower.includes('largest discrepancy')) {
      intent = 'LARGEST_EXCEPTION';
      const largestExceptions = await prisma.exception.findMany({
        where: { status: 'OPEN' },
        orderBy: { difference: 'desc' },
        take: 3
      });

      contextData = {
        largestExceptions: largestExceptions.map(e => ({
          id: e.id,
          description: e.description,
          type: e.type,
          difference: e.difference,
          severity: e.severity
        }))
      };

      largestExceptions.forEach(e => {
        evidenceChips.push(`₹${Math.abs(e.difference || 0)} Diff`);
        relatedRecords.push({ id: e.id, type: 'EXCEPTION', externalId: e.id.slice(0,8).toUpperCase() });
      });

    } else if (qLower.includes('high-value') || qLower.includes('high value') || qLower.includes('unresolved transactions')) {
      intent = 'HIGH_VALUE_UNRESOLVED';
      const highValueExceptions = await prisma.exception.findMany({
        where: { status: 'OPEN' },
        orderBy: { difference: 'desc' },
        take: 5
      });

      contextData = {
        highValueExceptions: highValueExceptions.map(e => ({
          id: e.id,
          description: e.description,
          type: e.type,
          difference: e.difference,
          severity: e.severity
        }))
      };

      highValueExceptions.forEach(e => {
        evidenceChips.push(`₹${Math.abs(e.difference || 0)}`);
        relatedRecords.push({ id: e.id, type: 'EXCEPTION', externalId: e.id.slice(0,8).toUpperCase() });
      });

    } else if (qLower.includes('settlement lower') || qLower.includes('settlement is lower') || qLower.includes('lower than payment')) {
      intent = 'SETTLEMENT_LOWER_THAN_PAYMENT';
      const mismatchExceptions = await prisma.exception.findMany({
        where: {
          status: 'OPEN',
          type: 'AMOUNT_MISMATCH'
        },
        take: 5,
        include: {
          record: true
        }
      });

      const paymentHigherThanSettlements = [];
      for (const ex of mismatchExceptions) {
        if (ex.record?.paymentRecordId && ex.record?.settlementRecordId) {
          const payment = await prisma.financialRecord.findUnique({ where: { id: ex.record.paymentRecordId } });
          const settlement = await prisma.financialRecord.findUnique({ where: { id: ex.record.settlementRecordId } });
          if (payment && settlement && payment.amount > settlement.amount) {
            paymentHigherThanSettlements.push({
              transactionId: payment.externalId,
              paymentAmount: payment.amount,
              settlementAmount: settlement.amount,
              difference: payment.amount - settlement.amount
            });
            evidenceChips.push(payment.externalId);
            relatedRecords.push({ id: ex.id, type: 'EXCEPTION', externalId: payment.externalId });
          }
        }
      }

      contextData = {
        settlementsLowerThanPayments: paymentHigherThanSettlements
      };

    } else if (qLower.includes('review first') || qLower.includes('priority') || qLower.includes('what should i review')) {
      intent = 'REVIEW_FIRST';
      const reviewFirst = await prisma.exception.findMany({
        where: {
          status: 'OPEN',
          severity: { in: ['CRITICAL', 'HIGH'] }
        },
        orderBy: { difference: 'desc' },
        take: 5
      });

      contextData = {
        priorityExceptions: reviewFirst.map(e => ({
          id: e.id,
          description: e.description,
          type: e.type,
          difference: e.difference,
          severity: e.severity
        }))
      };

      reviewFirst.forEach(e => {
        evidenceChips.push(`${e.severity}: ₹${Math.abs(e.difference || 0)}`);
        relatedRecords.push({ id: e.id, type: 'EXCEPTION', externalId: e.id.slice(0,8).toUpperCase() });
      });

    } else {
      // General stats fallback context
      const openExceptionsCount = await prisma.exception.count({ where: { status: 'OPEN' } });
      const recentRuns = await prisma.reconciliationRun.findMany({
        take: 2,
        orderBy: { createdAt: 'desc' }
      });

      contextData = {
        openExceptionsCount,
        latestRuns: recentRuns.map(r => ({
          id: r.id,
          matchRate: r.matchRate,
          totalRecords: r.totalRecords,
          exceptions: r.exceptions,
          completedAt: r.completedAt
        }))
      };

      evidenceChips.push(`${openExceptionsCount} Open Exceptions`);
      if (recentRuns[0]) {
        evidenceChips.push(`${recentRuns[0].matchRate}% Last Match`);
      }
    }

    // 3. Formulate Response with Groq AI or Sandbox Fallback Safeguard
    let aiResponse;
    const hasApiKey = process.env.GROQ_API_KEY || process.env.GROQ_API;

    if (hasApiKey) {
      try {
        aiResponse = await queryGroqAI(question, contextData);
      } catch (err) {
        console.warn('Groq API call failed. Falling back to sandbox deterministic controller.');
      }
    }

    // Safe, verified fallback if AI is not connected or fails
    if (!aiResponse) {
      if (intent === 'SPECIFIC_TXN' && contextData.transactionId) {
        const diff = Math.abs(contextData.difference || 0);
        aiResponse = {
          summary: `${contextData.transactionId} has a discrepancy of ₹${diff} between the ledger entries.`,
          findings: [
            `Invoice: ${contextData.invoice ? '₹' + contextData.invoice.amount : 'Missing'}`,
            `Payment: ${contextData.payment ? '₹' + contextData.payment.amount : 'Missing'}`,
            `Settlement: ${contextData.settlement ? '₹' + contextData.settlement.amount : 'Missing'}`,
            `Bank statement credit: ${contextData.bank ? '₹' + contextData.bank.amount : 'Missing'}`
          ],
          evidence: evidenceChips,
          possibleCauses: [contextData.notes || 'Counterpart matching breakdown.'],
          recommendedActions: ['Perform manual ledger adjustment.', 'Review settlement files.'],
          relatedRecords: relatedRecords.map(r => r.externalId),
          confidence: 'high' as const
        };
      } else if (intent === 'LARGEST_EXCEPTION' && contextData.largestExceptions?.length > 0) {
        const top = contextData.largestExceptions[0];
        aiResponse = {
          summary: `The largest unresolved discrepancy is exception ${top.id.slice(0, 8).toUpperCase()} with an absolute difference of ₹${Math.abs(top.difference || 0)}.`,
          findings: [
            `Issue type: ${top.type}`,
            `Description: ${top.description}`,
            `Discrepancy: ₹${Math.abs(top.difference || 0)}`
          ],
          evidence: evidenceChips,
          possibleCauses: ['Large missing settlement counterpart or mismatch in billing headers.'],
          recommendedActions: ['Verify ledger record.', 'Audit matching gateway invoices.'],
          relatedRecords: relatedRecords.map(r => r.externalId),
          confidence: 'high' as const
        };
      } else if (intent === 'SETTLEMENT_LOWER_THAN_PAYMENT' && contextData.settlementsLowerThanPayments?.length > 0) {
        const top = contextData.settlementsLowerThanPayments[0];
        aiResponse = {
          summary: `Discrepancy detected where settlement is lower than payment. E.g. ${top.transactionId} payment is ₹${top.paymentAmount} while settlement is ₹${top.settlementAmount}.`,
          findings: [
            `Transaction ID: ${top.transactionId}`,
            `Payment: ₹${top.paymentAmount}`,
            `Settlement: ₹${top.settlementAmount}`,
            `Difference (potential gateway fee/chargeback): ₹${top.difference}`
          ],
          evidence: evidenceChips,
          possibleCauses: ['Standard Payment Gateway processing fee deduction.', 'Partial chargeback adjustments.'],
          recommendedActions: ['Inspect processing fee rate card.', 'Compare with Razorpay settlement reports.'],
          relatedRecords: relatedRecords.map(r => r.externalId),
          confidence: 'high' as const
        };
      } else if (intent === 'REVIEW_FIRST' && contextData.priorityExceptions?.length > 0) {
        const count = contextData.priorityExceptions.length;
        aiResponse = {
          summary: `There are ${count} critical/high priority exceptions that need immediate review.`,
          findings: contextData.priorityExceptions.map((e: any) => `${e.severity} Discrepancy: ₹${Math.abs(e.difference || 0)} - ${e.description}`),
          evidence: evidenceChips,
          possibleCauses: ['Critical pipeline gaps or major payment reconciliation breaks.'],
          recommendedActions: ['Resolve high value exceptions first.', 'Verify correct statement UTR entries.'],
          relatedRecords: relatedRecords.map(r => r.externalId),
          confidence: 'high' as const
        };
      } else {
        aiResponse = {
          summary: 'Hello! I am your AI Finance Copilot. I have access to your database records.',
          findings: [
            `System Status: ${contextData.openExceptionsCount || 0} open exceptions.`,
            `Latest Run Match Rate: ${contextData.latestRuns?.[0]?.matchRate || '—'}%`
          ],
          evidence: evidenceChips,
          possibleCauses: ['No active mismatched transactions search filters applied.'],
          recommendedActions: ['Ask a specific question like "Why is TXN-0401 mismatched?" or "What should I review first?"'],
          relatedRecords: [],
          confidence: 'low' as const
        };
      }
    }

    // Save Assistant message
    let mdContent = `### ✦ Finance AI Audit Summary\n${aiResponse.summary}\n\n`;
    if (aiResponse.findings && aiResponse.findings.length > 0) {
      mdContent += `#### 🔍 Key Findings\n`;
      aiResponse.findings.forEach((f: string) => {
        mdContent += `- ${f}\n`;
      });
      mdContent += `\n`;
    }
    if (aiResponse.possibleCauses && aiResponse.possibleCauses.length > 0) {
      mdContent += `#### 💡 Potential Causes\n`;
      aiResponse.possibleCauses.forEach((c: string) => {
        mdContent += `- ${c}\n`;
      });
      mdContent += `\n`;
    }
    if (aiResponse.recommendedActions && aiResponse.recommendedActions.length > 0) {
      mdContent += `#### 🛠 Recommended Actions\n`;
      aiResponse.recommendedActions.forEach((a: string) => {
        mdContent += `- ${a}\n`;
      });
      mdContent += `\n`;
    }

    const assistantMsg = await prisma.copilotMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: mdContent,
        evidence: {
          chips: aiResponse.evidence || evidenceChips,
          related: relatedRecords
        }
      }
    });

    await logAudit(
      userId,
      req.user?.email || undefined,
      'AI_ANALYSIS',
      `Copilot query processed. Intent: ${intent}.`,
      undefined,
      'CopilotConversation',
      conversation.id,
      null,
      { question }
    );

    res.status(200).json({
      success: true,
      conversationId: conversation.id,
      message: {
        id: assistantMsg.id,
        role: assistantMsg.role,
        content: assistantMsg.content,
        evidence: assistantMsg.evidence,
        createdAt: assistantMsg.createdAt
      }
    });
  } catch (error: any) {
    console.error('Copilot query error:', error);
    res.status(500).json({ error: error.message || 'Internal server error in Copilot query.' });
  }
};

// GET /api/copilot/records/:externalId
export const getRecordDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'anonymous';
    const externalId = req.params.externalId as string;

    const record = await prisma.financialRecord.findFirst({
      where: { userId, externalId }
    });

    if (!record) {
      res.status(404).json({ error: 'Record not found.' });
      return;
    }

    res.status(200).json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error fetching record details.' });
  }
};
