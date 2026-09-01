import { prisma } from './src/lib/prisma';
import * as bcrypt from 'bcryptjs';

async function main() {
  const email = 'admin@gmail.com';
  const password = 'Admin@1234';
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN' },
    create: {
      name: 'Demo Admin',
      email,
      passwordHash,
      authProvider: 'EMAIL',
      role: 'ADMIN',
      emailVerified: true
    }
  });
  console.log('Successfully created/updated admin account:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
