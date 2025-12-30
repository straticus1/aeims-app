// AEIMS - Neon Provider Implementation
// Serverless Postgres database management

export interface NeonProject {
  id: string;
  name: string;
  region_id: string;
  pg_version: number;
  created_at: string;
  updated_at: string;
  store_passwords: boolean;
  active_time_seconds: number;
  cpu_used_sec: number;
  compute_time_seconds: number;
  written_data_bytes: number;
  data_transfer_bytes: number;
}

export interface NeonBranch {
  id: string;
  project_id: string;
  name: string;
  current_state: 'init' | 'ready' | 'deleting';
  created_at: string;
  updated_at: string;
  parent_id?: string;
  parent_lsn?: string;
}

export interface NeonEndpoint {
  id: string;
  project_id: string;
  branch_id: string;
  host: string;
  type: 'read_write' | 'read_only';
  region_id: string;
  current_state: 'init' | 'active' | 'idle' | 'suspended';
  autoscaling_limit_min_cu: number;
  autoscaling_limit_max_cu: number;
  created_at: string;
  updated_at: string;
  pooler_enabled: boolean;
  pooler_mode: 'transaction' | 'session';
}

export interface NeonDatabase {
  id: number;
  branch_id: string;
  name: string;
  owner_name: string;
  created_at: string;
  updated_at: string;
}

export interface NeonConnectionString {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  connectionString: string;
  poolerConnectionString?: string;
}

export class NeonProvider {
  private apiKey: string;
  private baseUrl = 'https://console.neon.tech/api/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Neon API error: ${response.status} - ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // ========================================================================
  // Projects
  // ========================================================================

  async listProjects(): Promise<NeonProject[]> {
    const data = await this.request('/projects');
    return data.projects || [];
  }

  async getProject(projectId: string): Promise<NeonProject> {
    const data = await this.request(`/projects/${projectId}`);
    return data.project;
  }

  async createProject(options: {
    name: string;
    region_id?: string;
    pg_version?: number;
  }): Promise<NeonProject> {
    const data = await this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({
        project: {
          name: options.name,
          region_id: options.region_id || 'aws-us-east-2',
          pg_version: options.pg_version || 16,
        },
      }),
    });
    return data.project;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    await this.request(`/projects/${projectId}`, { method: 'DELETE' });
    return true;
  }

  // ========================================================================
  // Branches
  // ========================================================================

  async listBranches(projectId: string): Promise<NeonBranch[]> {
    const data = await this.request(`/projects/${projectId}/branches`);
    return data.branches || [];
  }

  async getBranch(projectId: string, branchId: string): Promise<NeonBranch> {
    const data = await this.request(`/projects/${projectId}/branches/${branchId}`);
    return data.branch;
  }

  async createBranch(projectId: string, options: {
    name: string;
    parent_id?: string;
  }): Promise<NeonBranch> {
    const data = await this.request(`/projects/${projectId}/branches`, {
      method: 'POST',
      body: JSON.stringify({
        branch: {
          name: options.name,
          parent_id: options.parent_id,
        },
        endpoints: [{ type: 'read_write' }],
      }),
    });
    return data.branch;
  }

  async deleteBranch(projectId: string, branchId: string): Promise<boolean> {
    await this.request(`/projects/${projectId}/branches/${branchId}`, { method: 'DELETE' });
    return true;
  }

  // ========================================================================
  // Endpoints (Compute)
  // ========================================================================

  async listEndpoints(projectId: string): Promise<NeonEndpoint[]> {
    const data = await this.request(`/projects/${projectId}/endpoints`);
    return data.endpoints || [];
  }

  async getEndpoint(projectId: string, endpointId: string): Promise<NeonEndpoint> {
    const data = await this.request(`/projects/${projectId}/endpoints/${endpointId}`);
    return data.endpoint;
  }

  async startEndpoint(projectId: string, endpointId: string): Promise<NeonEndpoint> {
    const data = await this.request(`/projects/${projectId}/endpoints/${endpointId}/start`, {
      method: 'POST',
    });
    return data.endpoint;
  }

  async suspendEndpoint(projectId: string, endpointId: string): Promise<NeonEndpoint> {
    const data = await this.request(`/projects/${projectId}/endpoints/${endpointId}/suspend`, {
      method: 'POST',
    });
    return data.endpoint;
  }

  async updateEndpointScaling(
    projectId: string,
    endpointId: string,
    minCu: number,
    maxCu: number
  ): Promise<NeonEndpoint> {
    const data = await this.request(`/projects/${projectId}/endpoints/${endpointId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        endpoint: {
          autoscaling_limit_min_cu: minCu,
          autoscaling_limit_max_cu: maxCu,
        },
      }),
    });
    return data.endpoint;
  }

  // ========================================================================
  // Databases
  // ========================================================================

  async listDatabases(projectId: string, branchId: string): Promise<NeonDatabase[]> {
    const data = await this.request(`/projects/${projectId}/branches/${branchId}/databases`);
    return data.databases || [];
  }

  async createDatabase(
    projectId: string,
    branchId: string,
    options: { name: string; owner_name: string }
  ): Promise<NeonDatabase> {
    const data = await this.request(`/projects/${projectId}/branches/${branchId}/databases`, {
      method: 'POST',
      body: JSON.stringify({ database: options }),
    });
    return data.database;
  }

  async deleteDatabase(projectId: string, branchId: string, databaseName: string): Promise<boolean> {
    await this.request(`/projects/${projectId}/branches/${branchId}/databases/${databaseName}`, {
      method: 'DELETE',
    });
    return true;
  }

  // ========================================================================
  // Connection Strings
  // ========================================================================

  async getConnectionString(
    projectId: string,
    branchId?: string,
    database?: string,
    role?: string,
    pooled?: boolean
  ): Promise<NeonConnectionString> {
    const params = new URLSearchParams();
    if (branchId) params.set('branch_id', branchId);
    if (database) params.set('database_name', database);
    if (role) params.set('role_name', role);
    if (pooled) params.set('pooled', 'true');

    const data = await this.request(`/projects/${projectId}/connection_uri?${params.toString()}`);
    const uri = new URL(data.uri);

    return {
      host: uri.hostname,
      port: parseInt(uri.port) || 5432,
      database: uri.pathname.slice(1),
      user: uri.username,
      password: uri.password,
      connectionString: data.uri,
      poolerConnectionString: pooled ? data.uri : undefined,
    };
  }

  // ========================================================================
  // Usage & Billing
  // ========================================================================

  async getProjectUsage(projectId: string): Promise<{
    active_time_seconds: number;
    compute_time_seconds: number;
    written_data_bytes: number;
    data_transfer_bytes: number;
  }> {
    const project = await this.getProject(projectId);
    return {
      active_time_seconds: project.active_time_seconds,
      compute_time_seconds: project.compute_time_seconds,
      written_data_bytes: project.written_data_bytes,
      data_transfer_bytes: project.data_transfer_bytes,
    };
  }
}

// Available Neon regions
export const NEON_REGIONS = [
  { id: 'aws-us-east-2', name: 'US East (Ohio)', provider: 'AWS' },
  { id: 'aws-us-west-2', name: 'US West (Oregon)', provider: 'AWS' },
  { id: 'aws-eu-central-1', name: 'Europe (Frankfurt)', provider: 'AWS' },
  { id: 'aws-ap-southeast-1', name: 'Asia Pacific (Singapore)', provider: 'AWS' },
  { id: 'aws-ap-southeast-2', name: 'Asia Pacific (Sydney)', provider: 'AWS' },
] as const;
