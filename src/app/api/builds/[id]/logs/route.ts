// AEIMS - Build Logs API
// Stream or fetch build logs

import { NextRequest, NextResponse } from 'next/server';
import { getProviderRegistry } from '@/lib/providers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/builds/:id/logs - Get build logs
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

    const logs = await buildProvider.getBuildLogs(id);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to get build logs:', error);
    return NextResponse.json(
      { error: 'Failed to get build logs' },
      { status: 500 }
    );
  }
}
