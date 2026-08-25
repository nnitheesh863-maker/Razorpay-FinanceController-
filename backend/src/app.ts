import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import transactionRoutes from './routes/transaction.routes';
import invoiceRoutes from './routes/invoice.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/invoices', invoiceRoutes);

// Basic health check route for Phase 1
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

export default app;
