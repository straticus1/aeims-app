// AEIMS - Build Hosts API Routes
// Build daemon/host management

import { NextRequest, NextResponse } from 'next/server';
import { getProviderRegistry } from '@/lib/providers';

// GET /api/builds/hosts - List all build hosts
export async function GET() {
  try {
    const registry = getProviderRegistry();
    const buildProvider = registry.getBuildProvider();

    if (!buildProvider) {
      return NextResponse.json(
        { error: 'Build provider not configured' },
        { status: 503 }
      );
    }

    const hosts = await buildProvider.listHosts();

    return NextResponse.json({
      hosts,
      total: hosts.length,
    });
  } catch (error) {
    console.error('Failed to list build hosts:', error);
    return NextResponse.json(
      { error: 'Failed to list build hosts' },
      { status: 500 }
    );
  }
}
