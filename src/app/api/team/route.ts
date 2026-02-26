import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import prisma from '@/lib/prisma'

/**
 * GET /api/team
 * List all team members for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()

    const orgUsers = await prisma.organizationUser.findMany({
      where: {
        organizationId: auth.organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { user: { email: 'asc' } },
      ],
    })

    const members = orgUsers.map(ou => ({
      ...ou.user,
      role: ou.role,
    }))

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching team members:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}
