import crypto from "crypto";
import { QueryTypes } from "sequelize";
import { sequelize } from "../../models";

const REFRESH_TOKEN_TTL_DAYS = 7;

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const ensureRefreshTokenTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      refresh_token_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      rotated_from_id INT NULL,
      ip_address VARCHAR(64) NULL,
      user_agent TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (rotated_from_id) REFERENCES refresh_tokens(refresh_token_id)
    ) ENGINE=InnoDB;
  `);
};

export const issueRefreshToken = async ({
  userId,
  ipAddress,
  userAgent,
  rotatedFromId,
}: {
  userId: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  rotatedFromId?: number | null;
}) => {
  await ensureRefreshTokenTable();

  const rawToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(rawToken);

  await sequelize.query(
    `
    INSERT INTO refresh_tokens (
      user_id,
      token_hash,
      expires_at,
      rotated_from_id,
      ip_address,
      user_agent
    ) VALUES (
      :userId,
      :tokenHash,
      DATE_ADD(NOW(), INTERVAL :ttl DAY),
      :rotatedFromId,
      :ipAddress,
      :userAgent
    )
    `,
    {
      replacements: {
        userId,
        tokenHash,
        ttl: REFRESH_TOKEN_TTL_DAYS,
        rotatedFromId: rotatedFromId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
      type: QueryTypes.INSERT,
    }
  );

  return rawToken;
};

export const findRefreshToken = async (rawToken: string) => {
  await ensureRefreshTokenTable();

  const tokenHash = hashToken(rawToken);
  const [row]: any[] = await sequelize.query(
    `
    SELECT *
    FROM refresh_tokens
    WHERE token_hash = :tokenHash
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
    `,
    {
      replacements: { tokenHash },
      type: QueryTypes.SELECT,
    }
  );

  return row || null;
};

export const revokeRefreshToken = async (rawToken: string) => {
  await ensureRefreshTokenTable();

  const tokenHash = hashToken(rawToken);
  await sequelize.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE token_hash = :tokenHash
      AND revoked_at IS NULL
    `,
    {
      replacements: { tokenHash },
      type: QueryTypes.UPDATE,
    }
  );
};

export const revokeRefreshTokenById = async (refreshTokenId: number) => {
  await ensureRefreshTokenTable();

  await sequelize.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE refresh_token_id = :refreshTokenId
      AND revoked_at IS NULL
    `,
    {
      replacements: { refreshTokenId },
      type: QueryTypes.UPDATE,
    }
  );
};
