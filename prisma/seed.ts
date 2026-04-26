import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

/** Stable dev user for JWT `sub` and `POST /reviews` testing (idempotent upsert). */
const DEV_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function main() {
  const user = await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    create: {
      id: DEV_USER_ID,
      username: 'dev',
      email: 'dev@local',
    },
    update: {},
  });

  // eslint-disable-next-line no-console
  console.log('Seed: User ready. Use this UserID in JWT "sub" for local testing:');
  // eslint-disable-next-line no-console
  console.log(user.id);
}

void main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
