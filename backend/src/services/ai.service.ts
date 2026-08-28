import axios from 'axios';
import { prisma } from '../lib/prisma';

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-specdec'; // Standard fast Groq model

export interface AIAnalysisResponse {
  summary: string;
  findings: string[];
  evidence: string[];
  possibleCauses: string[];
  recommendedActions: string[];
  relatedRecords: string[];
  confidence: 'high' | 'medium' | 'low';
}

const SYSTEM_PROMPT = `You are an expert Enterprise Finance Controller AI Assistant.
Your job is to analyze financial discrepancies, reconcile differences, and audit invoices, payments, settlements, and exceptions using ONLY the provided database evidence.

CRITICAL RULES:
1. Do NOT invent/hallucinate any facts, transaction values, gateway logs, or numbers.
2. If the provided evidence is insufficient to explain a discrepancy, state clearly inside the summary and possible causes: "Insufficient data to determine the cause." Do NOT invent processing fees or other items.
3. Distinguish clearly between:
   - FACTS (directly supported by database records)
   - POSSIBLE EXPLANATIONS (logical hypotheses consistent with the facts)
   - RECOMMENDATIONS (actions the human operator should take)
4. You must NOT perform mutations. You are read-only.
5. You must return your analysis as a structured JSON object matching this exact TypeScript structure:
{
  "summary": "string describing the overall analysis",
  "findings": ["string", "string", ...],
  "evidence": ["string", "string", ...],
  "possibleCauses": ["string", "string", ...],
  "recommendedActions": ["string", "string", ...],
  "relatedRecords": ["string", "string", ...],
  "confidence": "high" | "medium" | "low"
}`;

export const queryGroqAI = async (
  question: string,
  contextData: any
): Promise<AIAnalysisResponse> => {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not configured on the server.');
  }

  const promptContent = `
User Question: "${question}"

Available Database Context:
${JSON.stringify(contextData, null, 2)}

Provide your structured financial audit analysis based on the context data.
`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: promptContent }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1 // Low temperature for deterministic analysis
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 25000
      }
    );

    const resultText = response.data.choices[0].message.content;
    const parsedResult = JSON.parse(resultText) as AIAnalysisResponse;
    return parsedResult;
  } catch (error: any) {
    console.error('Groq AI API Call failed:', error.response?.data || error.message);
    throw new Error('AI analysis failed due to backend communication issues.');
  }
};

/**
 * Builds context map from database for a specific query
 */
export const buildQueryContext = async (question: string): Promise<any> => {
  const normalized = question.toLowerCase();
  const context: any = {};

  // 1. Check if the question references a specific Settlement (e.g. SET-1001)
  const settlementMatch = normalized.match(/set-\d+|settlement\s*[0-9a-f-]+/i);
  if (settlementMatch) {
    const term = settlementMatch[0].toUpperCase();
    const settlement = await prisma.settlement.findFirst({
      where: {
        OR: [
          { id: { contains: term, mode: 'insensitive' } },
          { gatewayReference: { contains: term, mode: 'insensitive' } }
        ]
      },
      include: {
        transactions: {
          include: {
            payment: {
              include: {
                invoice: true
              }
            }
          }
        }
      }
    });

    if (settlement) {
      context.targetSettlement = {
        id: settlement.id,
        settlementDate: settlement.settlementDate,
        expectedAmount: settlement.expectedAmount,
        settledAmount: settlement.settledAmount,
        fees: settlement.fees,
        currency: settlement.currency,
        gatewayReference: settlement.gatewayReference,
        status: settlement.status
      };
      context.linkedTransactions = settlement.transactions.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        type: tx.type,
        reference: tx.reference,
        status: tx.status,
        payment: tx.payment ? {
          id: tx.payment.id,
          amount: tx.payment.amount,
          status: tx.payment.status,
          invoice: tx.payment.invoice ? {
            id: tx.payment.invoice.id,
            invoiceNumber: tx.payment.invoice.invoiceNumber,
            totalAmount: tx.payment.invoice.totalAmount,
            balanceDue: tx.payment.invoice.balanceDue
          } : null
        } : null
      }));
    }
  }

  // 2. Check if the question references an Invoice (e.g. INV-1001)
  const invoiceMatch = normalized.match(/inv-\d+|invoice\s*[0-9a-f-]+/i);
  if (invoiceMatch) {
    const term = invoiceMatch[0].toUpperCase();
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: { contains: term, mode: 'insensitive' } },
          { invoiceNumber: { contains: term, mode: 'insensitive' } }
        ]
      },
      include: {
        payments: true,
        transactions: true
      }
    });

    if (invoice) {
      context.targetInvoice = invoice;
    }
  }

  // 3. Fetch summary metrics to give overall operations health context
  const openExceptionsCount = await prisma.exception.count({
    where: { status: 'OPEN' }
  });
  const recentRuns = await prisma.reconciliationRun.findMany({
    take: 2,
    orderBy: { createdAt: 'desc' }
  });

  context.systemStatus = {
    openExceptionsCount,
    latestRuns: recentRuns
  };

  return context;
};
