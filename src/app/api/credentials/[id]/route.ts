import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import prisma from '@/lib/prisma'
import { encryptJSON, decryptJSON } from '@/lib/crypto'

/**
 * GET /api/credentials/[id]
 * Get a specific credential
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    const { id } = await params

    const credential = await prisma.userCloudCredential.findFirst({
      where: {
        id,
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
    })

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ credential })
  } catch (error) {
    console.error('Error fetching credential:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch credential' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/credentials/[id]
 * Update a credential
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    const body = await request.json()
    const { id } = await params

    // Check if credential exists and belongs to user
    const existing = await prisma.userCloudCredential.findFirst({
      where: {
        id,
        userId: auth.user.id,
        organizationId: auth.organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    const { name, description, region, credentials } = body

    // Prepare update data
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (region !== undefined) updateData.region = region

    if (credentials !== undefined) {
      // Encrypt new credentials
      updateData.credentials = encryptJSON(credentials)
      // Reset validation status
      updateData.isValid = true
      updateData.lastValidated = null
    }

    // Update credential
    const credential = await prisma.userCloudCredential.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ credential })
  } catch (error) {
    console.error('Error updating credential:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to update credential' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/credentials/[id]
 * Delete a credential
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    const { id } = await params

    // Check if credential exists and belongs to user
    const existing = await prisma.userCloudCredential.findFirst({
      where: {
        id,
        userId: auth.user.id,
        organizationId: auth.organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    // Delete credential
    await prisma.userCloudCredential.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting credential:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to delete credential' },
      { status: 500 }
    )
  }
}
