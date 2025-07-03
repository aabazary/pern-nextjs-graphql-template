import { Router, Request, Response } from "express";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyPasswordResetToken,
  hashPassword,
} from "../utils/authFunctions";
import prisma from "../prisma/db";
import { TokenPayload, JWTSigningPayload } from "../types";

const authRouter = Router();

authRouter.post("/refresh-token", async (req: Request, res: Response) => {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    return res.status(401).json({ message: "No refresh token provided." });
  }

  try {
    const payload = verifyRefreshToken(oldRefreshToken) as TokenPayload;
    const userId = payload.userId;

    const hashedOldRefreshToken = await hashToken(oldRefreshToken);

    const refreshTokenRecord = await prisma.refreshToken.findUnique({
      where: {
        tokenHash: hashedOldRefreshToken,
      },
      include: {
        user: true,
      },
    });

    // Check if the record exists and belongs to the correct user
    if (!refreshTokenRecord || refreshTokenRecord.userId !== userId) {
      console.warn(
        "Refresh token not found or mismatch in DB. Potential reuse or invalid token."
      );
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/refresh-token",
      });
      return res.status(403).json({
        message: "Invalid or revoked refresh token. Please log in again.",
      });
    }

    // --- Refresh Token Rotation ---
    const newAccessToken = generateAccessToken({
      userId: userId,
      role: refreshTokenRecord.user.role,
    } as JWTSigningPayload);
    const newRefreshToken = generateRefreshToken({
      userId: userId,
      role: refreshTokenRecord.user.role,
    } as JWTSigningPayload);

    const hashedNewRefreshToken = await hashToken(newRefreshToken);
    const newRefreshTokenPayload = verifyRefreshToken(
      newRefreshToken
    ) as TokenPayload;
    const newExpiresAt = new Date(newRefreshTokenPayload.exp * 1000);

    await prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: {
        tokenHash: hashedNewRefreshToken,
        expiresAt: newExpiresAt,
        userAgent:
          (req.headers["user-agent"] as string) ||
          refreshTokenRecord.userAgent ||
          "Unknown",
        ipAddress: req.ip || refreshTokenRecord.ipAddress || "Unknown",
      },
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/refresh-token",
      sameSite: "lax",
    });

    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh token error:", error);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/refresh-token",
    });
    return res.status(403).json({
      message: "Invalid or expired refresh token. Please log in again.",
    });
  }
});

authRouter.post("/logout", async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken) as TokenPayload;
      const userId = payload.userId;

      const hashedIncomingToken = await hashToken(refreshToken);

      await prisma.refreshToken.deleteMany({
        where: {
          tokenHash: hashedIncomingToken,
          userId: userId,
        },
      });
      console.log(`User ${userId} specific refresh token revoked (via hash).`);
    } catch (error) {
      console.warn(
        "Logout: Invalid refresh token during revocation attempt or token already revoked."
      );
    }
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/refresh-token",
  });

  return res.status(200).json({ message: "Logged out successfully." });
});

authRouter.post("/reset-password", async (req: Request, res: Response) => {
    const { token, email, newPassword } = req.body; 

    if (!token || !email || !newPassword) {
        return res.status(400).json({ message: "Missing token, email, or new password." });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Log for monitoring, but return generic error for security
            // Will potentially remove in production
            console.warn(`Password reset attempt for non-existent email: ${email}`);
            return res.status(400).json({ message: "Invalid or expired token. Please try again." });
        }

        const passwordResetRecord = await prisma.passwordResetToken.findFirst({
            where: {
                userId: user.id,
                expiresAt: {
                    gt: new Date(), 
                },
                used: false, 
            },
            orderBy: {
                createdAt: 'desc', 
            },
        });

        if (!passwordResetRecord || !verifyPasswordResetToken(token, passwordResetRecord.tokenHash)) {
            console.warn(`Invalid or expired password reset token for user ${user.id}`);
            return res.status(400).json({ message: "Invalid or expired token. Please try again." });
        }

        // Mark the token as used immediately to prevent replay attacks
        await prisma.passwordResetToken.update({
            where: { id: passwordResetRecord.id },
            data: { used: true },
        });

        const hashedPassword = await hashPassword(newPassword);

        // Update user's password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Delete all refresh tokens associated with the user
        await prisma.refreshToken.deleteMany({
            where: { userId: user.id },
        });
        console.log(`All refresh tokens revoked for user ${user.id} after password reset.`);

        return res.status(200).json({ message: "Password reset successfully. Please log in with your new password." });

    } catch (error) {
        console.error("Error during password reset:", error);
        return res.status(500).json({ message: "An error occurred during password reset." });
    }
});
export default authRouter;
