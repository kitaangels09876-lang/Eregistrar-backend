import { Request, Response, NextFunction } from 'express';

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const errors: { field: string; message: string }[] = [];

    if (!email || typeof email !== 'string') {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!password || typeof password !== 'string') {
        errors.push({ field: 'password', message: 'Password is required' });
    } else if (password.length < 1) {
        errors.push({ field: 'password', message: 'Password cannot be empty' });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            message: 'Validation failed',
            errors
        });
    }

    req.body.email = email.trim().toLowerCase();
    req.body.password = password;

    next();
};