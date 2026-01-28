// AEIMS - ADS Build Services Provider
// Native multi-architecture build integration for ARM64/AMD64

import { BaseProvider } from './base';
import type { CloudProvider, ProviderCredentials } from '@/types';

// Build Job Types
export interface BuildJob {
  id: string;
  project: string;
  target: 'arm64' | 'amd64';
  status: 'pending' | 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  host: string;
  buildCmd?: string;
  preBuild?: string;
  postBuild?: string;
  gitRepo?: string;
  gitBranch?: string;
  environment?: Record<string, string>;
  artifacts?: string[];
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  exitCode?: number;
  logs?: string;
  createdAt: Date;
}

export interface BuildHost {
  id: string;
  name: string;
  address: string;
  port: number;
  architecture: 'arm64' | 'amd64';
  status: 'online' | 'offline' | 'busy' | 'maintenance';
  currentJobs: number;
  maxJobs: number;
  labels: string[];
  lastSeenAt?: Date;
}

export interface BuildProject {
  id: string;
  name: string;
  description?: string;
  gitRepo?: string;
  defaultBranch?: string;
  targets: {
    arm64?: BuildTarget;
    amd64?: BuildTarget;
  };
  preBuild?: string;
  postBuild?: string;
  artifacts?: string[];
  environment?: Record<string, string>;
  webhookEnabled: boolean;
  lastBuildAt?: Date;
  createdAt: Date;
}

export interface BuildTarget {
  host: string;
  buildCmd: string;
  environment?: Record<string, string>;
}

export interface BuildDaemonStatus {
  version: string;
  architecture: string;
  hostname: string;
  uptime: number;
  activeJobs: number;
  maxJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
}

export interface IBuildProvider {
  // Host management
  listHosts(): Promise<BuildHost[]>;
  getHost(id: string): Promise<BuildHost | null>;
  getHostStatus(id: string): Promise<BuildDaemonStatus | null>;

  // Project management
  listProjects(): Promise<BuildProject[]>;
  getProject(id: string): Promise<BuildProject | null>;
  createProject(project: Omit<BuildProject, 'id' | 'createdAt'>): Promise<BuildProject>;
  updateProject(id: string, updates: Partial<BuildProject>): Promise<BuildProject>;
  deleteProject(id: string): Promise<boolean>;

  // Build job management
  listJobs(projectId?: string, status?: BuildJob['status']): Promise<BuildJob[]>;
  getJob(id: string): Promise<BuildJob | null>;
  triggerBuild(projectId: string, options?: TriggerBuildOptions): Promise<BuildJob>;
  cancelBuild(id: string): Promise<boolean>;
  getBuildLogs(id: string): Promise<string>;

  // Jenkins integration
  listJenkinsAgents?(): Promise<JenkinsAgent[]>;
  registerJenkinsAgent?(agent: JenkinsAgentConfig): Promise<JenkinsAgent>;
}

export interface TriggerBuildOptions {
  target?: 'arm64' | 'amd64' | 'all';
  gitBranch?: string;
  gitTag?: string;
  gitCommit?: string;
  environment?: Record<string, string>;
  preBuild?: string;
  buildCmd?: string;
  postBuild?: string;
}

export interface JenkinsAgent {
  id: string;
  name: string;
  jenkinsUrl: string;
  status: 'connected' | 'disconnected' | 'error';
  architecture: 'arm64' | 'amd64';
  executors: number;
  activeExecutors: number;
  labels: string[];
  lastSeenAt?: Date;
  registeredAt: Date;
}

export interface JenkinsAgentConfig {
  name: string;
  jenkinsUrl: string;
  secret: string;
  architecture: 'arm64' | 'amd64';
  executors?: number;
  labels?: string[];
}

// ADS Build Provider Implementation
export class ADSBuildProvider extends BaseProvider implements IBuildProvider {
  private apiUrl: string;
  private apiKey: string;

  constructor(credentials: ProviderCredentials, region?: string) {
    super('ADS_BUILD' as CloudProvider, credentials, region);
    this.apiUrl = credentials.credentials.apiUrl || 'https://api.computeapi.io/api/v2';
    this.apiKey = credentials.credentials.apiKey || '';
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetch('/build/health');
      return response.status === 'ok';
    } catch {
      return false;
    }
  }

  // Host management
  async listHosts(): Promise<BuildHost[]> {
    const response = await this.fetch('/build/hosts');
    return response.hosts || [];
  }

  async getHost(id: string): Promise<BuildHost | null> {
    try {
      const response = await this.fetch(`/build/hosts/${id}`);
      return response.host || null;
    } catch {
      return null;
    }
  }

  async getHostStatus(id: string): Promise<BuildDaemonStatus | null> {
    try {
      const response = await this.fetch(`/build/hosts/${id}/status`);
      return response.status || null;
    } catch {
      return null;
    }
  }

  // Project management
  async listProjects(): Promise<BuildProject[]> {
    const response = await this.fetch('/build/projects');
    return response.projects || [];
  }

  async getProject(id: string): Promise<BuildProject | null> {
    try {
      const response = await this.fetch(`/build/projects/${id}`);
      return response.project || null;
    } catch {
      return null;
    }
  }

  async createProject(project: Omit<BuildProject, 'id' | 'createdAt'>): Promise<BuildProject> {
    const response = await this.fetch('/build/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
    return response.project;
  }

  async updateProject(id: string, updates: Partial<BuildProject>): Promise<BuildProject> {
    const response = await this.fetch(`/build/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.project;
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      await this.fetch(`/build/projects/${id}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  }

  // Build job management
  async listJobs(projectId?: string, status?: BuildJob['status']): Promise<BuildJob[]> {
    const params = new URLSearchParams();
    if (projectId) params.set('project_id', projectId);
    if (status) params.set('status', status);

    const query = params.toString();
    const response = await this.fetch(`/build/jobs${query ? `?${query}` : ''}`);
    return response.jobs || [];
  }

  async getJob(id: string): Promise<BuildJob | null> {
    try {
      const response = await this.fetch(`/build/jobs/${id}`);
      return response.job || null;
    } catch {
      return null;
    }
  }

  async triggerBuild(projectId: string, options?: TriggerBuildOptions): Promise<BuildJob> {
    const response = await this.fetch(`/build/projects/${projectId}/trigger`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    return response.job;
  }

  async cancelBuild(id: string): Promise<boolean> {
    try {
      await this.fetch(`/build/jobs/${id}/cancel`, { method: 'POST' });
      return true;
    } catch {
      return false;
    }
  }

  async getBuildLogs(id: string): Promise<string> {
    const response = await this.fetch(`/build/jobs/${id}/logs`);
    return response.logs || '';
  }

  // Jenkins integration
  async listJenkinsAgents(): Promise<JenkinsAgent[]> {
    const response = await this.fetch('/build/jenkins/agents');
    return response.agents || [];
  }

  async registerJenkinsAgent(agent: JenkinsAgentConfig): Promise<JenkinsAgent> {
    const response = await this.fetch('/build/jenkins/agents', {
      method: 'POST',
      body: JSON.stringify(agent),
    });
    return response.agent;
  }

  // Helper method for API calls
  private async fetch(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await globalThis.fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

// Provider factory
export function createADSBuildProvider(credentials: ProviderCredentials): IBuildProvider {
  return new ADSBuildProvider(credentials);
}
