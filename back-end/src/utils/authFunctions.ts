import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TokenPayload, JWTSigningPayload } from "../types/tokens";
import crypto from 'crypto';
import { RefreshToken } from '../entities/RefreshToken';
import type { MyContext } from "../types/context";

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const hashToken = async (token: string): Promise<string> => {
  // Use SHA-256 for deterministic hashing of tokens
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const compareToken = async (
  token: string,
  hash: string
): Promise<boolean> => {
  // For SHA-256, we just compare the hashes directly
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return tokenHash === hash;
};

export const generateAccessToken = (payload: JWTSigningPayload): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
};

export const generateRefreshToken = (payload: JWTSigningPayload): string => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error(
      "REFRESH_TOKEN_SECRET is not defined in environment variables"
    );
  }
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error(
      "REFRESH_TOKEN_SECRET is not defined in environment variables"
    );
  }
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET) as TokenPayload;
};

export const generatePasswordResetToken = (): { plainTextToken: string, hashedToken: string } => {
    const plainTextToken = crypto.randomBytes(32).toString('hex'); 
    const hashedToken = crypto.createHash('sha256').update(plainTextToken).digest('hex'); 
    return { plainTextToken, hashedToken };
};

export const verifyPasswordResetToken = (plainTextToken: string, hashedTokenFromDb: string): boolean => {
    const hashedTokenFromRequest = crypto.createHash('sha256').update(plainTextToken).digest('hex');
    return hashedTokenFromRequest === hashedTokenFromDb;
};

export const issueTokensAndSetCookie = async (
  user: { id: string; role: string; email: string }, 
  context: MyContext,
): Promise<string> => { 
  console.log('Issuing tokens for user:', user.id);
  
  const accessToken = generateAccessToken({ userId: user.id, role: user.role } as JWTSigningPayload);
  const refreshToken = generateRefreshToken({ userId: user.id, role: user.role } as JWTSigningPayload);

  const hashedRefreshToken = await hashToken(refreshToken);

  const refreshTokenPayload = verifyRefreshToken(refreshToken) as TokenPayload;
  const expiresAt = new Date(refreshTokenPayload.exp * 1000); 

  // Clean up old expired tokens and old bcrypt tokens for this user
  await context.em.nativeDelete(RefreshToken, {
    user: user.id,
    $or: [
      { expiresAt: { $lt: new Date() } },
      { tokenHash: { $like: '$2b$%' } }
    ]
  });
  
  const newRefreshToken = context.em.create(RefreshToken, {
    tokenHash: hashedRefreshToken,
    user: user.id,
    expiresAt: expiresAt,
    userAgent: context.req.headers['user-agent'] as string || 'Unknown',
    ipAddress: context.req.ip || 'Unknown',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await context.em.persistAndFlush(newRefreshToken);

  context.res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false, // Set to false for development (HTTP)
    sameSite: 'lax', 
    maxAge: 7 * 24 * 60 * 60 * 1000, 
    path: '/'
  });
  
  context.res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: false, // Set to false for development (HTTP)
    sameSite: 'lax', 
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  });

  return accessToken;
};