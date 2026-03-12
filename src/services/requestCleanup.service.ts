import { sequelize } from "../models";
import { acquireLock, releaseLock } from "../utils/dbLock.util";

export const softCleanupExpiredRequests = async (): Promise<number> => {
  const LOCK_NAME = "soft_cleanup_requests";

  const hasLock = await acquireLock(LOCK_NAME);
  if (!hasLock) {
    console.log("Soft cleanup skipped — lock already held");
    return 0;
  }

  try {
    const [result]: any = await sequelize.query(`
      UPDATE document_requests dr
      SET
        dr.is_archived = 1,
        dr.archived_at = NOW()
      WHERE
        dr.is_archived = 0
        AND dr.expires_at < NOW()
        AND (
          dr.request_status = 'rejected'
          OR NOT EXISTS (
            SELECT 1
            FROM payments p
            WHERE
              (
                p.request_id = dr.request_id
                OR p.batch_id IN (
                  SELECT br.batch_id
                  FROM batch_requests br
                  WHERE br.request_id = dr.request_id
                )
              )
              AND p.payment_status = 'verified'
          )
        )
    `);

    return result?.affectedRows || 0;
  } finally {
    await releaseLock(LOCK_NAME);
  }
};

export const hardCleanupArchivedRequests = async (): Promise<number> => {
  const LOCK_NAME = "hard_cleanup_requests";

  const hasLock = await acquireLock(LOCK_NAME);
  if (!hasLock) {
    console.log("Hard cleanup skipped — lock already held");
    return 0;
  }

  try {
    const [result]: any = await sequelize.query(`
      DELETE FROM document_requests
      WHERE
        is_archived = 1
        AND archived_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    return result?.affectedRows || 0;
  } finally {
    await releaseLock(LOCK_NAME);
  }
};
