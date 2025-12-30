// AEIMS - Cloudflare Provider Implementation
// DNS, R2 Storage, Workers, and more

import type { DnsZone, DnsRecord, DnsRecordType } from '@/types';
import { BaseProvider, type IDnsProvider } from './base';

export interface CloudflareZone {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'initializing' | 'moved' | 'deleted';
  paused: boolean;
  type: 'full' | 'partial';
  name_servers: string[];
  created_on: string;
  modified_on: string;
  activated_on: string;
}

export interface CloudflareRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  priority?: number;
  created_on: string;
  modified_on: string;
}

export interface R2Bucket {
  name: string;
  creation_date: string;
  location: string;
}

export interface R2Object {
  key: string;
  size: number;
  etag: string;
  last_modified: string;
  storage_class: string;
}

export interface WorkerScript {
  id: string;
  tag: string;
  etag: string;
  handlers: string[];
  modified_on: string;
  created_on: string;
  usage_model: 'bundled' | 'unbound';
}

export class CloudflareProvider extends BaseProvider implements IDnsProvider {
  private apiToken: string;
  private accountId?: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(apiToken: string, accountId?: string) {
    super('cloudflare', { id: 'cloudflare', provider: 'cloudflare', name: 'Cloudflare', isActive: true, createdAt: new Date(), updatedAt: new Date(), credentials: {} });
    this.apiToken = apiToken;
    this.accountId = accountId;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/user/tokens/verify');
      return true;
    } catch {
      return false;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!data.success) {
      const errors = data.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
      throw new Error(`Cloudflare API error: ${errors}`);
    }

    return data;
  }

  // ========================================================================
  // DNS Zones
  // ========================================================================

  async listZones(): Promise<DnsZone[]> {
    const data = await this.request('/zones');
    return (data.result || []).map((zone: CloudflareZone) => this.mapZone(zone));
  }

  async getZone(id: string): Promise<DnsZone | null> {
    const zoneId = id.replace('cloudflare:', '');
    const data = await this.request(`/zones/${zoneId}`);
    return data.result ? this.mapZone(data.result) : null;
  }

  async createZone(name: string, jumpStart?: boolean): Promise<DnsZone> {
    const data = await this.request('/zones', {
      method: 'POST',
      body: JSON.stringify({
        name,
        account: { id: this.accountId },
        jump_start: jumpStart ?? true,
        type: 'full',
      }),
    });
    return this.mapZone(data.result);
  }

  async deleteZone(id: string): Promise<boolean> {
    const zoneId = id.replace('cloudflare:', '');
    await this.request(`/zones/${zoneId}`, { method: 'DELETE' });
    return true;
  }

  // ========================================================================
  // DNS Records
  // ========================================================================

  async listRecords(zoneId: string): Promise<DnsRecord[]> {
    const id = zoneId.replace('cloudflare:', '');
    const data = await this.request(`/zones/${id}/dns_records`);
    return (data.result || []).map((record: CloudflareRecord) => this.mapRecord(zoneId, record));
  }

  async createRecord(
    zoneId: string,
    record: Omit<DnsRecord, 'id' | 'zoneId' | 'provider' | 'providerId'>
  ): Promise<DnsRecord> {
    const id = zoneId.replace('cloudflare:', '');
    const data = await this.request(`/zones/${id}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content: record.values[0],
        ttl: record.ttl || 1, // 1 = auto
        proxied: false,
      }),
    });
    return this.mapRecord(zoneId, data.result);
  }

  async updateRecord(
    zoneId: string,
    recordId: string,
    record: Partial<DnsRecord>
  ): Promise<DnsRecord> {
    const zId = zoneId.replace('cloudflare:', '');
    const rId = recordId.replace('cloudflare:', '');

    const data = await this.request(`/zones/${zId}/dns_records/${rId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        content: record.values?.[0],
        ttl: record.ttl,
      }),
    });
    return this.mapRecord(zoneId, data.result);
  }

  async deleteRecord(zoneId: string, recordId: string): Promise<boolean> {
    const zId = zoneId.replace('cloudflare:', '');
    const rId = recordId.replace('cloudflare:', '');

    await this.request(`/zones/${zId}/dns_records/${rId}`, { method: 'DELETE' });
    return true;
  }

  // ========================================================================
  // R2 Storage
  // ========================================================================

  async listR2Buckets(): Promise<R2Bucket[]> {
    if (!this.accountId) throw new Error('Account ID required for R2 operations');
    const data = await this.request(`/accounts/${this.accountId}/r2/buckets`);
    return data.result.buckets || [];
  }

  async createR2Bucket(name: string, locationHint?: string): Promise<R2Bucket> {
    if (!this.accountId) throw new Error('Account ID required for R2 operations');
    const data = await this.request(`/accounts/${this.accountId}/r2/buckets`, {
      method: 'POST',
      body: JSON.stringify({ name, locationHint }),
    });
    return data.result;
  }

  async deleteR2Bucket(name: string): Promise<boolean> {
    if (!this.accountId) throw new Error('Account ID required for R2 operations');
    await this.request(`/accounts/${this.accountId}/r2/buckets/${name}`, { method: 'DELETE' });
    return true;
  }

  // ========================================================================
  // Workers
  // ========================================================================

  async listWorkers(): Promise<WorkerScript[]> {
    if (!this.accountId) throw new Error('Account ID required for Workers operations');
    const data = await this.request(`/accounts/${this.accountId}/workers/scripts`);
    return data.result || [];
  }

  async getWorker(scriptName: string): Promise<WorkerScript | null> {
    if (!this.accountId) throw new Error('Account ID required for Workers operations');
    try {
      const data = await this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}`);
      return data.result;
    } catch {
      return null;
    }
  }

  async deleteWorker(scriptName: string): Promise<boolean> {
    if (!this.accountId) throw new Error('Account ID required for Workers operations');
    await this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}`, { method: 'DELETE' });
    return true;
  }

  // ========================================================================
  // Analytics
  // ========================================================================

  async getZoneAnalytics(zoneId: string, since: Date, until: Date): Promise<any> {
    const id = zoneId.replace('cloudflare:', '');
    const data = await this.request(
      `/zones/${id}/analytics/dashboard?since=${since.toISOString()}&until=${until.toISOString()}`
    );
    return data.result;
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private mapZone(zone: CloudflareZone): DnsZone {
    return {
      id: `cloudflare:${zone.id}`,
      provider: 'cloudflare',
      providerId: zone.id,
      name: zone.name,
      recordCount: 0, // Not provided by list
      isPrivate: false,
      nameServers: zone.name_servers,
      createdAt: new Date(zone.created_on),
    };
  }

  private mapRecord(zoneId: string, record: CloudflareRecord): DnsRecord {
    return {
      id: `cloudflare:${record.id}`,
      zoneId,
      provider: 'cloudflare',
      providerId: record.id,
      name: record.name,
      type: record.type as DnsRecordType,
      ttl: record.ttl,
      values: [record.content],
    };
  }
}

// Cloudflare data centers for location hints
export const CLOUDFLARE_LOCATIONS = [
  { id: 'wnam', name: 'Western North America' },
  { id: 'enam', name: 'Eastern North America' },
  { id: 'weur', name: 'Western Europe' },
  { id: 'eeur', name: 'Eastern Europe' },
  { id: 'apac', name: 'Asia Pacific' },
] as const;
