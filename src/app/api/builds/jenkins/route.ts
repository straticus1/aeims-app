// AEIMS - Jenkins Integration API Routes
// Jenkins agent management for native builds

import { NextRequest, NextResponse } from 'next/server';
import { getProviderRegistry } from '@/lib/providers';

// GET /api/builds/jenkins - List Jenkins agents
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

    if (!buildProvider.listJenkinsAgents) {
      return NextResponse.json(
        { error: 'Jenkins integration not available' },
        { status: 501 }
      );
    }

    const agents = await buildProvider.listJenkinsAgents();

    return NextResponse.json({
      agents,
      total: agents.length,
    });
  } catch (error) {
    console.error('Failed to list Jenkins agents:', error);
    return NextResponse.json(
      { error: 'Failed to list Jenkins agents' },
      { status: 500 }
    );
  }
}

// POST /api/builds/jenkins - Register a new Jenkins agent
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

    if (!buildProvider.registerJenkinsAgent) {
      return NextResponse.json(
        { error: 'Jenkins integration not available' },
        { status: 501 }
      );
    }

    const body = await request.json();

    if (!body.name || !body.jenkinsUrl || !body.secret) {
      return NextResponse.json(
        { error: 'name, jenkinsUrl, and secret are required' },
        { status: 400 }
      );
    }

    const agent = await buildProvider.registerJenkinsAgent({
      name: body.name,
      jenkinsUrl: body.jenkinsUrl,
      secret: body.secret,
      architecture: body.architecture || 'amd64',
      executors: body.executors || 1,
      labels: body.labels || [],
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('Failed to register Jenkins agent:', error);
    return NextResponse.json(
      { error: 'Failed to register Jenkins agent' },
      { status: 500 }
    );
  }
}
