import prisma from '../../prisma/db';
import { GraphQLError } from 'graphql';
import { MyContext } from '../../types'; 
import { Role } from '@prisma/client'; 

const Query = {
  users: async (parent: any, args: any, context: MyContext) => {
    // Authorization check: Only superadmins can view all users
    if (!context.user) {
      throw new GraphQLError('Unauthorized: You must be logged in to view users.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    if (context.user.role !== Role.SUPERADMIN ) {
      throw new GraphQLError('Forbidden: You do not have permission to view all users.', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    return prisma.user.findMany();
  },
  me: async (parent: any, args: any, context: MyContext) => {
    // Authorization check: User must be logged in to view their own profile
    if (!context.user) {
      throw new GraphQLError('Unauthorized: You must be logged in to view your profile.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: context.user.id },
    });
    if (!user) {
      throw new GraphQLError('User not found.', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    return user;
  },
};

export default Query;