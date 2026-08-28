import { prisma } from './prisma';

export async function logAudit(
  userId: string | undefined,
  userEmail: string | undefined,
  action: string,
  details: any,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}
