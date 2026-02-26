import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from './session'
import prisma from '@/lib/prisma'

export interface AuthUser {
  id: string
  email: string
  username: string | null
  name: string | null
  displayName: string | null
  avatarUrl: string | null
}

export interface AuthSession {
  user: AuthUser
  organizationId: string
  role: string
}

/**
 * Get the current authenticated user from the session cookie
 */
export async function getAuthUser(request?: NextRequest): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session_token')?.value

  if (!sessionToken) {
    return null
  }

  const session = await getSession(sessionToken)

  if (!session) {
    return null
  }

  // Get user with their organization
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      organizations: {
        include: {
          organization: true,
        },
        take: 1,
      },
    },
  })

  if (!user || !user.isActive) {
    return null
  }

  // Get the user's primary organization
  const orgUser = user.organizations[0]

  if (!orgUser) {
    return null
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    organizationId: orgUser.organizationId,
    role: orgUser.role,
  }
}

/**
 * Require authentication for an API route
 * Returns the authenticated user or throws an error response
 */
export async function requireAuth(): Promise<AuthSession> {
  // Development mode bypass (ONLY for local development)
  // This is controlled by SKIP_AUTH=true in .env (NOT in production)
  if (process.env.SKIP_AUTH === 'true' && process.env.NODE_ENV === 'development') {
    // Create or get dev user
    const devUser = await getOrCreateDevUser()
    return devUser
  }

  // Production mode: use normal OAuth authentication
  const auth = await getAuthUser()

  if (!auth) {
    throw new Error('Unauthorized')
  }

  return auth
}

/**
 * Get or create a development user for local testing
 * ONLY used when SKIP_AUTH=true AND NODE_ENV=development
 */
async function getOrCreateDevUser(): Promise<AuthSession> {
  const DEV_EMAIL = 'dev@localhost'

  // Find or create dev user
  let user = await prisma.user.findUnique({
    where: { email: DEV_EMAIL },
    include: {
      organizations: {
        include: {
          organization: true,
        },
      },
    },
  })

  if (!user) {
    // Create dev organization
    const org = await prisma.organization.create({
      data: {
        name: 'Development Organization',
        slug: 'dev-org',
        description: 'Local development organization',
      },
    })

    // Create dev user
    user = await prisma.user.create({
      data: {
        email: DEV_EMAIL,
        username: 'dev',
        name: 'Development User',
        displayName: 'Dev User',
        emailVerified: true,
        isActive: true,
        organizations: {
          create: {
            organizationId: org.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    })
  }

  const orgUser = user.organizations[0]

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    organizationId: orgUser.organizationId,
    role: orgUser.role,
  }
}
