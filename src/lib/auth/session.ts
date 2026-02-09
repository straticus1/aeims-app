import prisma from '@/lib/prisma'
import { randomBytes } from 'crypto'

export interface SessionData {
  oauth?: boolean
  accessToken?: string
  refreshToken?: string
  idToken?: string
  expiresAt?: number
}

export interface Session {
  id: string
  token: string
  userId: string
  data: SessionData | null
  expiresAt: Date
  createdAt: Date
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  sessionData: SessionData
): Promise<Session> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const session = await prisma.session.create({
    data: {
      token,
      userId,
      data: sessionData as any,
      expiresAt,
    },
  })

  return session as Session
}

/**
 * Get session by token
 */
export async function getSession(token: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({
    where: { token },
  })

  if (!session) {
    return null
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } })
    return null
  }

  return session as Session
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } }).catch(() => {})
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
}
