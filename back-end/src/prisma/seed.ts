import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create a Super Admin User
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {}, 
    create: {
      email: 'superadmin@example.com',
      password: hashedPassword,
      role: Role.SUPERADMIN,
    },
  });
  console.log(`Created super admin user: ${superAdmin.email}`);

  // Create an Owner User
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      password: hashedPassword,
      role: Role.OWNER,
    },
  });
  console.log(`Created owner user: ${ownerUser.email}`);

  // Create a Registered User
  const registeredUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: hashedPassword,
      role: Role.REGISTERED,
    },
  });
  console.log(`Created registered user: ${registeredUser.email}`);

  // Example of creating an UNREGISTERED user 
  const unregisteredUser = await prisma.user.upsert({
    where: { email: 'pending@example.com' },
    update: {},
    create: {
      email: 'pending@example.com',
      password: hashedPassword,
      role: Role.UNREGISTERED,
    },
  });
  console.log(`Created unregistered user: ${unregisteredUser.email}`);

  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });