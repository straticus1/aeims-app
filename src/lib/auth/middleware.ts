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
  const auth = await getAuthUser()

  if (!auth) {
    throw new Error('Unauthorized')
  }

  return auth
}
