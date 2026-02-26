import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import prisma from '@/lib/prisma'
import { CloudProvider, ResourceType } from '@prisma/client'

/**
 * GET /api/resources
 * List resources for the current user's organization
 * Query params:
 *   - provider: Filter by cloud provider (AWS, OCI, GCP, etc.)
 *   - type: Filter by resource type (COMPUTE_INSTANCE, CONTAINER, etc.)
 *   - unified: If true, return unified view across all providers
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const { searchParams } = new URL(request.url)

    const provider = searchParams.get('provider') as CloudProvider | null
    const type = searchParams.get('type') as ResourceType | null
    const unified = searchParams.get('unified') === 'true'

    // Build where clause
    const where: any = {
      organizationId: auth.organizationId,
    }

    if (provider && !unified) {
      where.provider = provider
    }

    if (type) {
      where.type = type
    }

    // Get resources
    const resources = await prisma.resource.findMany({
      where,
      include: {
        credential: {
          select: {
            name: true,
            provider: true,
            region: true,
          },
        },
        agent: {
          select: {
            name: true,
            hostname: true,
          },
        },
      },
      orderBy: [
        { provider: 'asc' },
        { type: 'asc' },
        { name: 'asc' },
      ],
    })

    // Group by provider if unified view
    if (unified) {
      const grouped = resources.reduce((acc, resource) => {
        const providerKey = resource.provider
        if (!acc[providerKey]) {
          acc[providerKey] = {
            provider: providerKey,
            count: 0,
            resources: [],
          }
        }
        acc[providerKey].count++
        acc[providerKey].resources.push(resource)
        return acc
      }, {} as Record<string, any>)

      return NextResponse.json({
        unified: true,
        providers: Object.values(grouped),
        totalResources: resources.length,
      })
    }

    return NextResponse.json({
      resources,
      count: resources.length,
    })
  } catch (error) {
    console.error('Error fetching resources:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    )
  }
}
