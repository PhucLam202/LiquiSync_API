// File: prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create permissions
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { name: 'READ' },
      update: {},
      create: {
        name: 'READ',
        description: 'Read access to data endpoints',
        category: 'data'
      }
    }),
    prisma.permission.upsert({
      where: { name: 'WRITE' },
      update: {},
      create: {
        name: 'WRITE',
        description: 'Write access to modify data',
        category: 'data'
      }
    }),
    prisma.permission.upsert({
      where: { name: 'DELETE' },
      update: {},
      create: {
        name: 'DELETE',
        description: 'Delete access to remove data',
        category: 'data'
      }
    }),
    prisma.permission.upsert({
      where: { name: 'CREATE' },
      update: {},
      create: {
        name: 'CREATE',
        description: 'Create new resources',
        category: 'data'
      }
    }),
    prisma.permission.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        description: 'Administrative access',
        category: 'admin'
      }
    })
  ]);

  // Create roles
  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Standard user role',
      priority: 1
    }
  });

  const premiumUserRole = await prisma.role.upsert({
    where: { name: 'PREMIUM_USER' },
    update: {},
    create: {
      name: 'PREMIUM_USER',
      description: 'Premium user with additional permissions',
      priority: 2
    }
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrator role',
      priority: 3
    }
  });

  // Assign permissions to roles
  try {
    await prisma.rolePermission.createMany({
      data: [
        // USER role - READ only
        {
          roleId: userRole.id,
          permissionId: permissions.find(p => p.name === 'READ')!.id
        },
        // PREMIUM_USER role - READ, WRITE, CREATE
        {
          roleId: premiumUserRole.id,
          permissionId: permissions.find(p => p.name === 'READ')!.id
        },
        {
          roleId: premiumUserRole.id,
          permissionId: permissions.find(p => p.name === 'WRITE')!.id
        },
        {
          roleId: premiumUserRole.id,
          permissionId: permissions.find(p => p.name === 'CREATE')!.id
        },
        // ADMIN role - All permissions
        ...permissions.map(permission => ({
          roleId: adminRole.id,
          permissionId: permission.id
        }))
      ]
    });
  } catch (error) {
    console.log('Role permissions already exist, skipping...');
  }

  console.log('Database seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });