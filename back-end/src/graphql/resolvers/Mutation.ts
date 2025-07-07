import prisma from '../../prisma/db';
import { hashPassword, comparePassword, issueTokensAndSetCookie, generatePasswordResetToken } from '../../utils/authFunctions';
import { GraphQLError } from 'graphql';
import { Role } from '@prisma/client'; 
import { MyContext } from '../../types'; 
import transporter from '../../config/nodemailer';

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
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new GraphQLError('Email already in use.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: Role.REGISTERED, 
      },
    });

    const accessToken = await issueTokensAndSetCookie(newUser, context);

    return { token: accessToken, user: newUser };
  },

  login: async (
    parent: any,
    { email, password }: any,
    context: MyContext
  ): Promise<AuthPayload> => {
    console.log('Login attempt for email:', email);
    
    const user = await prisma.user.findUnique({ where: { email } });
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

    const dataToUpdate: { email?: string; role?: Role } = {};
    if (email !== undefined) dataToUpdate.email = email;
    if (role !== undefined) dataToUpdate.role = role;

    if (Object.keys(dataToUpdate).length === 0) {
      throw new GraphQLError('No data provided for update.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    return prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });
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

    await prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    return prisma.user.delete({
      where: { id },
    });
  },

   requestPasswordReset: async (
        parent: any,
        { email }: { email: string },
        context: MyContext
    ): Promise<string> => {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return 'If your email exists, a password reset link has been sent.';
        }

        await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id, used: false },
        });

        const { plainTextToken, hashedToken } = generatePasswordResetToken();
        const expiresAt = new Date(Date.now() + 3600 * 1000); // Token expires in 1 hour

        await prisma.passwordResetToken.create({
            data: {
                tokenHash: hashedToken,
                userId: user.id,
                expiresAt,
            },
        });

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