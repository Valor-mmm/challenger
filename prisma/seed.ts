import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {

  // cleanup the existing database
  await prisma.user.deleteMany().catch(() => {
    // no worries if it doesn't exist yet
  })

  const template1 = await prisma.template.create({
    data: {
      name: 'Test template 1'
    }
  })

  const template2 = await prisma.template.create({
    data: {
      name: 'Test template 2'
    }
  })

  const challengePointMap1 = await prisma.challengePointMap.create({
    data: {
      challenge: '45m',
      points: 2,

      templateId: template1.id
    }
  })

  const challengePointMap2 = await prisma.challengePointMap.create({
    data: {
      challenge: '90m',
      points: 3,

      templateId: template1.id
    }
  })

  const challengePointMap3 = await prisma.challengePointMap.create({
    data: {
      challenge: 'default',
      points: 2,

      templateId: template2.id
    }
  })

  const user1 = await prisma.user.create({
    data: {
      name: 'Test User 1',
      email: 'a@b.com',

      isAdmin: false
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Test User 2',
      email: 'c@d.com',

      isAdmin: false
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'ad@min.com',

      isAdmin: true
    },
  });

  const activiy1 = await prisma.activity.create({
    data: {
      userId: user1.id,
      challengePointMapId: challengePointMap1.id
    }
  })

  const activiy2 = await prisma.activity.create({
    data: {
      userId: user1.id,
      challengePointMapId: challengePointMap3.id
    }
  })

  const activiy3 = await prisma.activity.create({
    data: {
      userId: adminUser.id,
      challengePointMapId: challengePointMap2.id
    }
  })

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
