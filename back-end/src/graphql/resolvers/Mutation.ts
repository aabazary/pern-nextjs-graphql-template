// import prisma from '../../prisma/db';
import { hashPassword, comparePassword, issueTokensAndSetCookie, generatePasswordResetToken } from '../../utils/authFunctions';
import { GraphQLError } from 'graphql';
// import { Role } from '@prisma/client'; // Will be replaced with local Role enum
import type { MyContext } from '../../types/context';
import transporter from '../../config/nodemailer';
import { User } from '../../entities/User';
import { Role } from '../../entities/Role';
import { RefreshToken } from '../../entities/RefreshToken';
import { PasswordResetToken } from '../../entities/PasswordResetToken';

interface AuthPayload {
  token: string;
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

const Mutation = {
  signup: async (
    parent: any,
    { email, password }: any,
    context: MyContext
  ): Promise<AuthPayload> => {
    const existingUser = await context.em.findOne(User, { email });
    if (existingUser) {
      throw new GraphQLError('Email already in use.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = context.em.create(User, {
      email,
      password: hashedPassword,
      role: Role.REGISTERED,
      createdAt: new Date(),
      updatedAt: new Date(),
      refreshTokens: [],
      passwordResetTokens: [],
    });
    await context.em.persistAndFlush(newUser);

    const accessToken = await issueTokensAndSetCookie(newUser, context);

    return { token: accessToken, user: newUser };
  },

  login: async (
    parent: any,
    { email, password }: any,
    context: MyContext
  ): Promise<AuthPayload> => {
    console.log('Login attempt for email:', email);
    
    const user = await context.em.findOne(User, { email });
    if (!user) {
      throw new GraphQLError('Invalid credentials.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new GraphQLError('Invalid credentials.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    console.log('Password valid, issuing tokens for user:', user.id);
    const accessToken = await issueTokensAndSetCookie(user, context);
    console.log('Tokens issued successfully');

    return { token: accessToken, user };
  },

  updateUser: async (
    parent: any,
    { id, email, role }: any,
    context: MyContext
  ): Promise<any> => { 
    // Authorization check: Only current user or superadmin can update.
    if (!context.user) {
      throw new GraphQLError('Unauthorized: You must be logged in to update a user.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Ensure user can only update their own profile unless they are SUPERADMIN
    if (context.user.id !== id && context.user.role !== Role.SUPERADMIN) {
      throw new GraphQLError('Forbidden: You can only update your own profile.', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Prevent non-superadmins from changing roles
    if (role && context.user.role !== Role.SUPERADMIN) {
      throw new GraphQLError('Forbidden: Only superadmins can change user roles.', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const user = await context.em.findOne(User, { id });
    if (!user) {
      throw new GraphQLError('User not found.', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    await context.em.persistAndFlush(user);
    return user;
  },

  deleteUser: async (
    parent: any,
    { id }: any,
    context: MyContext
  ): Promise<any> => { 
    // Authorization check: Only current user or superadmin can delete.
    if (!context.user) {
      throw new GraphQLError('Unauthorized: You must be logged in to delete a user.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Ensure user can only delete their own profile unless they are SUPERADMIN
    if (context.user.id !== id && context.user.role !== Role.SUPERADMIN) {
      throw new GraphQLError('Forbidden: You can only delete your own profile.', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Delete all refresh tokens for the user
    await context.em.nativeDelete(RefreshToken, { user: id });
    // Delete the user
    await context.em.nativeDelete(User, { id });
    return true;
  },

  requestPasswordReset: async (
    parent: any,
    { email }: { email: string },
    context: MyContext
  ): Promise<string> => {
    const user = await context.em.findOne(User, { email });
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return 'If your email exists, a password reset link has been sent.';
    }

    // Delete all unused password reset tokens for this user
    await context.em.nativeDelete(PasswordResetToken, { user: user.id, used: false });

    const { plainTextToken, hashedToken } = generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 3600 * 1000); // Token expires in 1 hour

    const resetToken = context.em.create(PasswordResetToken, {
      tokenHash: hashedToken,
      user: user,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });
    await context.em.persistAndFlush(resetToken);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${plainTextToken}&email=${encodeURIComponent(email)}`;

    try {
      await transporter.sendMail({ 
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <p>You requested a password reset for your account. Click the link below to reset your password:</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
        `,
      });
      console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error(`Error sending password reset email to ${user.email}:`, error);
    }

    return 'If your email exists, a password reset link has been sent.';
  }
};

export default Mutation;