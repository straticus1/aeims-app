import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: 'dev-org' },
    update: {},
    create: {
      name: 'Development Organization',
      slug: 'dev-org',
      description: 'Local development organization for testing',
    },
  })
  console.log('✓ Created organization:', org.name)

  // Create user
  const user = await prisma.user.upsert({
    where: { email: 'dev@localhost' },
    update: {},
    create: {
      email: 'dev@localhost',
      username: 'dev',
      name: 'Development User',
      displayName: 'Dev User',
      emailVerified: true,
      isActive: true,
    },
  })
  console.log('✓ Created user:', user.email)

  // Link user to organization
  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
    },
  })
  console.log('✓ Linked user to organization')

  // Create some sample agents
  const agent1 = await prisma.agent.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'aeims-agent-01',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'aeims-agent-01',
      hostname: 'web-server-01',
      arch: 'amd64',
      os: 'linux',
      version: '1.0.0',
      status: 'ONLINE',
      publicIp: '54.123.45.67',
      privateIp: '10.0.1.100',
      lastSeenAt: new Date(),
      capabilities: {
        providers: ['docker', 'aws'],
        features: ['build', 'deploy'],
      },
    },
  })

  const agent2 = await prisma.agent.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'aeims-agent-02',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'aeims-agent-02',
      hostname: 'arm-builder',
      arch: 'arm64',
      os: 'linux',
      version: '1.0.0',
      status: 'ONLINE',
      publicIp: '129.153.158.177',
      privateIp: '10.0.0.10',
      lastSeenAt: new Date(),
      capabilities: {
        providers: ['docker', 'oci'],
        features: ['build'],
      },
    },
  })

  const agent3 = await prisma.agent.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'aeims-agent-03',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'aeims-agent-03',
      hostname: 'cache-server',
      arch: 'arm64',
      os: 'linux',
      version: '1.0.0',
      status: 'OFFLINE',
      publicIp: null,
      privateIp: '10.0.0.11',
      lastSeenAt: new Date(Date.now() - 3600000), // 1 hour ago
      capabilities: {
        providers: ['docker'],
        features: ['cache'],
      },
    },
  })

  console.log('✓ Created 3 agents')

  // Create some sample secrets
  const secret1 = await prisma.secret.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'jwt-secret',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'jwt-secret',
      type: 'JWT',
      description: 'JWT signing secret for production',
      valueEncrypted: Buffer.from('encrypted-jwt-secret-value'),
      tags: ['production', 'auth'],
    },
  })

  const secret2 = await prisma.secret.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'database-password',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'database-password',
      type: 'DATABASE',
      description: 'PostgreSQL production database password',
      valueEncrypted: Buffer.from('encrypted-db-password'),
      tags: ['production', 'database'],
    },
  })

  console.log('✓ Created 2 secrets')

  // Create sample deployments
  const deployment1 = await prisma.deployment.create({
    data: {
      organizationId: org.id,
      initiatedById: user.id,
      name: 'billing-api-v2.1.0',
      service: 'billing-api',
      environment: 'production',
      version: 'v2.1.0',
      previousVersion: 'v2.0.5',
      status: 'SUCCESS',
      provider: 'AWS',
      targetResources: ['i-0abc123def', 'i-0def456ghi'],
      startedAt: new Date(Date.now() - 7200000), // 2 hours ago
      completedAt: new Date(Date.now() - 7000000),
      duration: 200,
    },
  })

  const deployment2 = await prisma.deployment.create({
    data: {
      organizationId: org.id,
      initiatedById: user.id,
      name: 'admin-panel-v1.5.2',
      service: 'admin-panel',
      environment: 'staging',
      version: 'v1.5.2',
      previousVersion: 'v1.5.1',
      status: 'IN_PROGRESS',
      provider: 'DOCKER',
      targetResources: ['container-abc123'],
      startedAt: new Date(Date.now() - 300000), // 5 minutes ago
    },
  })

  console.log('✓ Created 2 deployments')

  // Create audit logs
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      action: 'agent.register',
      resourceType: 'agent',
      resourceId: agent1.id,
      details: {
        agentName: agent1.name,
        hostname: agent1.hostname,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'AEIMS Agent/1.0.0',
    },
  })

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      action: 'deployment.start',
      resourceType: 'deployment',
      resourceId: deployment1.id,
      details: {
        service: deployment1.service,
        version: deployment1.version,
        environment: deployment1.environment,
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
    },
  })

  console.log('✓ Created audit logs')

  console.log('')
  console.log('✅ Database seeded successfully!')
  console.log('')
  console.log('📝 You can now log in with:')
  console.log('   Email: dev@localhost')
  console.log('   (Development mode - no password required)')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
