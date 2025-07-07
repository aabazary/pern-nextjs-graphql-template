import { GraphQLError } from 'graphql';
import type { MyContext } from '../../types/context';
import { User } from '../../entities/User';
import { Role } from '../../entities/Role';

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
    return await context.em.find(User, {});
  },
  me: async (parent: any, args: any, context: MyContext) => {
    // Authorization check: User must be logged in to view their own profile
    if (!context.user) {
      throw new GraphQLError('Unauthorized: You must be logged in to view your profile.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const user = await context.em.findOne(User, { id: context.user.id });
    if (!user) {
      throw new GraphQLError('User not found.', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    return user;
  },
};

export default Query;