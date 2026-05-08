/* eslint-disable no-console -- stderr for Jest globalSetup child process */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

/**
 * Shared users for integration tests (reviews, ratings, etc.).
 * Run once from Jest globalSetup so parallel workers never race on the same subjectId upserts.
 */
async function seedIntegrationUsers(): Promise<void> {
  await prisma.user.upsert({
    where: { subjectId: 'test-sub-123' },
    create: {
      subjectId: 'test-sub-123',
      username: 'test-sub-123',
      email: 'integration-dev@test.local',
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { subjectId: 'other-user-123' },
    create: {
      subjectId: 'other-user-123',
      username: 'other-user-123',
      email: 'integration-other@test.local',
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { subjectId: 'admin-user-123' },
    create: {
      subjectId: 'admin-user-123',
      username: 'admin-user-123',
      email: 'integration-admin@test.local',
      role: 'Admin',
    },
    update: { role: 'Admin' },
  });

  await prisma.user.upsert({
    where: { subjectId: 'reviews-me-user' },
    create: {
      subjectId: 'reviews-me-user',
      username: 'reviews-me-user',
      email: 'reviews-me@test.local',
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { subjectId: 'ratings-me-user' },
    create: {
      subjectId: 'ratings-me-user',
      username: 'ratings-me-user',
      email: 'ratings-me@test.local',
    },
    update: {},
  });
}

void (async () => {
  try {
    await seedIntegrationUsers();
  } catch (err: unknown) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
