// AEIMS - Build Services API Routes
// Multi-architecture native build management

import { NextRequest, NextResponse } from 'next/server';
import { getProviderRegistry } from '@/lib/providers';

// GET /api/builds - List build jobs
export async function GET(request: NextRequest) {
  try {
    const registry = getProviderRegistry();
    const buildProvider = registry.getBuildProvider();

    if (!buildProvider) {
      return NextResponse.json(
        { error: 'Build provider not configured' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id') || undefined;
    const status = searchParams.get('status') as any || undefined;

    const jobs = await buildProvider.listJobs(projectId, status);

    return NextResponse.json({
      jobs,
      total: jobs.length,
    });
  } catch (error) {
    console.error('Failed to list build jobs:', error);
    return NextResponse.json(
      { error: 'Failed to list build jobs' },
      { status: 500 }
    );
  }
}

// POST /api/builds - Trigger a new build
export async function POST(request: NextRequest) {
  try {
    const registry = getProviderRegistry();
    const buildProvider = registry.getBuildProvider();

    if (!buildProvider) {
      return NextResponse.json(
        { error: 'Build provider not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { projectId, ...options } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const job = await buildProvider.triggerBuild(projectId, options);

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error('Failed to trigger build:', error);
    return NextResponse.json(
      { error: 'Failed to trigger build' },
      { status: 500 }
    );
  }
}
