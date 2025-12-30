// AEIMS - Build Job API Routes
// Individual build job management

import { NextRequest, NextResponse } from 'next/server';
import { getProviderRegistry } from '@/lib/providers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/builds/:id - Get build job details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const registry = getProviderRegistry();
    const buildProvider = registry.getBuildProvider();

    if (!buildProvider) {
      return NextResponse.json(
        { error: 'Build provider not configured' },
        { status: 503 }
      );
    }

    const job = await buildProvider.getJob(id);

    if (!job) {
      return NextResponse.json(
        { error: 'Build job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Failed to get build job:', error);
    return NextResponse.json(
      { error: 'Failed to get build job' },
      { status: 500 }
    );
  }
}

// DELETE /api/builds/:id - Cancel build job
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const registry = getProviderRegistry();
    const buildProvider = registry.getBuildProvider();

    if (!buildProvider) {
      return NextResponse.json(
        { error: 'Build provider not configured' },
        { status: 503 }
      );
    }

    const success = await buildProvider.cancelBuild(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to cancel build' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel build:', error);
    return NextResponse.json(
      { error: 'Failed to cancel build' },
      { status: 500 }
    );
  }
}
