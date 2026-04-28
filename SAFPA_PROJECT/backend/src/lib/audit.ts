import type { Request } from 'express';
import { prisma } from './prisma';
import { generateId } from './id';

interface AuditEventInput {
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  parlourId?: string;
  details?: string;
}

function timestampString(now: Date): string {
  return now.toISOString().replace('T', ' ').slice(0, 19);
}

function actorFromRequest(req: Request) {
  if (req.actor) {
    return {
      userId: req.actor.userId,
      userName: req.actor.userName,
      userRole: req.actor.role,
    };
  }

  return {
    userId: (req.headers['x-user-id'] as string) || 'system',
    userName: (req.headers['x-user-name'] as string) || 'System',
    userRole: (req.headers['x-user-role'] as string) || 'system',
  };
}

export async function writeAuditLog(req: Request, input: AuditEventInput): Promise<void> {
  const now = new Date();
  const actor = actorFromRequest(req);

  await prisma.auditEntry.create({
    data: {
      id: generateId('a'),
      timestamp: timestampString(now),
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      parlourId: input.parlourId,
      details: input.details,
    },
  });
}
