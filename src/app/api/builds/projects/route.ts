// AEIMS - Build Projects API Routes
// Build project management

import { NextRequest, NextResponse } from 'next/server';
import { getProviderRegistry } from '@/lib/providers';

// GET /api/builds/projects - List all projects
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

    const projects = await buildProvider.listProjects();

    return NextResponse.json({
      projects,
      total: projects.length,
    });
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

// POST /api/builds/projects - Create a new project
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

    if (!body.name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const project = await buildProvider.createProject({
      name: body.name,
      description: body.description,
      gitRepo: body.gitRepo,
      defaultBranch: body.defaultBranch || 'main',
      targets: body.targets || {},
      preBuild: body.preBuild,
      postBuild: body.postBuild,
      artifacts: body.artifacts || [],
      environment: body.environment || {},
      webhookEnabled: body.webhookEnabled || false,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
