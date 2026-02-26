import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import prisma from '@/lib/prisma'
import { decryptJSON } from '@/lib/crypto'
import { getProviderRegistry } from '@/lib/providers'

/**
 * POST /api/credentials/[id]/scan
 * Scan cloud account for resources using the provided credentials
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    const { id } = await params

    // Get credential
    const credentialRecord = await prisma.userCloudCredential.findFirst({
      where: {
        id,
        userId: auth.user.id,
        organizationId: auth.organizationId,
      },
    })

    if (!credentialRecord) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    // Decrypt credentials
    const credentials = decryptJSON(credentialRecord.credentials as string)

    // Get provider registry
    const registry = getProviderRegistry()

    let scanResults: any = {
      provider: credentialRecord.provider,
      timestamp: new Date().toISOString(),
      compute: [],
      containers: [],
      dns: [],
      errors: [],
    }

    try {
      // Scan based on provider type
      switch (credentialRecord.provider) {
        case 'AWS':
          scanResults = await scanAWS(registry, credentials, credentialRecord.region || undefined)
          break

        case 'OCI':
          scanResults = await scanOCI(registry, credentials, credentialRecord.region || undefined)
          break

        case 'GCP':
          scanResults = await scanGCP(registry, credentials, credentialRecord.region || undefined)
          break

        case 'AZURE':
          scanResults = await scanAzure(registry, credentials, credentialRecord.region || undefined)
          break

        case 'CLOUDFLARE':
          scanResults = await scanCloudflare(registry, credentials)
          break

        case 'DOCKER':
          scanResults = await scanDocker(registry, credentials)
          break

        case 'KUBERNETES':
          scanResults = await scanKubernetes(registry, credentials)
          break

        default:
          return NextResponse.json(
            { error: `Scanning not supported for provider: ${credentialRecord.provider}` },
            { status: 400 }
          )
      }

      // Update credential validation status
      await prisma.userCloudCredential.update({
        where: { id },
        data: {
          isValid: scanResults.errors.length === 0,
          lastValidated: new Date(),
          lastScanAt: new Date(),
        },
      })

      // Store discovered resources
      const resourceCount = await storeDiscoveredResources(
        auth.organizationId,
        credentialRecord.id,
        credentialRecord.provider,
        scanResults
      )

      return NextResponse.json({
        success: true,
        results: scanResults,
        resourcesStored: resourceCount,
      })
    } catch (scanError) {
      console.error('Scan error:', scanError)

      // Mark credential as invalid
      await prisma.userCloudCredential.update({
        where: { id },
        data: {
          isValid: false,
          lastValidated: new Date(),
        },
      })

      return NextResponse.json(
        {
          error: 'Scan failed',
          message: scanError instanceof Error ? scanError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error scanning credential:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to scan credential' },
      { status: 500 }
    )
  }
}

async function scanAWS(registry: any, credentials: any, region?: string) {
  const results: any = { compute: [], containers: [], dns: [], errors: [] }

  try {
    // Register temporary AWS provider
    const awsProvider = registry.registerAWSCompute({
      provider: 'AWS',
      region: region || 'us-east-1',
      credentials: credentials,
      id: 'temp-scan',
      name: 'Temporary Scan',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    if (awsProvider) {
      try {
        const instances = await awsProvider.listInstances()
        results.compute = instances
      } catch (error) {
        results.errors.push({
          service: 'EC2',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Try to scan ECS containers
    const containerProvider = registry.registerAWSContainer({
      provider: 'AWS',
      region: region || 'us-east-1',
      credentials: credentials,
      id: 'temp-scan-container',
      name: 'Temporary Scan Container',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    if (containerProvider) {
      try {
        const containers = await containerProvider.listContainers()
        results.containers = containers
      } catch (error) {
        results.errors.push({
          service: 'ECS',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Try to scan Route53 DNS
    const dnsProvider = registry.registerAWSDns({
      provider: 'AWS',
      region: region || 'us-east-1',
      credentials: credentials,
      id: 'temp-scan-dns',
      name: 'Temporary Scan DNS',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    if (dnsProvider) {
      try {
        const zones = await dnsProvider.listZones()
        results.dns = zones
      } catch (error) {
        results.errors.push({
          service: 'Route53',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  } catch (error) {
    results.errors.push({
      service: 'AWS',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return results
}

async function scanOCI(registry: any, credentials: any, region?: string) {
  return {
    compute: [],
    containers: [],
    dns: [],
    errors: [{ service: 'OCI', error: 'OCI scanning not yet implemented' }],
  }
}

async function scanGCP(registry: any, credentials: any, region?: string) {
  return {
    compute: [],
    containers: [],
    dns: [],
    errors: [{ service: 'GCP', error: 'GCP scanning not yet implemented' }],
  }
}

async function scanAzure(registry: any, credentials: any, region?: string) {
  return {
    compute: [],
    containers: [],
    dns: [],
    errors: [{ service: 'Azure', error: 'Azure scanning not yet implemented' }],
  }
}

async function scanCloudflare(registry: any, credentials: any) {
  return {
    compute: [],
    containers: [],
    dns: [],
    errors: [{ service: 'Cloudflare', error: 'Cloudflare scanning not yet implemented' }],
  }
}

async function scanDocker(registry: any, credentials: any) {
  return {
    compute: [],
    containers: [],
    dns: [],
    errors: [{ service: 'Docker', error: 'Docker scanning not yet implemented' }],
  }
}

async function scanKubernetes(registry: any, credentials: any) {
  return {
    compute: [],
    containers: [],
    dns: [],
    errors: [{ service: 'Kubernetes', error: 'Kubernetes scanning not yet implemented' }],
  }
}

/**
 * Store discovered resources in the database
 */
async function storeDiscoveredResources(
  organizationId: string,
  credentialId: string,
  provider: any,
  scanResults: any
): Promise<number> {
  let count = 0

  // Store compute instances
  for (const instance of scanResults.compute) {
    try {
      await prisma.resource.upsert({
        where: {
          organizationId_provider_providerId: {
            organizationId,
            provider,
            providerId: instance.id,
          },
        },
        create: {
          organizationId,
          credentialId,
          provider,
          type: 'COMPUTE_INSTANCE',
          providerId: instance.id,
          name: instance.name,
          region: instance.region,
          zone: instance.zone,
          status: instance.state,
          state: instance,
          metadata: {},
          tags: instance.tags || {},
          lastSyncedAt: new Date(),
        },
        update: {
          credentialId,
          name: instance.name,
          status: instance.state,
          state: instance,
          tags: instance.tags || {},
          lastSyncedAt: new Date(),
        },
      })
      count++
    } catch (error) {
      console.error('Error storing compute resource:', error)
    }
  }

  // Store containers
  for (const container of scanResults.containers) {
    try {
      await prisma.resource.upsert({
        where: {
          organizationId_provider_providerId: {
            organizationId,
            provider,
            providerId: container.id,
          },
        },
        create: {
          organizationId,
          credentialId,
          provider,
          type: 'CONTAINER',
          providerId: container.id,
          name: container.name,
          region: container.region,
          status: container.state,
          state: container,
          metadata: {},
          lastSyncedAt: new Date(),
        },
        update: {
          credentialId,
          name: container.name,
          status: container.state,
          state: container,
          lastSyncedAt: new Date(),
        },
      })
      count++
    } catch (error) {
      console.error('Error storing container resource:', error)
    }
  }

  // Store DNS zones
  for (const zone of scanResults.dns) {
    try {
      await prisma.resource.upsert({
        where: {
          organizationId_provider_providerId: {
            organizationId,
            provider,
            providerId: zone.id,
          },
        },
        create: {
          organizationId,
          credentialId,
          provider,
          type: 'DNS_ZONE',
          providerId: zone.id,
          name: zone.name,
          state: zone,
          metadata: {},
          lastSyncedAt: new Date(),
        },
        update: {
          credentialId,
          name: zone.name,
          state: zone,
          lastSyncedAt: new Date(),
        },
      })
      count++
    } catch (error) {
      console.error('Error storing DNS resource:', error)
    }
  }

  return count
}
