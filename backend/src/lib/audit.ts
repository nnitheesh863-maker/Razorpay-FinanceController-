import { prisma } from './prisma';

export async function logAudit(
  userId: string | undefined,
  userEmail: string | undefined,
  action: string,
  details: any,
  ipAddress?: string,
  entityType?: string,
  entityId?: string,
  previousValue?: any,
  newValue?: any,
  metadata?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        ipAddress: ipAddress || null,
        entityType: entityType || null,
        entityId: entityId || null,
        previousValue: previousValue || null,
        newValue: newValue || null,
        metadata: metadata || null,
      },
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}
