import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

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
