import { MikroORM } from '@mikro-orm/core';
import mikroOrmConfig from '../mikro-orm.config';
import bcrypt from 'bcrypt';
import { User } from './entities/User';
import { Role } from './entities/Role';

async function main() {
  const orm = await MikroORM.init(mikroOrmConfig);
  const em = orm.em.fork();

  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 12);

  // Helper to upsert user by email
  async function upsertUser(email: string, role: Role) {
    let user = await em.findOne(User, { email });
    if (!user) {
      user = em.create(User, {
        email,
        password: hashedPassword,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshTokens: [],
        passwordResetTokens: [],
      });
      await em.persistAndFlush(user);
      console.log(`Created user: ${user.email} (${role})`);
    } else {
      user.password = hashedPassword;
      user.role = role;
      user.updatedAt = new Date();
      await em.persistAndFlush(user);
      console.log(`Updated user: ${user.email} (${role})`);
    }
  }

  await upsertUser('superadmin@example.com', Role.SUPERADMIN);
  await upsertUser('owner@example.com', Role.OWNER);
  await upsertUser('user@example.com', Role.REGISTERED);
  await upsertUser('pending@example.com', Role.UNREGISTERED);

  console.log('Database seeding complete.');
  await orm.close(true);
}

main().catch((e) => {
  console.error('Error during seeding:', e);
  process.exit(1);
}); 