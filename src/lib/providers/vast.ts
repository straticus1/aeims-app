// AEIMS - Vast.ai Provider Implementation
// GPU marketplace for AI workloads

import type { GPUInstance, AIWorkload } from './types';

export interface VastInstance {
  id: number;
  machine_id: number;
  gpu_name: string;
  num_gpus: number;
  gpu_ram: number;
  cpu_cores: number;
  cpu_ram: number;
  disk_space: number;
  dph_total: number; // dollars per hour
  status: string;
  geolocation: string;
  reliability: number;
  inet_up: number;
  inet_down: number;
  dlperf?: number; // deep learning performance score
}

export interface VastSearchParams {
  gpu_name?: string;       // e.g., 'RTX 4090', 'A100'
  num_gpus?: number;
  min_gpu_ram?: number;
  min_cpu_cores?: number;
  min_cpu_ram?: number;
  min_disk?: number;
  max_dph?: number;        // max cost per hour
  geolocation?: string;
  cuda_vers?: string;
  min_reliability?: number;
  order?: 'dph_total' | 'dlperf' | 'reliability';
}

export class VastProvider {
  private apiKey: string;
  private baseUrl = 'https://console.vast.ai/api/v0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Vast API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Search available GPU instances
  async searchInstances(params: VastSearchParams = {}): Promise<VastInstance[]> {
    const query = new URLSearchParams();

    if (params.gpu_name) query.set('gpu_name', params.gpu_name);
    if (params.num_gpus) query.set('num_gpus', params.num_gpus.toString());
    if (params.min_gpu_ram) query.set('gpu_ram', `>=${params.min_gpu_ram}`);
    if (params.max_dph) query.set('dph_total', `<=${params.max_dph}`);
    if (params.order) query.set('order', params.order);

    const data = await this.request(`/bundles?${query.toString()}`);
    return data.offers || [];
  }

  // Get my rented instances
  async listMyInstances(): Promise<GPUInstance[]> {
    const data = await this.request('/instances');

    return (data.instances || []).map((inst: any) => ({
      id: `vast:${inst.id}`,
      provider: 'vast' as const,
      providerId: inst.id.toString(),
      name: inst.label || `vast-${inst.id}`,
      state: this.mapStatus(inst.actual_status),
      gpuType: inst.gpu_name,
      gpuCount: inst.num_gpus,
      gpuMemoryGb: inst.gpu_ram / 1024,
      cpuCount: inst.cpu_cores,
      memoryGb: inst.cpu_ram / 1024,
      storageGb: inst.disk_space,
      region: inst.geolocation || 'unknown',
      pricePerHour: inst.dph_total,
      uptimeHours: inst.duration,
      createdAt: new Date(inst.start_date * 1000),
    }));
  }

  // Rent a new GPU instance
  async rentInstance(offerId: number, options: {
    image?: string;
    disk?: number;
    label?: string;
    onstart?: string;
    env?: Record<string, string>;
  } = {}): Promise<GPUInstance> {
    const data = await this.request('/asks/', {
      method: 'PUT',
      body: JSON.stringify({
        client_id: 'me',
        image: options.image || 'pytorch/pytorch:latest',
        disk: options.disk || 20,
        label: options.label,
        onstart: options.onstart,
        env: options.env,
        id: offerId,
      }),
    });

    return {
      id: `vast:${data.new_contract}`,
      provider: 'vast',
      providerId: data.new_contract.toString(),
      name: options.label || `vast-${data.new_contract}`,
      state: 'pending',
      gpuType: data.gpu_name || 'unknown',
      gpuCount: data.num_gpus || 1,
      gpuMemoryGb: 0,
      cpuCount: 0,
      memoryGb: 0,
      storageGb: options.disk || 20,
      region: 'unknown',
      pricePerHour: data.dph_total || 0,
      createdAt: new Date(),
    };
  }

  // Stop/destroy an instance
  async destroyInstance(instanceId: string): Promise<boolean> {
    const id = instanceId.replace('vast:', '');
    await this.request(`/instances/${id}/`, {
      method: 'DELETE',
    });
    return true;
  }

  // Start a stopped instance
  async startInstance(instanceId: string): Promise<boolean> {
    const id = instanceId.replace('vast:', '');
    await this.request(`/instances/${id}/`, {
      method: 'PUT',
      body: JSON.stringify({ state: 'running' }),
    });
    return true;
  }

  // Stop a running instance (keeps data)
  async stopInstance(instanceId: string): Promise<boolean> {
    const id = instanceId.replace('vast:', '');
    await this.request(`/instances/${id}/`, {
      method: 'PUT',
      body: JSON.stringify({ state: 'stopped' }),
    });
    return true;
  }

  // Get SSH connection info
  async getSSHInfo(instanceId: string): Promise<{ host: string; port: number; username: string }> {
    const id = instanceId.replace('vast:', '');
    const data = await this.request(`/instances/${id}/`);

    return {
      host: data.ssh_host,
      port: data.ssh_port,
      username: 'root',
    };
  }

  // Get instance logs
  async getLogs(instanceId: string, tail: number = 100): Promise<string> {
    const id = instanceId.replace('vast:', '');
    const data = await this.request(`/instances/${id}/logs?tail=${tail}`);
    return data.logs || '';
  }

  // Get account balance
  async getBalance(): Promise<{ balance: number; credit: number }> {
    const data = await this.request('/users/current');
    return {
      balance: data.balance || 0,
      credit: data.credit || 0,
    };
  }

  private mapStatus(status: string): GPUInstance['state'] {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'running';
      case 'exited':
      case 'stopped':
        return 'stopped';
      case 'loading':
      case 'created':
        return 'pending';
      default:
        return 'terminated';
    }
  }
}

// Helper to find best GPU deals
export async function findBestGPUDeals(
  provider: VastProvider,
  requirements: {
    gpuType?: string;
    minGpuRam?: number;
    maxPricePerHour?: number;
    count?: number;
  }
): Promise<VastInstance[]> {
  const results = await provider.searchInstances({
    gpu_name: requirements.gpuType,
    min_gpu_ram: requirements.minGpuRam,
    max_dph: requirements.maxPricePerHour,
    order: 'dph_total',
  });

  return results.slice(0, requirements.count || 10);
}
