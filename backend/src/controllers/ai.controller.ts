import { Request, Response } from 'express';
import { queryGroqAI, buildQueryContext } from '../services/ai.service';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';

export const analyzeFinanceQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { question } = req.body;

    if (!question) {
      res.status(400).json({ success: false, message: 'Question parameter is required.' });
      return;
    }

    // 1. Gather database context for query
    const contextData = await buildQueryContext(question);

    // 2. Call Groq AI Service
    const analysis = await queryGroqAI(question, contextData);

    // 3. Cache analysis in DB
    const contextHash = Buffer.from(JSON.stringify(contextData)).toString('base64').substring(0, 100);
    await prisma.aIAnalysis.create({
      data: {
        query: question,
        contextHash,
        response: JSON.stringify(analysis),
        confidence: analysis.confidence,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-specdec'
      }
    });

    await logAudit(
      req.user?.id,
      req.user?.email || undefined,
      'AI_QUESTION_ANALYZE',
      { question, confidence: analysis.confidence }
    );

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    console.error('AI Analyze Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'AI engine failed to analyze financial data.',
      code: 'AI_SERVICE_ERROR'
    });
  }
};

export const chatWithAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, message: 'Messages array is required.' });
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const question = lastMessage.content;

    // Gather context
    const contextData = await buildQueryContext(question);

    // Call Groq
    const analysis = await queryGroqAI(question, contextData);

    // Formulate a beautiful markdown response for conversational UI
    let content = `### ✦ Finance AI Audit Summary\n${analysis.summary}\n\n`;
    
    if (analysis.findings.length > 0) {
      content += `#### 🔍 Key Findings\n`;
      analysis.findings.forEach(f => {
        content += `- ${f}\n`;
      });
      content += `\n`;
    }

    if (analysis.evidence.length > 0) {
      content += `#### 📊 Supporting Evidence\n`;
      analysis.evidence.forEach(e => {
        content += `- ${e}\n`;
      });
      content += `\n`;
    }

    if (analysis.possibleCauses.length > 0) {
      content += `#### 💡 Potential Causes\n`;
      analysis.possibleCauses.forEach(c => {
        content += `- ${c}\n`;
      });
      content += `\n`;
    }

    if (analysis.recommendedActions.length > 0) {
      content += `#### 🛠 Recommended Actions\n`;
      analysis.recommendedActions.forEach(a => {
        content += `1. **${a}**\n`;
      });
      content += `\n`;
    }

    content += `---\n*Audit Confidence:* **${analysis.confidence.toUpperCase()}**`;

    res.status(200).json({
      success: true,
      data: {
        role: 'assistant',
        content
      }
    });
  } catch (error: any) {
    console.error('AI Chat Error:', error.message);
    res.status(200).json({
      success: true,
      data: {
        role: 'assistant',
        content: `⚠️ **AI Service Alert:** ${error.message || 'The AI assistant was unable to process your query. Verify your database connection or Groq API key configuration.'}`
      }
    });
  }
};

export const investigateException = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Fetch the exception and include linked details
    const exception = (await prisma.exception.findUnique({
      where: { id },
      include: {
        record: true
      }
    })) as any;

    if (!exception) {
      res.status(404).json({ success: false, message: 'Exception not found.' });
      return;
    }

    // Retrieve related models
    let relatedInvoice = null;
    let relatedPayment = null;
    let relatedTransaction = null;
    let relatedSettlement = null;

    if (exception.invoiceId) {
      relatedInvoice = await prisma.invoice.findUnique({ where: { id: exception.invoiceId } });
    }
    if (exception.paymentId) {
      relatedPayment = await prisma.payment.findUnique({ where: { id: exception.paymentId } });
    }
    if (exception.transactionId) {
      relatedTransaction = await prisma.transaction.findUnique({ where: { id: exception.transactionId } });
    }
    if (exception.settlementId) {
      relatedSettlement = await prisma.settlement.findUnique({ where: { id: exception.settlementId } });
    }

    // Build context
    const contextData = {
      exception: {
        id: exception.id,
        type: exception.type,
        severity: exception.severity,
        difference: exception.difference,
        description: exception.description
      },
      reconciliationRecord: exception.record,
      relatedInvoice,
      relatedPayment,
      relatedTransaction,
      relatedSettlement
    };

    // Ask Groq
    const question = `Investigate discrepancy exception ${exception.id} of type ${exception.type} and difference amount ${exception.difference || 0}. Provide explanation and suggest remedy.`;
    const analysis = await queryGroqAI(question, contextData);

    // Save summary inside exception's rootCause without resolving it
    await prisma.exception.update({
      where: { id },
      data: {
        rootCause: analysis.summary
      }
    });

    await logAudit(
      (req.user as any)?.id,
      (req.user as any)?.email,
      'EXCEPTION_AI_INVESTIGATE',
      { exceptionId: id }
    );

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    console.error('Exception Investigation Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'AI exception investigation failed.',
      code: 'AI_INVESTIGATION_ERROR'
    });
  }
};
