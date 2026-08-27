import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth.routes';
import ledgerlyRoutes from './routes/ledgerly.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Expose Ledgerly and Auth routes on /api and /api/v1 prefixes
app.use('/api', ledgerlyRoutes);
app.use('/api/v1', ledgerlyRoutes);
app.use('/api/v1/auth', authRoutes);

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

export default app;
