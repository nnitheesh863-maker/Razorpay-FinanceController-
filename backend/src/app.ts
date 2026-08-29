import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import modular routes
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import transactionRoutes from './routes/transaction.routes';
import invoiceRoutes from './routes/invoice.routes';
import paymentRoutes from './routes/payment.routes';
import settlementRoutes from './routes/settlement.routes';
import reconciliationRoutes from './routes/reconciliation.routes';
import exceptionRoutes from './routes/exception.routes';
import aiRoutes from './routes/ai.routes';
import reportRoutes from './routes/report.routes';
import importRoutes from './routes/import.routes';
import auditRoutes from './routes/audit.routes';
import stateRoutes from './routes/state.routes';
import documentRoutes from './routes/document.routes';
import integrationRoutes from './routes/integration.routes';
import webhookRoutes from './routes/webhook.routes';
import cashRoutes from './routes/cash.routes';
import copilotRoutes from './routes/copilot.routes';
import controlScoreRoutes from './routes/controlScore.routes';
import { secureHeaders, rateLimiter, sanitizeInputs, errorHandler } from './middleware/security.middleware';
import path from 'path';

const app = express();

app.use(helmet());
app.use(cors());
app.use(secureHeaders);
app.use(rateLimiter);
app.use(sanitizeInputs);
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Map endpoints under /api/v1 prefix
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/settlements', settlementRoutes);
app.use('/api/v1/reconciliation', reconciliationRoutes);
app.use('/api/v1/exceptions', exceptionRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/imports', importRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1', stateRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/integrations', integrationRoutes);
app.use('/api/v1/cash', cashRoutes);
app.use('/api/v1/copilot', copilotRoutes);
app.use('/api/v1/control-score', controlScoreRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// Static uploads serving
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// AI & Chat Agent endpoints (/analyze, /agent/chat, etc.)
app.use('/api/v1', aiRoutes);

// Health check route
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      server: 'healthy',
      timestamp: new Date().toISOString()
    },
    message: 'Operation successful'
  });
});

app.use(errorHandler);

export default app;
