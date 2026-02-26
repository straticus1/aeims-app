import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import prisma from '@/lib/prisma'
import { encryptJSON } from '@/lib/crypto'
import { CloudProvider } from '@prisma/client'

/**
 * GET /api/credentials
 * List all cloud credentials for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()

    const credentials = await prisma.userCloudCredential.findMany({
      where: {
        userId: auth.user.id,
        organizationId: auth.organizationId,
      },
      select: {
        id: true,
        provider: true,
        name: true,
        description: true,
        region: true,
        isValid: true,
        lastValidated: true,
        lastScanAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ credentials })
  } catch (error) {
    console.error('Error fetching credentials:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/credentials
 * Create a new cloud credential for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const body = await request.json()

    const { provider, name, description, region, credentials } = body

    // Validate required fields
    if (!provider || !name || !credentials) {
      return NextResponse.json(
        { error: 'Provider, name, and credentials are required' },
        { status: 400 }
      )
    }

    // Validate provider
    if (!Object.values(CloudProvider).includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${Object.values(CloudProvider).join(', ')}` },
        { status: 400 }
      )
    }

    // Validate provider-specific credentials
    const validationError = validateCredentials(provider, credentials)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    // Encrypt credentials
    const encryptedCredentials = encryptJSON(credentials)

    // Create credential
    const credential = await prisma.userCloudCredential.create({
      data: {
        userId: auth.user.id,
        organizationId: auth.organizationId,
        provider,
        name,
        description,
        region,
        credentials: encryptedCredentials,
      },
      select: {
        id: true,
        provider: true,
        name: true,
        description: true,
        region: true,
        isValid: true,
        lastValidated: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ credential }, { status: 201 })
  } catch (error) {
    console.error('Error creating credential:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to create credential' },
      { status: 500 }
    )
  }
}

/**
 * Validate provider-specific credentials
 */
function validateCredentials(provider: CloudProvider, credentials: any): string | null {
  switch (provider) {
    case 'AWS':
      if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        return 'AWS credentials require accessKeyId and secretAccessKey'
      }
      break

    case 'OCI':
      if (!credentials.tenancy || !credentials.user || !credentials.fingerprint || !credentials.privateKey) {
        return 'OCI credentials require tenancy, user, fingerprint, and privateKey'
      }
      break

    case 'GCP':
      if (!credentials.projectId || !credentials.privateKey || !credentials.clientEmail) {
        return 'GCP credentials require projectId, privateKey, and clientEmail'
      }
      break

    case 'AZURE':
      if (!credentials.subscriptionId || !credentials.tenantId || !credentials.clientId || !credentials.clientSecret) {
        return 'Azure credentials require subscriptionId, tenantId, clientId, and clientSecret'
      }
      break

    case 'CLOUDFLARE':
      if (!credentials.apiToken && !credentials.apiKey) {
        return 'Cloudflare credentials require either apiToken or apiKey'
      }
      break

    case 'DOCKER':
      // Docker credentials are optional (can use local Docker daemon)
      break

    case 'KUBERNETES':
      if (!credentials.kubeconfig && !credentials.server) {
        return 'Kubernetes credentials require either kubeconfig or server URL'
      }
      break

    default:
      return `Unsupported provider: ${provider}`
  }

  return null
}
