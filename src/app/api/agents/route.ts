import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import prisma from '@/lib/prisma'

/**
 * GET /api/agents
 * List all agents for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()

    const agents = await prisma.agent.findMany({
      where: {
        organizationId: auth.organizationId,
      },
      orderBy: [
        { status: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Error fetching agents:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}
