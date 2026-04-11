import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

export const generateToken = (user: any) => {
  const { user_id, email, roles, account_type } = user;

  return jwt.sign(
    { user_id, email, roles, account_type },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' }
  );
};
