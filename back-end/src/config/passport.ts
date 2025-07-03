import { Strategy as JwtStrategy, ExtractJwt, StrategyOptionsWithoutRequest } from 'passport-jwt'; 
import passport from 'passport';
import prisma from '../prisma/db'; 


interface JwtPayload {
  userId: string;
  role: string;
  iat: number; 
  exp: number; 
}

const configurePassport = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined for Passport.js JWT Strategy.');
  }

  const opts: StrategyOptionsWithoutRequest = { 
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET, 
  
  };

  passport.use(
    new JwtStrategy(opts, async (jwt_payload: JwtPayload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: jwt_payload.userId },
        });

        if (user) {
          return done(null, user); 
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