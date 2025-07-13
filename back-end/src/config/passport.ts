import { Strategy as JwtStrategy, ExtractJwt, StrategyOptionsWithoutRequest } from 'passport-jwt'; 
import passport from 'passport';
import { MikroORM } from '@mikro-orm/core';
import mikroOrmConfig from '../../mikro-orm.config';
import { User } from '../entities/User';

interface JwtPayload {
  userId: string;
  role: string;
  iat: number; 
  exp: number; 
}

let orm: MikroORM;

const configurePassport = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined for Passport.js JWT Strategy.');
  }

  // Initialize MikroORM
  orm = await MikroORM.init(mikroOrmConfig);

  const opts: StrategyOptionsWithoutRequest = { 
    jwtFromRequest: (req) => {
      // Try to get token from Authorization header first (for backward compatibility)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      
      // Then try to get from cookies
      return req.cookies?.accessToken || null;
    },
    secretOrKey: process.env.JWT_SECRET, 
  
  };

  passport.use(
    new JwtStrategy(opts, async (jwt_payload: JwtPayload, done) => {
      try {
        const em = orm.em.fork();
        const user = await em.findOne(User, { id: jwt_payload.userId });

        if (user) {
          return done(null, { id: user.id, email: user.email, role: user.role });
        } else {
          return done(null, false, { message: 'User not found' }); 
        }
      } catch (error) {
        if (error instanceof Error) {
          return done(error, false, { message: `Internal server error: ${error.message}` });
        }
        return done(new Error('Internal server error'), false, { message: 'Unknown internal server error' });
      }
    })
  );
};

export default configurePassport;