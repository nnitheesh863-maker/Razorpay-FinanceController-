import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        name: string;
        email?: string | null;
        phoneNumber?: string | null;
      };
    }
  }
}
