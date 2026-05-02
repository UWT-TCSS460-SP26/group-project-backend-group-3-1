import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

/** Stable dev subject for JWT `sub` and local API testing (idempotent upsert). */
const DEV_SUBJECT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function main() {
  const user = await prisma.user.upsert({
    where: { subjectId: DEV_SUBJECT_ID },
    create: {
      subjectId: DEV_SUBJECT_ID,
      username: 'dev',
      email: 'dev@local',
      role: 'user',
    },
    update: {},
  });

  // eslint-disable-next-line no-console
  console.log('Seed: User ready. Use this value in JWT "sub" for local testing:');
  // eslint-disable-next-line no-console
  console.log(user.subjectId);
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
