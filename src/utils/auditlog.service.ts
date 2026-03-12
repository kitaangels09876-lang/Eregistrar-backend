import { AuditLog } from '../models/auditlog.model';
import { Request } from 'express';

interface LogActivityParams {
  userId?: number | null;
  action: string;
  tableName?: string | null;
  recordId?: number | null;
  oldValue?: object | null;
  newValue?: object | null;
  req?: Request;
}


export const logActivity = async ({
  userId = null,
  action,
  tableName = null,
  recordId = null,
  oldValue = null,
  newValue = null,
  req
}: LogActivityParams): Promise<void> => {
  try {
    const ipAddress = req
      ? (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
        req.socket.remoteAddress || 
        null
      : null;

    const userAgent = req ? req.headers['user-agent'] || null : null;

    await AuditLog.create({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};


export const getUserIdFromRequest = (req: Request): number | null => {
  return (req as any).user?.user_id || null;
};